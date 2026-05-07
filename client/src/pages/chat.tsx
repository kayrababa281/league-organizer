import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Trash2, Crown, Shield } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Chat() {
  const { messages, sendMessage, deleteMessage } = useChat();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    sendMessage.mutate(content);
    setContent("");
  };

  return (
    <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-80px)] flex flex-col gap-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="p-2 rounded-xl bg-primary/10 glow-primary-sm">
          <MessageSquare className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black font-display">Sohbet Odası</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {messages?.length ?? 0} mesaj
          </p>
        </div>
      </div>

      {/* Chat box */}
      <div className="flex-1 bg-card border border-border/50 rounded-2xl shadow-xl card-glass flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5" ref={scrollRef}>
          {messages?.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40 gap-3">
              <MessageSquare className="w-12 h-12" />
              <p className="text-sm font-medium">Henüz mesaj yok. İlk sen yaz!</p>
            </div>
          )}
          {messages?.map((msg) => {
            const isMe = msg.senderName === user?.identifier;
            const isAdminMsg = msg.isAdmin;

            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"} group`}>
                {/* Avatar */}
                <div className="relative shrink-0">
                  <Avatar className={`h-9 w-9 border-2 shadow-sm ${isAdminMsg ? "border-primary/50" : "border-border/30"}`}>
                    <AvatarImage src={msg.senderAvatar || ""} />
                    <AvatarFallback className={`text-[10px] font-black ${isAdminMsg ? "bg-primary/20 text-primary" : "bg-muted"}`}>
                      {msg.senderName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {isAdminMsg && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow">
                      <Crown className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>

                <div className={`flex flex-col max-w-[70%] ${isMe ? "items-end" : "items-start"}`}>
                  {/* Name + time */}
                  <div className={`flex items-center gap-2 mb-1.5 ${isMe ? "flex-row-reverse" : ""}`}>
                    <span className={`text-xs font-bold ${isAdminMsg ? "text-primary" : "text-muted-foreground"}`}>
                      {msg.senderName}
                    </span>
                    {isAdminMsg && (
                      <span className="text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide flex items-center gap-0.5">
                        <Shield className="w-2 h-2" /> Admin
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground/50">
                      {format(new Date(msg.createdAt), "HH:mm")}
                    </span>
                    {user?.isAdmin && (
                      <button
                        onClick={() => deleteMessage.mutate(msg.id)}
                        className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 p-1 rounded-md transition-all duration-150"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {/* Bubble */}
                  <div className={`
                    relative px-4 py-2.5 rounded-2xl text-sm shadow-sm leading-relaxed
                    ${isMe
                      ? "bg-primary text-primary-foreground rounded-tr-sm glow-primary-sm"
                      : isAdminMsg
                        ? "bg-primary/15 text-foreground border border-primary/20 rounded-tl-sm"
                        : "bg-muted text-foreground rounded-tl-sm"}
                  `}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border/30 bg-muted/10 shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-3 items-center">
            <Input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Mesajını yaz..."
              className="bg-card/80 rounded-full pl-5 border-border/50 focus:border-primary/50 shadow-sm h-11"
              data-testid="input-chat-message"
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-full w-11 h-11 shrink-0 glow-primary-sm shadow-lg transition-all duration-200 hover:scale-105"
              disabled={sendMessage.isPending || !content.trim()}
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
