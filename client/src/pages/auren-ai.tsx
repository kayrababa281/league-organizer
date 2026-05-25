import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Bot, Send, Plus, Trash2, MessageSquare, Sparkles, User,
  Loader2, Zap, ChevronRight, Menu, X, Wrench, CheckCircle2,
  AlertCircle, Database, Users, Trophy, Calendar, Copy,
  Edit3, Check, RefreshCw, BarChart3, Shield, Flame,
  Globe, Target, Swords, Star,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { AiConversation, AiMessage } from "@shared/schema";

// ── Markdown renderer ─────────────────────────────────────────────────────────
function MD({ text }: { text: string }) {
  const html = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold mt-4 mb-1.5 text-primary">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-black mt-5 mb-2 text-primary border-b border-primary/20 pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-black mt-5 mb-2 text-primary">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-foreground">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="italic text-muted-foreground">$1</em>')
    .replace(/`([^`\n]+)`/g, '<code class="bg-primary/10 px-1.5 py-0.5 rounded-md text-xs font-mono text-primary border border-primary/20">$1</code>')
    .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre class="bg-muted/80 rounded-xl p-3.5 my-3 overflow-x-auto text-xs font-mono border border-border/40 leading-relaxed whitespace-pre-wrap shadow-inner">$1</pre>')
    .replace(/^- (.+)$/gm, '<li class="flex gap-2 items-start my-1"><span class="text-primary shrink-0 mt-1 text-[8px]">◆</span><span>$1</span></li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li class="flex gap-2.5 items-start my-1"><span class="bg-primary/15 text-primary font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5">$1</span><span>$2</span></li>')
    .replace(/(<li[\s\S]*?<\/li>\n?)+/g, '<ul class="space-y-1 my-2 ml-0.5">$&</ul>')
    .replace(/\n\n/g, '</p><p class="mt-2.5">')
    .replace(/\n/g, "<br/>");
  return (
    <div
      className="text-sm leading-relaxed text-foreground/90 [&_ul]:list-none"
      dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }}
    />
  );
}

// ── Tool call info ─────────────────────────────────────────────────────────────
const TOOL_LABELS: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  get_teams:           { label: "Takımlar okunuyor",        icon: Trophy,       color: "text-yellow-500",  bg: "bg-yellow-500/10 border-yellow-500/20" },
  create_team:         { label: "Takım oluşturuluyor",      icon: Trophy,       color: "text-green-500",   bg: "bg-green-500/10 border-green-500/20" },
  update_team:         { label: "Takım güncelleniyor",      icon: Trophy,       color: "text-blue-500",    bg: "bg-blue-500/10 border-blue-500/20" },
  delete_team:         { label: "Takım siliniyor",          icon: Trophy,       color: "text-red-500",     bg: "bg-red-500/10 border-red-500/20" },
  get_players:         { label: "Oyuncular okunuyor",       icon: Users,        color: "text-cyan-500",    bg: "bg-cyan-500/10 border-cyan-500/20" },
  create_player:       { label: "Oyuncu oluşturuluyor",     icon: Users,        color: "text-green-500",   bg: "bg-green-500/10 border-green-500/20" },
  update_player:       { label: "Oyuncu güncelleniyor",     icon: Users,        color: "text-blue-500",    bg: "bg-blue-500/10 border-blue-500/20" },
  delete_player:       { label: "Oyuncu siliniyor",         icon: Users,        color: "text-red-500",     bg: "bg-red-500/10 border-red-500/20" },
  get_matches:         { label: "Maçlar okunuyor",          icon: Calendar,     color: "text-purple-500",  bg: "bg-purple-500/10 border-purple-500/20" },
  create_match:        { label: "Maç oluşturuluyor",        icon: Calendar,     color: "text-green-500",   bg: "bg-green-500/10 border-green-500/20" },
  update_match_score:  { label: "Skor güncelleniyor",       icon: Target,       color: "text-blue-500",    bg: "bg-blue-500/10 border-blue-500/20" },
  delete_match:        { label: "Maç siliniyor",            icon: Calendar,     color: "text-red-500",     bg: "bg-red-500/10 border-red-500/20" },
  get_chat_messages:   { label: "Sohbet okunuyor",          icon: MessageSquare, color: "text-indigo-500", bg: "bg-indigo-500/10 border-indigo-500/20" },
  delete_chat_message: { label: "Mesaj siliniyor",          icon: MessageSquare, color: "text-red-500",    bg: "bg-red-500/10 border-red-500/20" },
  ban_user:            { label: "Kullanıcı banlanıyor",     icon: Shield,       color: "text-red-500",     bg: "bg-red-500/10 border-red-500/20" },
  find_team_logo:      { label: "Logo internette aranıyor", icon: Globe,        color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/20" },
};

// ── SSE + message types ────────────────────────────────────────────────────────
type SSEEvent =
  | { type: "tool_call"; tool: string; args: any }
  | { type: "tool_result"; tool: string; ok: boolean; error?: string }
  | { type: "content"; content: string }
  | { type: "done" }
  | { type: "error"; error: string };

type ChatMsg =
  | { kind: "user"; content: string; id: number }
  | { kind: "assistant"; content: string; id: number }
  | { kind: "tool_call"; tool: string; ok?: boolean; id: number };

// ── Quick prompts ──────────────────────────────────────────────────────────────
const QUICK_GROUPS = [
  {
    label: "Veri",
    prompts: [
      { label: "Tüm takımları listele ve puan durumunu analiz et", icon: BarChart3, color: "text-yellow-500" },
      { label: "Tüm oyuncu istatistiklerini detaylı göster", icon: Users, color: "text-blue-500" },
    ]
  },
  {
    label: "Yönetim",
    prompts: [
      { label: "Bu haftanın maçlarını listele", icon: Calendar, color: "text-green-500" },
      { label: "Gol krallığı sıralamasını göster", icon: Flame, color: "text-orange-500" },
    ]
  },
  {
    label: "Logo",
    prompts: [
      { label: "Tüm takımların logolarını internetten bul ve güncelle", icon: Globe, color: "text-purple-500" },
      { label: "Lig istatistiklerini özetle ve en iyi performansları listele", icon: Star, color: "text-yellow-400" },
    ]
  },
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
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [copiedId, setCopiedId] = useState<number | null>(null);
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

  useEffect(() => {
    if (streaming) return;
    setMsgs(fetchedMsgs.map(m => ({ kind: m.role as "user" | "assistant", content: m.content, id: m.id })));
  }, [fetchedMsgs, streaming]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const newId = () => ++idRef.current;

  const createConv = async (title?: string) => {
    const res = await apiRequest("POST", "/api/ai/conversations", { title: title || "Yeni Sohbet" });
    const c = await res.json();
    qc.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
    setConvId(c.id);
    setMsgs([]);
    setSidebarOpen(false);
    return c;
  };

  const deleteConv = async (id: number) => {
    await apiRequest("DELETE", `/api/ai/conversations/${id}`);
    qc.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
    if (convId === id) { setConvId(null); setMsgs([]); }
  };

  const renameConv = async (id: number, title: string) => {
    await apiRequest("PATCH", `/api/ai/conversations/${id}`, { title });
    qc.invalidateQueries({ queryKey: ["/api/ai/conversations"] });
    setRenamingId(null);
  };

  const copyMessage = (text: string, id: number) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const sendMessage = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || !convId || streaming) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "44px";

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
            setMsgs(p => [...p, { kind: "tool_call", tool: ev.tool, id: newId() }]);
          } else if (ev.type === "tool_result") {
            setMsgs(p => p.map(m =>
              m.kind === "tool_call" && m.tool === ev.tool && m.ok === undefined
                ? { ...m, ok: ev.ok } : m
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
    } catch {
      setMsgs(p => [...p, { kind: "assistant", content: "❌ Bağlantı hatası oluştu.", id: newId() }]);
    } finally {
      setStreaming(false);
    }
  }, [input, convId, streaming, qc]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (!user?.isAdmin) return null;

  // ── Sidebar ─────────────────────────────────────────────────────────────────
  const SidebarContent = (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-md shadow-primary/30">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-black text-sm text-foreground tracking-wide">SOHBETLER</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <Button
          onClick={() => createConv()}
          className="w-full gap-2 h-9 text-xs font-bold rounded-xl bg-primary hover:bg-primary/90 shadow-md shadow-primary/25"
        >
          <Plus className="w-3.5 h-3.5" /> Yeni Sohbet
        </Button>
      </div>

      {/* Conv list */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-0.5">
          {convs.length === 0 && (
            <div className="text-center py-10 text-xs text-muted-foreground px-4">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
              Henüz sohbet yok
            </div>
          )}
          {convs.map(c => (
            <div key={c.id}>
              {renamingId === c.id ? (
                <form
                  className="flex gap-1 px-2 py-1"
                  onSubmit={e => { e.preventDefault(); renameConv(c.id, renameValue); }}
                >
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    className="flex-1 text-xs bg-muted rounded-lg px-2 py-1.5 border border-primary/40 outline-none"
                  />
                  <button type="submit" className="p-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25">
                    <Check className="w-3 h-3" />
                  </button>
                  <button type="button" onClick={() => setRenamingId(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                    <X className="w-3 h-3" />
                  </button>
                </form>
              ) : (
                <div
                  onClick={() => { setConvId(c.id); setMsgs([]); setSidebarOpen(false); }}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all ${
                    convId === c.id
                      ? "bg-primary/15 text-primary border border-primary/20"
                      : "hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                  <span className="text-xs font-medium truncate flex-1 leading-snug">{c.title}</span>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                    <button
                      onClick={e => { e.stopPropagation(); setRenamingId(c.id); setRenameValue(c.title); }}
                      className="p-1 rounded-lg hover:bg-primary/15 hover:text-primary"
                    >
                      <Edit3 className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteConv(c.id); }}
                      className="p-1 rounded-lg hover:bg-destructive/15 hover:text-destructive"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Status */}
      <div className="p-3 border-t border-border/30 space-y-2">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/15">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-primary uppercase tracking-wider">GPT-4o Aktif</p>
            <p className="text-[9px] text-muted-foreground">Tool calling • Streaming • DB erişimi</p>
          </div>
          <Zap className="w-3 h-3 text-primary/60" />
        </div>
        <div className="flex gap-2 text-[10px] text-muted-foreground">
          <span className="flex-1 text-center px-2 py-1 rounded-lg bg-muted/40">{convs.length} sohbet</span>
          <span className="flex-1 text-center px-2 py-1 rounded-lg bg-muted/40">{msgs.filter(m => m.kind !== "tool_call").length} mesaj</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-[calc(100vh-112px)] md:h-[calc(100vh-64px)] overflow-hidden rounded-2xl border border-border/50 shadow-2xl bg-card relative">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 lg:w-64 shrink-0 flex-col border-r border-border/40">
        {SidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-72 z-50 border-r border-border/50 flex flex-col md:hidden shadow-2xl">
            {SidebarContent}
          </div>
        </>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-card/95 backdrop-blur-sm shrink-0">
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
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-card" />
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="font-black text-base text-gradient leading-tight">Auren AI</h1>
            <p className="text-[10px] text-muted-foreground truncate">
              {convId
                ? convs.find(c => c.id === convId)?.title ?? "Sohbet"
                : "Yeni sohbet başlat veya soldan seç"}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {streaming && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                <Loader2 className="w-3 h-3 text-green-500 animate-spin" />
                <span className="text-[10px] font-bold text-green-500">Yanıtlıyor...</span>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20">
              <Zap className="w-3 h-3 text-primary" />
              <span className="text-[10px] font-bold text-primary">Ultra Mod</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="p-3 sm:p-5 space-y-3 min-h-full">

            {/* Welcome screen */}
            {!convId && (
              <div className="flex flex-col items-center justify-center min-h-[55vh] text-center space-y-6 py-6 px-4">
                {/* Hero icon */}
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-2xl shadow-primary/40">
                    <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-7 h-7 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg animate-bounce">
                    <Zap className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -left-2 w-6 h-6 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                    <Wrench className="w-3 h-3 text-white" />
                  </div>
                </div>

                <div className="space-y-2 max-w-sm">
                  <h2 className="text-2xl sm:text-3xl font-black text-gradient">Auren AI'ya Hoş Geldin</h2>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    Veritabanına tam erişimim var. Takım ekle, istatistik güncelle, maç oluştur —
                    ne istersen söyle, anında yaparım.
                  </p>
                </div>

                {/* Capability badges */}
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    { icon: Database, label: "DB Erişimi", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
                    { icon: Zap,      label: "Tool Calling", color: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" },
                    { icon: RefreshCw, label: "Gerçek Zamanlı", color: "text-green-500 bg-green-500/10 border-green-500/20" },
                    { icon: Bot,      label: "GPT-4o Tabanlı", color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
                  ].map(b => (
                    <div key={b.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${b.color}`}>
                      <b.icon className="w-3 h-3" />
                      {b.label}
                    </div>
                  ))}
                </div>

                {/* Quick prompt groups */}
                <div className="w-full max-w-lg space-y-3">
                  {QUICK_GROUPS.map(g => (
                    <div key={g.label}>
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 text-left">{g.label}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {g.prompts.map(q => (
                          <button
                            key={q.label}
                            onClick={async () => {
                              const c = await createConv(q.label.slice(0, 40));
                              setTimeout(() => sendMessage(q.label), 150);
                            }}
                            className="flex items-start gap-3 px-3.5 py-3 rounded-2xl border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group active:scale-95"
                          >
                            <q.icon className={`w-4 h-4 shrink-0 mt-0.5 ${q.color}`} />
                            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground leading-snug flex-1">{q.label}</span>
                            <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <Button onClick={() => createConv()} className="gap-2 rounded-xl h-11 px-6 shadow-lg shadow-primary/25 font-bold">
                  <Plus className="w-4 h-4" /> Boş Sohbet Başlat
                </Button>

                <p className="text-[10px] text-muted-foreground">
                  Enter ile gönder • Shift+Enter yeni satır
                </p>
              </div>
            )}

            {/* Message list */}
            {msgs.map((msg) => {
              if (msg.kind === "tool_call") {
                const info = TOOL_LABELS[msg.tool] ?? { label: msg.tool, icon: Wrench, color: "text-muted-foreground", bg: "bg-muted/40 border-border/40" };
                const Icon = info.icon;
                return (
                  <div key={msg.id} className="flex justify-center py-0.5">
                    <div className={`flex items-center gap-2 px-3.5 py-2 rounded-full border text-xs font-semibold ${info.bg} ${info.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                      <span>{info.label}</span>
                      {msg.ok === undefined && <Loader2 className="w-3 h-3 animate-spin" />}
                      {msg.ok === true && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                      {msg.ok === false && <AlertCircle className="w-3 h-3 text-red-500" />}
                    </div>
                  </div>
                );
              }

              const isUser = msg.kind === "user";
              return (
                <div key={msg.id} className={`flex gap-2.5 sm:gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} group`}>
                  {/* Avatar */}
                  <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl shrink-0 flex items-center justify-center shadow-sm mt-0.5 ${
                    isUser
                      ? "bg-primary/15 border border-primary/25"
                      : "bg-gradient-to-br from-primary to-purple-600 shadow-primary/25"
                  }`}>
                    {isUser
                      ? <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                      : <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />}
                  </div>

                  {/* Bubble */}
                  <div className="max-w-[84%] sm:max-w-[78%] space-y-1">
                    <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                      isUser
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted/60 border border-border/40 rounded-tl-sm"
                    }`}>
                      {isUser
                        ? <p className="text-sm leading-relaxed">{msg.content}</p>
                        : <MD text={msg.content} />}
                    </div>
                    {/* Copy button */}
                    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                      <button
                        onClick={() => copyMessage(msg.content, msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground px-2 py-0.5 rounded-lg hover:bg-muted/50"
                      >
                        {copiedId === msg.id ? <><Check className="w-2.5 h-2.5 text-green-500" /> Kopyalandı</> : <><Copy className="w-2.5 h-2.5" /> Kopyala</>}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {streaming && msgs.length > 0 && msgs[msgs.length - 1]?.kind !== "assistant" && (
              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted/60 border border-border/40">
                  <div className="flex gap-1.5 items-center h-4">
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
            {/* Suggested follow-ups when not streaming */}
            {!streaming && msgs.length > 0 && msgs[msgs.length - 1]?.kind === "assistant" && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
                {[
                  "Devam et",
                  "Daha fazla detay ver",
                  "Özet yap",
                  "Bir sonraki adım ne?",
                ].map(s => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-full border border-border/50 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2 sm:gap-3 items-end">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder={streaming ? "Yanıt bekleniyor..." : "Bir şey sor ya da komut ver… (Enter = Gönder, Shift+Enter = Yeni satır)"}
                  disabled={streaming}
                  rows={1}
                  className="resize-none rounded-2xl border-border/50 focus:border-primary/50 bg-muted/30 text-sm min-h-[48px] max-h-[140px] py-3.5 px-4 placeholder:text-muted-foreground/40 leading-snug pr-16"
                  onInput={e => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = "auto";
                    t.style.height = Math.min(t.scrollHeight, 140) + "px";
                  }}
                />
                {/* Char counter */}
                {input.length > 200 && (
                  <span className={`absolute bottom-2 right-3 text-[10px] font-mono ${input.length > 450 ? "text-red-500" : "text-muted-foreground"}`}>
                    {input.length}/500
                  </span>
                )}
              </div>
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || streaming}
                size="icon"
                className="h-12 w-12 rounded-2xl bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 shrink-0 transition-all active:scale-95"
              >
                {streaming
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* If no conv selected but user is admin */}
        {!convId && (
          <div className="p-4 border-t border-border/30 bg-card shrink-0">
            <Button
              onClick={() => createConv()}
              className="w-full gap-2 h-11 rounded-2xl font-bold shadow-md shadow-primary/20"
            >
              <Plus className="w-4 h-4" /> Sohbet Başlat
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
