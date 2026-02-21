import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useChat() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages, isLoading } = useQuery({
    queryKey: [api.chat.list.path],
    queryFn: async () => {
      const res = await fetch(api.chat.list.path);
      if (!res.ok) throw new Error("Mesajlar alınamadı");
      return api.chat.list.responses[200].parse(await res.json());
    },
    refetchInterval: 2000, // Poll every 2s as requested
  });

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(api.chat.send.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        credentials: "include",
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Yasaklısınız, mesaj gönderemezsiniz.");
        throw new Error("Mesaj gönderilemedi");
      }
      return api.chat.send.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chat.list.path] });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Hata", description: err.message });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.chat.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Mesaj silinemedi");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.chat.list.path] });
      toast({ title: "Mesaj silindi" });
    },
  });

  const banUser = useMutation({
    mutationFn: async (identifier: string) => {
      const res = await fetch(api.chat.ban.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Kullanıcı banlanamadı");
    },
    onSuccess: () => {
      toast({ title: "Kullanıcı banlandı" });
    },
  });

  return { messages, isLoading, sendMessage, deleteMessage, banUser };
}
