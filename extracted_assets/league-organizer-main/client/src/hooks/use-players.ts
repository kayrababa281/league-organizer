import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertPlayer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function usePlayers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: players, isLoading } = useQuery({
    queryKey: [api.players.list.path],
    queryFn: async () => {
      const res = await fetch(api.players.list.path);
      if (!res.ok) throw new Error("Oyuncular getirilemedi");
      return api.players.list.responses[200].parse(await res.json());
    },
  });

  const createPlayer = useMutation({
    mutationFn: async (data: InsertPlayer) => {
      const res = await fetch(api.players.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Oyuncu oluşturulamadı");
      return api.players.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.players.list.path] });
      toast({ title: "Başarılı", description: "Oyuncu eklendi" });
    },
  });

  const updatePlayer = useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertPlayer>) => {
      const url = buildUrl(api.players.update.path, { id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Güncelleme başarısız");
      return api.players.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.players.list.path] });
      toast({ title: "Başarılı", description: "İstatistikler güncellendi" });
    },
  });

  const deletePlayer = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.players.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Oyuncu silinemedi");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.players.list.path] });
      toast({ title: "Başarılı", description: "Oyuncu silindi" });
    },
  });

  return { players, isLoading, createPlayer, updatePlayer, deletePlayer };
}
