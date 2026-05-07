import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot, Send, Plus, Trash2, MessageSquare, Sparkles,
  User, Loader2, ChevronRight, Zap,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { AiConversation, AiMessage } from "@shared/schema";

function MarkdownRenderer({ content }: { content: string }) {
  const html = content
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-4 mb-1 text-primary">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-black mt-5 mb-2 text-primary">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-black mt-6 mb-2 text-primary">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic">$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-primary">$1</code>')
    .replace(/^```[\w]*\n([\s\S]*?)```$/gm, '<pre class="bg-muted/80 rounded-xl p-4 my-3 overflow-x-auto text-xs font-mono border border-border/50 leading-relaxed">$1</pre>')
    .replace(/^- (.+)$/gm, '<li class="flex gap-2 items-start"><span class="text-primary mt-1 shrink-0">▸</span><span>$1</span></li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="flex gap-2 items-start"><span class="text-primary font-bold shrink-0">$1.</span><span>$2</span></li>')
    .replace(/(<li[\s\S]+?<\/li>\n?)+/g, '<ul class="space-y-1.5 my-3">$&</ul>')
    .replace(/\n\n/g, '</p><p class="mt-3">')
    .replace(/\n/g, "<br/>");
  return (
    <div
      className="prose-sm text-sm leading-relaxed text-foreground/90"
      dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
    />
  );
}

