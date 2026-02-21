import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertMatch, UpdateMatchScoreRequest } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useMatches() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: matches, isLoading } = useQuery({
    queryKey: [api.matches.list.path],
    queryFn: async () => {
      const res = await fetch(api.matches.list.path);
      if (!res.ok) throw new Error("Maçlar getirilemedi");
      return api.matches.list.responses[200].parse(await res.json());
    },
  });

  const createMatch = useMutation({
    mutationFn: async (data: InsertMatch) => {
      const res = await fetch(api.matches.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Maç oluşturulamadı");
      return api.matches.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      toast({ title: "Başarılı", description: "Maç fikstüre eklendi" });
    },
  });

  const updateMatchScore = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & UpdateMatchScoreRequest & { videoUrl?: string }) => {
      const url = buildUrl(api.matches.updateScore.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Skor güncellenemedi");
      return api.matches.updateScore.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.teams.list.path] }); // Update standings too
      toast({ title: "Başarılı", description: "Maç sonucu kaydedildi" });
    },
  });

  const deleteMatch = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.matches.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Maç silinemedi");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.matches.list.path] });
      toast({ title: "Başarılı", description: "Maç silindi" });
    },
  });

  return { matches, isLoading, createMatch, updateMatchScore, deleteMatch };
}
