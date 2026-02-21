import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { InsertTeam } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export function useTeams() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: teams, isLoading } = useQuery({
    queryKey: [api.teams.list.path],
    queryFn: async () => {
      const res = await fetch(api.teams.list.path);
      if (!res.ok) throw new Error("Takımlar getirilemedi");
      return api.teams.list.responses[200].parse(await res.json());
    },
  });

  const createTeam = useMutation({
    mutationFn: async (data: InsertTeam) => {
      const res = await fetch(api.teams.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Takım oluşturulamadı");
      return api.teams.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.teams.list.path] });
      toast({ title: "Başarılı", description: "Takım oluşturuldu" });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Hata", description: err.message });
    },
  });

  const deleteTeam = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.teams.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Takım silinemedi");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.teams.list.path] });
      toast({ title: "Başarılı", description: "Takım silindi" });
    },
  });

  const updateTeam = useMutation({
    mutationFn: async (data: { id: number; name: string; logoUrl?: string }) => {
      const url = buildUrl(api.teams.update.path, { id: data.id });
      const res = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name, logoUrl: data.logoUrl }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Takım güncellenemedi");
      return api.teams.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.teams.list.path] });
      toast({ title: "Başarılı", description: "Takım güncellendi" });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Hata", description: err.message });
    },
  });

  return { teams, isLoading, createTeam, deleteTeam, updateTeam };
}