export default function AurenAI() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!user?.isAdmin) setLocation("/");
  }, [user]);

  const { data: conversations = [] } = useQuery<AiConversation[]>({
    queryKey: ["/api/ai/conversations"],
    enabled: !!user?.isAdmin,
    refetchInterval: false,
  });

  const { data: fetchedMessages = [] } = useQuery<AiMessage[]>({
    queryKey: ["/api/ai/conversations", activeConvId, "messages"],
    enabled: !!activeConvId,
    queryFn: () => fetch(`/api/ai/conversations/${activeConvId}/messages`).then(r => r.json()),
  });

  useEffect(() => {
    if (!isStreaming) setMessages(fetchedMessages);
  }, [fetchedMessages, isStreaming]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const createConv = useMutation({
    mutationFn: () => apiRequest("POST", "/api/ai/conversations", { title: "Yeni Sohbet" }),
    onSuccess: async (res) => {
      const conv = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
      setActiveConvId(conv.id);
      setMessages([]);
    },
  });

  const deleteConv = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/ai/conversations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
      setActiveConvId(null);
      setMessages([]);
    },
  });

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !activeConvId || isStreaming) return;

    const userMsg: AiMessage = {
      id: Date.now(),
      conversationId: activeConvId,
      role: "user",
      content: input.trim(),
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    abortRef.current = new AbortController();
    let accumulated = "";

    try {
      const res = await fetch(`/api/ai/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userMsg.content }),
        signal: abortRef.current.signal,
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const ev = JSON.parse(line.slice(6));
            if (ev.content) {
              accumulated += ev.content;
              setStreamingContent(accumulated);
            }
            if (ev.done) {
              const assistantMsg: AiMessage = {
                id: Date.now() + 1,
                conversationId: activeConvId,
                role: "assistant",
                content: accumulated,
                createdAt: new Date(),
              };
              setMessages(prev => [...prev, assistantMsg]);
              setStreamingContent("");
              queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
              queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations", activeConvId, "messages"] });
            }
          } catch { /* skip */ }
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setMessages(prev => [...prev, {
          id: Date.now() + 2, conversationId: activeConvId, role: "assistant",
          content: "Bir hata oluştu. Lütfen tekrar dene.", createdAt: new Date(),
        }]);
      }
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  }, [input, activeConvId, isStreaming, queryClient]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const QUICK_PROMPTS = [
    { label: "Lig analizi yap", icon: "⚽" },
    { label: "Maç tahmini ver", icon: "🔮" },
    { label: "İstatistik yorumla", icon: "📊" },
    { label: "Takım karşılaştır", icon: "⚖️" },
  ];

  if (!user?.isAdmin) return null;

  return (
    <div className="h-[calc(100vh-128px)] md:h-[calc(100vh-64px)] flex gap-0 overflow-hidden rounded-2xl border border-border/50 shadow-2xl bg-card">

      {/* Sidebar */}
      <div className="w-64 shrink-0 border-r border-border/50 flex flex-col bg-card/50 hidden md:flex">
        <div className="p-4 border-b border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="font-black text-sm text-primary tracking-wide">AUREN AI</span>
          </div>
          <Button
            onClick={() => createConv.mutate()}
            disabled={createConv.isPending}
            className="w-full gap-2 h-9 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
          >
            <Plus className="w-3.5 h-3.5" />
            Yeni Sohbet
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.length === 0 && (
              <div className="text-center py-8 text-xs text-muted-foreground">
                Henüz sohbet yok
              </div>
            )}
            {conversations.map(conv => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                  activeConvId === conv.id
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveConvId(conv.id)}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs font-medium truncate flex-1">{conv.title}</span>
                <button
                  onClick={e => { e.stopPropagation(); deleteConv.mutate(conv.id); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:text-destructive rounded"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border/30">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">gpt-5.4 aktif</span>
          </div>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="px-6 py-4 border-b border-border/30 bg-card flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-card animate-pulse" />
          </div>
          <div>
            <h1 className="font-black text-lg text-gradient">Auren AI</h1>
            <p className="text-xs text-muted-foreground">Admin asistanın — Her şeyi yapar</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-primary" />
              <span className="text-xs font-bold text-primary">Ultra Mod</span>
            </div>
          </div>
        </div>

        {/* Messages area */}
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">

            {/* Welcome screen */}
            {!activeConvId && (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-2xl shadow-primary/40">
                    <Sparkles className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-yellow-500 flex items-center justify-center shadow-lg animate-bounce">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black text-gradient">Auren AI'ya Hoş Geldin</h2>
                  <p className="text-muted-foreground max-w-sm text-sm">
                    Lig yönetimi, istatistik analizi, futbol taktikleri — her konuda yanındayım.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                  {QUICK_PROMPTS.map(p => (
                    <button
                      key={p.label}
                      onClick={async () => {
                        const res = await apiRequest("POST", "/api/ai/conversations", { title: p.label });
                        const conv = await res.json();
                        queryClient.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
                        setActiveConvId(conv.id);
                        setMessages([]);
                        setTimeout(() => setInput(p.label), 100);
                      }}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                    >
                      <span className="text-lg">{p.icon}</span>
                      <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground">{p.label}</span>
                      <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground/50 group-hover:text-primary transition-colors" />
                    </button>
                  ))}
                </div>
                <Button onClick={() => createConv.mutate()} className="gap-2 rounded-xl shadow-lg shadow-primary/25">
                  <Plus className="w-4 h-4" /> Sohbet Başlat
                </Button>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, idx) => (
              <div key={msg.id ?? idx} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-md ${
                  msg.role === "user"
                    ? "bg-primary/20 border border-primary/30"
                    : "bg-gradient-to-br from-primary to-purple-600"
                }`}>
                  {msg.role === "user"
                    ? <User className="w-4 h-4 text-primary" />
                    : <Bot className="w-4 h-4 text-white" />}
                </div>
                <div className={`max-w-[78%] rounded-2xl px-4 py-3 shadow-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-muted/60 border border-border/40 rounded-tl-sm"
                }`}>
                  {msg.role === "user"
                    ? <p className="text-sm leading-relaxed">{msg.content}</p>
                    : <MarkdownRenderer content={msg.content} />}
                </div>
              </div>
            ))}

            {/* Streaming bubble */}
            {isStreaming && (
              <div className="flex gap-3 flex-row">
                <div className="w-8 h-8 rounded-xl shrink-0 flex items-center justify-center shadow-md bg-gradient-to-br from-primary to-purple-600">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="max-w-[78%] rounded-2xl rounded-tl-sm px-4 py-3 bg-muted/60 border border-border/40 shadow-sm">
                  {streamingContent
                    ? <MarkdownRenderer content={streamingContent} />
                    : <div className="flex gap-1.5 items-center py-1">
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                        <div className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                      </div>
                  }
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        {activeConvId && (
          <div className="p-4 border-t border-border/30 bg-card">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Auren AI'ya bir şey sor… (Enter gönderir, Shift+Enter yeni satır)"
                  disabled={isStreaming}
                  rows={1}
                  className="resize-none rounded-xl border-border/50 focus:border-primary/50 bg-muted/30 pr-12 text-sm min-h-[44px] max-h-[140px] py-3 placeholder:text-muted-foreground/50"
                  style={{ overflow: "hidden" }}
                  onInput={e => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = "auto";
                    t.style.height = Math.min(t.scrollHeight, 140) + "px";
                  }}
                />
              </div>
              <Button
                onClick={sendMessage}
                disabled={!input.trim() || isStreaming}
                size="icon"
                className="h-11 w-11 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 shrink-0"
              >
                {isStreaming
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/40 mt-2 text-center">
              Auren AI hata yapabilir. Kritik kararlar için doğrulayın.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
