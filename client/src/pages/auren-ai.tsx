import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot, Send, Plus, Trash2, MessageSquare, Sparkles, User,
  Loader2, Zap, ChevronRight, Menu, X, Wrench, CheckCircle2,
  AlertCircle, Database, Users, Trophy, Calendar,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { AiConversation, AiMessage } from "@shared/schema";

// ── Markdown renderer ─────────────────────────────────────────────────────────
function MD({ text }: { text: string }) {
  const html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold mt-3 mb-1 text-primary">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-black mt-4 mb-1.5 text-primary">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-black mt-5 mb-2 text-primary">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic text-muted-foreground">$1</em>')
    .replace(/`([^`\n]+)`/g, '<code class="bg-muted/80 px-1.5 py-0.5 rounded text-xs font-mono text-primary border border-border/30">$1</code>')
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre class="bg-muted/80 rounded-xl p-3 my-2 overflow-x-auto text-xs font-mono border border-border/40 leading-relaxed whitespace-pre-wrap">$1</pre>')
    .replace(/^- (.+)$/gm, '<li class="flex gap-2 items-start my-0.5"><span class="text-primary shrink-0 mt-0.5">▸</span><span>$1</span></li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="flex gap-2 items-start my-0.5"><span class="text-primary font-bold shrink-0">$1.</span><span>$2</span></li>')
    .replace(/(<li[\s\S]*?<\/li>\n?)+/g, '<ul class="space-y-0.5 my-2 ml-1">$&</ul>')
    .replace(/\n\n/g, '</p><p class="mt-2">')
    .replace(/\n/g, "<br/>");
  return (
    <div
      className="text-sm leading-relaxed text-foreground/90 [&_ul]:list-none [&_pre]:text-xs"
      dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
    />
  );
}

// ── Tool call names → Turkish labels ──────────────────────────────────────────
const TOOL_LABELS: Record<string, { label: string; icon: any; color: string }> = {
  get_teams:           { label: "Takımlar okunuyor",       icon: Trophy,   color: "text-yellow-500" },
  create_team:         { label: "Takım oluşturuluyor",     icon: Trophy,   color: "text-green-500" },
  update_team:         { label: "Takım güncelleniyor",     icon: Trophy,   color: "text-blue-500" },
  delete_team:         { label: "Takım siliniyor",         icon: Trophy,   color: "text-red-500" },
  get_players:         { label: "Oyuncular okunuyor",      icon: Users,    color: "text-yellow-500" },
  create_player:       { label: "Oyuncu oluşturuluyor",    icon: Users,    color: "text-green-500" },
  update_player:       { label: "Oyuncu güncelleniyor",    icon: Users,    color: "text-blue-500" },
  delete_player:       { label: "Oyuncu siliniyor",        icon: Users,    color: "text-red-500" },
  get_matches:         { label: "Maçlar okunuyor",         icon: Calendar, color: "text-yellow-500" },
  create_match:        { label: "Maç oluşturuluyor",       icon: Calendar, color: "text-green-500" },
  update_match_score:  { label: "Skor güncelleniyor",      icon: Calendar, color: "text-blue-500" },
  delete_match:        { label: "Maç siliniyor",           icon: Calendar, color: "text-red-500" },
  get_chat_messages:   { label: "Sohbet okunuyor",         icon: MessageSquare, color: "text-yellow-500" },
  delete_chat_message: { label: "Mesaj siliniyor",         icon: MessageSquare, color: "text-red-500" },
  ban_user:            { label: "Kullanıcı banlanıyor",    icon: Database, color: "text-red-500" },
};

// ── SSE event types ───────────────────────────────────────────────────────────
type SSEEvent =
  | { type: "tool_call"; tool: string; args: any }
  | { type: "tool_result"; tool: string; ok: boolean; error?: string }
  | { type: "content"; content: string }
  | { type: "done" }
  | { type: "error"; error: string };

// ── Message shapes stored locally ─────────────────────────────────────────────
type ChatMsg =
  | { kind: "user"; content: string; id: number }
  | { kind: "assistant"; content: string; id: number }
  | { kind: "tool_call"; tool: string; ok?: boolean; id: number };

const QUICK = [
  { label: "Tüm takımları listele", icon: "🏆" },
  { label: "Tüm oyuncu istatistiklerini göster", icon: "👤" },
  { label: "Puan durumunu analiz et", icon: "📊" },
  { label: "Maç oluşturma konusunda yardım et", icon: "⚽" },
];

export default function AurenAI() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const [convId, setConvId] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const idRef = useRef(0);

  useEffect(() => { if (!user?.isAdmin) setLocation("/"); }, [user]);

  const { data: convs = [] } = useQuery<AiConversation[]>({
    queryKey: ["/api/ai/conversations"],
    enabled: !!user?.isAdmin,
    refetchInterval: false,
  });

  const { data: fetchedMsgs = [] } = useQuery<AiMessage[]>({
    queryKey: ["/api/ai/conversations", convId, "messages"],
    enabled: !!convId,
    queryFn: () => fetch(`/api/ai/conversations/${convId}/messages`).then(r => r.json()),
  });

  // Sync DB messages → local when not streaming
  useEffect(() => {
    if (streaming) return;
    setMsgs(
      fetchedMsgs.map(m => ({
        kind: m.role as "user" | "assistant",
        content: m.content,
        id: m.id,
      }))
    );
  }, [fetchedMsgs, streaming]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const newId = () => ++idRef.current;

  const createConv = useMutation({
    mutationFn: (title?: string) => apiRequest("POST", "/api/ai/conversations", { title: title || "Yeni Sohbet" }),
    onSuccess: async res => {
      const c = await res.json();
      qc.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
      setConvId(c.id);
      setMsgs([]);
      setSidebarOpen(false);
    },
  });

  const deleteConv = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/ai/conversations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
      setConvId(null);
      setMsgs([]);
    },
  });

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || !convId || streaming) return;

    setInput("");
    if (textareaRef.current) { textareaRef.current.style.height = "44px"; }

    const userMsgId = newId();
    setMsgs(p => [...p, { kind: "user", content, id: userMsgId }]);
    setStreaming(true);

    let accumulated = "";
    let assistantId = newId();
    let assistantAdded = false;

    try {
      const res = await fetch(`/api/ai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) throw new Error("İstek başarısız");

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let ev: SSEEvent;
          try { ev = JSON.parse(line.slice(6)); } catch { continue; }

          if (ev.type === "tool_call") {
            const tid = newId();
            setMsgs(p => [...p, { kind: "tool_call", tool: ev.tool, id: tid }]);
          } else if (ev.type === "tool_result") {
            setMsgs(p => p.map(m =>
              m.kind === "tool_call" && m.tool === ev.tool && m.ok === undefined
                ? { ...m, ok: ev.ok }
                : m
            ));
          } else if (ev.type === "content") {
            accumulated += ev.content;
            if (!assistantAdded) {
              assistantAdded = true;
              setMsgs(p => [...p, { kind: "assistant", content: accumulated, id: assistantId }]);
            } else {
              setMsgs(p => p.map(m => m.id === assistantId ? { ...m, content: accumulated } : m));
            }
          } else if (ev.type === "done") {
            qc.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
            qc.invalidateQueries({ queryKey: ["/api/ai/conversations", convId, "messages"] });
          } else if (ev.type === "error") {
            setMsgs(p => [...p, { kind: "assistant", content: `❌ ${ev.error}`, id: newId() }]);
          }
        }
      }
    } catch (e: any) {
      setMsgs(p => [...p, { kind: "assistant", content: "❌ Bağlantı hatası oluştu.", id: newId() }]);
    } finally {
      setStreaming(false);
    }
  }, [input, convId, streaming, qc]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const selectConv = (id: number) => {
    setConvId(id);
    setMsgs([]);
    setSidebarOpen(false);
  };

  if (!user?.isAdmin) return null;

  // ── Sidebar content (shared between mobile & desktop) ──────────────────────
  const SidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/15">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <span className="font-black text-sm text-primary tracking-wide">SOHBETLER</span>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* New chat button */}
      <div className="p-3 border-b border-border/30">
        <Button
          onClick={() => createConv.mutate()}
          disabled={createConv.isPending}
          className="w-full gap-2 h-10 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Yeni Sohbet
        </Button>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {convs.length === 0 && (
            <div className="text-center py-10 text-xs text-muted-foreground px-4">
              Henüz sohbet yok. Aşağıdan başlat.
            </div>
          )}
          {convs.map(c => (
            <div
              key={c.id}
              onClick={() => selectConv(c.id)}
              className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                convId === c.id
                  ? "bg-primary/15 text-primary border border-primary/25"
                  : "hover:bg-muted/70 text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs font-medium truncate flex-1 leading-snug">{c.title}</span>
              <button
                onClick={e => { e.stopPropagation(); deleteConv.mutate(c.id); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:text-destructive shrink-0"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Status bar */}
      <div className="p-3 border-t border-border/30">
        <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-primary/5 border border-primary/10">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          <div>
            <p className="text-[10px] font-black text-primary uppercase tracking-wider">GPT-5.4 Aktif</p>
            <p className="text-[9px] text-muted-foreground">Tool calling etkin</p>
          </div>
          <Wrench className="w-3 h-3 text-primary/50 ml-auto" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-112px)] md:h-[calc(100vh-64px)] overflow-hidden rounded-2xl border border-border/50 shadow-2xl bg-card relative">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-60 lg:w-64 shrink-0 flex-col border-r border-border/50 bg-card/60">
        {SidebarContent}
      </aside>

      {/* ── Mobile Sidebar overlay ── */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 w-72 z-50 bg-card border-r border-border/50 flex flex-col md:hidden shadow-2xl">
            {SidebarContent}
          </div>
        </>
      )}

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-card shrink-0">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-xl hover:bg-muted text-muted-foreground shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-card animate-pulse" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-black text-base text-gradient leading-tight">Auren AI</h1>
            <p className="text-[10px] text-muted-foreground truncate">
              {convId
                ? convs.find(c => c.id === convId)?.title ?? "Sohbet"
                : "Yeni sohbet başlatmak için + butonuna bas"}
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 shrink-0">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-[10px] font-bold text-primary">Ultra Mod</span>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="p-3 sm:p-5 space-y-4 min-h-full">

            {/* Welcome screen */}
            {!convId && (
              <div className="flex flex-col items-center justify-center min-h-[55vh] text-center space-y-5 py-4">
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-2xl shadow-primary/40">
                    <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-xl bg-yellow-500 flex items-center justify-center shadow-lg animate-bounce">
                    <Zap className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <div className="space-y-1.5 px-2">
                  <h2 className="text-2xl sm:text-3xl font-black text-gradient">Auren AI'ya Hoş Geldin</h2>
                  <p className="text-muted-foreground text-sm max-w-xs">
                    Takım ekle, istatistik güncelle, maç oluştur — her şeyi söyle, ben yaparım.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xs sm:max-w-sm px-2">
                  {QUICK.map(q => (
                    <button
                      key={q.label}
                      onClick={async () => {
                        const res = await apiRequest("POST", "/api/ai/conversations", { title: q.label });
                        const c = await res.json();
                        qc.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
                        setConvId(c.id);
                        setMsgs([]);
                        setTimeout(() => sendMessage(q.label), 200);
                      }}
                      className="flex items-center gap-2.5 px-3 py-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group active:scale-95"
                    >
                      <span className="text-lg shrink-0">{q.icon}</span>
                      <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground leading-snug">{q.label}</span>
                      <ChevronRight className="w-3 h-3 ml-auto text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
                <Button onClick={() => createConv.mutate()} className="gap-2 rounded-xl h-10 px-5 shadow-lg shadow-primary/20">
                  <Plus className="w-4 h-4" /> Sohbet Başlat
                </Button>
              </div>
            )}

            {/* Message list */}
            {msgs.map((msg) => {
              if (msg.kind === "tool_call") {
                const info = TOOL_LABELS[msg.tool] ?? { label: msg.tool, icon: Wrench, color: "text-muted-foreground" };
                const Icon = info.icon;
                return (
                  <div key={msg.id} className="flex items-center gap-2.5 py-1 px-3 text-xs text-muted-foreground">
                    <div className="h-px flex-1 bg-border/30" />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Icon className={`w-3.5 h-3.5 ${info.color}`} />
                      <span className="font-medium">{info.label}</span>
                      {msg.ok === undefined && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
                      {msg.ok === true && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                      {msg.ok === false && <AlertCircle className="w-3 h-3 text-red-500" />}
                    </div>
                    <div className="h-px flex-1 bg-border/30" />
                  </div>
                );
              }

              const isUser = msg.kind === "user";
              return (
                <div key={msg.id} className={`flex gap-2.5 sm:gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl shrink-0 flex items-center justify-center shadow-sm ${
                    isUser
                      ? "bg-primary/15 border border-primary/25"
                      : "bg-gradient-to-br from-primary to-purple-600"
                  }`}>
                    {isUser
                      ? <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                      : <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />}
                  </div>
                  <div className={`max-w-[82%] sm:max-w-[78%] rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-sm ${
                    isUser
                      ? "bg-primary text-primary-foreground rounded-tr-sm"
                      : "bg-muted/60 border border-border/40 rounded-tl-sm"
                  }`}>
                    {isUser
                      ? <p className="text-sm leading-relaxed">{msg.content}</p>
                      : <MD text={msg.content} />}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {streaming && !msgs.some(m => m.kind === "assistant" && msgs.indexOf(m) === msgs.length - 1) && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-sm shrink-0">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted/60 border border-border/40">
                  <div className="flex gap-1.5 items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Input area */}
        {convId && (
          <div className="p-3 sm:p-4 border-t border-border/30 bg-card shrink-0">
            <div className="flex gap-2 sm:gap-3 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Bir şey sor veya komut ver…"
                  disabled={streaming}
                  rows={1}
                  className="resize-none rounded-xl border-border/50 focus:border-primary/50 bg-muted/30 text-sm min-h-[44px] max-h-[120px] py-3 px-4 placeholder:text-muted-foreground/50 leading-snug"
                  onInput={e => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = "auto";
                    t.style.height = Math.min(t.scrollHeight, 120) + "px";
                  }}
                />
              </div>
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || streaming}
                size="icon"
                className="h-11 w-11 sm:h-11 sm:w-11 rounded-xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 shrink-0"
              >
                {streaming
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground/40 mt-1.5 text-center">
              Enter → gönder &nbsp;·&nbsp; Shift+Enter → yeni satır &nbsp;·&nbsp; AI hata yapabilir, kritik işlemleri doğrula
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
