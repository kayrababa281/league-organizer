import { useChat } from "@/hooks/use-chat";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Trash2, Crown } from "lucide-react";
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
    <div className="h-[calc(100vh-140px)] md:h-[calc(100vh-80px)] flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-black font-display">Sohbet Odası</h1>
      </div>

      <div className="flex-1 bg-card border rounded-2xl shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
          {messages?.map((msg) => {
            const isMe = msg.senderName === user?.identifier;
            return (
              <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                <Avatar className="h-8 w-8 shrink-0 mt-1 border">
                  <AvatarImage src={msg.senderAvatar || ""} />
                  <AvatarFallback className="text-[10px] font-bold">
                    {msg.senderName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <div className={`flex items-center gap-2 mb-1 ${isMe ? "flex-row-reverse" : ""}`}>
                    <span className={`text-xs font-bold ${msg.isAdmin ? "text-primary flex items-center gap-1" : "text-muted-foreground"}`}>
                      {msg.isAdmin && <Crown className="w-3 h-3" />}
                      {msg.senderName}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      {format(new Date(msg.createdAt), "HH:mm")}
                    </span>
                    
                    {user?.isAdmin && (
                      <div className="flex gap-1 ml-2">
                        <button onClick={() => deleteMessage.mutate(msg.id)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className={`
                    px-4 py-2 rounded-2xl max-w-[280px] md:max-w-md text-sm shadow-sm
                    ${isMe 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-muted text-foreground rounded-tl-none"}
                  `}>
                    {msg.content}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t bg-muted/30">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Mesaj yaz..." 
              className="bg-background rounded-full pl-6 border-transparent focus:border-primary shadow-sm"
              data-testid="input-chat-message"
            />
            <Button type="submit" size="icon" className="rounded-full w-10 h-10 shrink-0" disabled={sendMessage.isPending} data-testid="button-send-message">
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
