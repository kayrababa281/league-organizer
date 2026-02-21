import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import type { LoginRequest } from "@shared/schema";

export function useAuth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check auth status
  const { data: user, isLoading } = useQuery({
    queryKey: [api.auth.check.path],
    queryFn: async () => {
      const res = await fetch(api.auth.check.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to check auth");
      return api.auth.check.responses[200].parse(await res.json());
    },
    retry: false,
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const res = await fetch(api.auth.login.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 401) throw new Error("Kullanıcı adı veya şifre yanlış");
        throw new Error("Giriş yapılamadı");
      }
      return api.auth.login.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.auth.check.path] });
      toast({ title: "Başarılı", description: "Giriş yapıldı" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Hata", description: error.message });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch(api.auth.logout.path, { method: "POST" });
    },
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: [api.auth.check.path] });
      queryClient.setQueryData([api.auth.check.path], null);
      await queryClient.invalidateQueries({ queryKey: [api.auth.check.path] });
      toast({ title: "Çıkış Yapıldı" });
    },
  });

  return {
    user,
    isLoading,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    logoutAsync: logoutMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginAsync: loginMutation.mutateAsync,
  };
}
