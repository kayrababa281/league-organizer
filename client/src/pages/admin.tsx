import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeams } from "@/hooks/use-teams";
import { usePlayers } from "@/hooks/use-players";
import { useMatches } from "@/hooks/use-matches";
import { Trash2, Plus, Save, Search, UserCog, Ban, ShieldAlert, Users as UsersIcon } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

function UsersManager() {
  const { data: users, refetch } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });
  const { toast } = useToast();

  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Başarılı", description: "Üye silindi" });
    }
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      await apiRequest("PATCH", `/api/admin/users/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Başarılı", description: "Üye güncellendi" });
    }
  });

  const banUser = useMutation({
    mutationFn: async (identifier: string) => {
      await apiRequest("POST", "/api/chat/ban", { identifier });
    },
    onSuccess: () => {
      toast({ title: "Başarılı", description: "Kullanıcı banlandı" });
    }
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {users?.map(u => (
        <Card key={u.id}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={u.avatarUrl || ""} />
                <AvatarFallback>{u.username.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <CardTitle className="text-lg">{u.username}</CardTitle>
                <CardDescription className="text-xs truncate">{u.bio || "Biyografi yok"}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteUser.mutate(u.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Profil Fotoğrafı URL</Label>
              <div className="flex gap-2">
                <Input 
                  defaultValue={u.avatarUrl || ""} 
                  id={`pp-${u.id}`}
                  className="h-8 text-xs" 
                />
                <Button size="icon" className="h-8 w-8" onClick={() => {
                  const url = (document.getElementById(`pp-${u.id}`) as HTMLInputElement).value;
                  updateUser.mutate({ id: u.id, avatarUrl: url });
                }}>
                  <Save className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs"
                onClick={() => {
                  const newName = prompt("Yeni kullanıcı adı:", u.username);
                  if (newName && newName !== u.username) updateUser.mutate({ id: u.id, username: newName });
                }}
              >
                İsim Değiştir
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                className="flex-1 text-xs"
                onClick={() => {
                  if (confirm(`${u.username} adlı kullanıcıyı banlamak istediğinize emin misiniz?`)) {
                    banUser.mutate(u.username);
                  }
                }}
              >
                Banla
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function Admin() {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && (!user || user.isAdmin !== true)) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return <div className="p-8 text-center">Yükleniyor...</div>;
  if (!user || user.isAdmin !== true) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black font-display">Yönetim Paneli</h1>
      </div>

      <Tabs defaultValue="teams" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-xl h-auto flex-wrap">
          <TabsTrigger value="teams" className="py-2.5 px-4">Takımlar</TabsTrigger>
          <TabsTrigger value="players" className="py-2.5 px-4">Oyuncular & İstatistikler</TabsTrigger>
          <TabsTrigger value="fixtures" className="py-2.5 px-4">Fikstür & Maçlar</TabsTrigger>
          <TabsTrigger value="users" className="py-2.5 px-4">Üyeler</TabsTrigger>
        </TabsList>

        <TabsContent value="teams">
          <TeamsManager />
        </TabsContent>

        <TabsContent value="players">
          <PlayersManager />
        </TabsContent>

        <TabsContent value="fixtures">
          <FixturesManager />
        </TabsContent>

        <TabsContent value="users">
          <UsersManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TeamsManager() {
  const { teams, createTeam, deleteTeam, updateTeam } = useTeams();
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [editingTeam, setEditingTeam] = useState<any>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTeam) {
      updateTeam.mutate({ id: editingTeam.id, name, logoUrl }, {
        onSuccess: () => {
          setEditingTeam(null);
          setName("");
          setLogoUrl("");
        }
      });
    } else {
      createTeam.mutate({ name, logoUrl }, {
        onSuccess: () => {
          setName("");
          setLogoUrl("");
        }
      });
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{editingTeam ? "Takımı Düzenle" : "Yeni Takım Ekle"}</CardTitle>
          <CardDescription>Lige takım ekleyin veya mevcut takımı düzenleyin.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Takım Adı</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: Real Madrid" required />
            </div>
            <div className="space-y-2">
              <Label>Logo URL (İsteğe Bağlı)</Label>
              <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={createTeam.isPending || updateTeam.isPending}>
                {editingTeam ? "Güncelle" : "Takım Ekle"}
              </Button>
              {editingTeam && (
                <Button type="button" variant="outline" onClick={() => {
                  setEditingTeam(null);
                  setName("");
                  setLogoUrl("");
                }}>İptal</Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mevcut Takımlar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {teams?.map(team => (
            <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {team.logoUrl && <img src={team.logoUrl} className="w-8 h-8 object-contain" />}
                <span className="font-semibold">{team.name}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => {
                  setEditingTeam(team);
                  setName(team.name);
                  setLogoUrl(team.logoUrl || "");
                }}>
                  <Plus className="w-4 h-4 rotate-45" />
                </Button>
                <Button variant="destructive" size="icon" onClick={() => deleteTeam.mutate(team.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function PlayersManager() {
  const { teams } = useTeams();
  const { players, createPlayer, deletePlayer, updatePlayer } = usePlayers();
  
  const [newPlayerName, setNewPlayerName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    createPlayer.mutate({ 
      name: newPlayerName, 
      teamId: parseInt(selectedTeamId),
      goals: 0, assists: 0, cleanSheets: 0, yellowCards: 0, redCards: 0 
    }, {
      onSuccess: () => setNewPlayerName("")
    });
  };

  const filteredPlayers = players?.filter(player => 
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teams?.find(t => t.id === player.teamId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Oyuncu Ekle</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-4 items-end">
            <div className="space-y-2 flex-1">
              <Label>Takım Seç</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="Takım..." />
                </SelectTrigger>
                <SelectContent>
                  {teams?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1">
              <Label>Oyuncu Adı</Label>
              <Input value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} required />
            </div>
            <Button type="submit" disabled={createPlayer.isPending}><Plus className="mr-2 h-4 w-4" /> Ekle</Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Oyuncu veya takım ara..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredPlayers?.map(player => (
          <Card key={player.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                   <CardTitle className="text-lg">{player.name}</CardTitle>
                   <CardDescription>{teams?.find(t => t.id === player.teamId)?.name}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => deletePlayer.mutate(player.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Takım</Label>
                  <Select 
                    defaultValue={String(player.teamId)} 
                    onValueChange={(val) => updatePlayer.mutate({ id: player.id, teamId: parseInt(val) })}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {teams?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Gol</Label>
                  <Input type="number" defaultValue={player.goals} 
                    onBlur={(e) => updatePlayer.mutate({ id: player.id, goals: parseInt(e.target.value) })}
                    className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Asist</Label>
                  <Input type="number" defaultValue={player.assists} 
                    onBlur={(e) => updatePlayer.mutate({ id: player.id, assists: parseInt(e.target.value) })}
                    className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Gol Yememe</Label>
                  <Input type="number" defaultValue={player.cleanSheets} 
                    onBlur={(e) => updatePlayer.mutate({ id: player.id, cleanSheets: parseInt(e.target.value) })}
                    className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Sarı Kart</Label>
                  <Input type="number" defaultValue={player.yellowCards} 
                    onBlur={(e) => updatePlayer.mutate({ id: player.id, yellowCards: parseInt(e.target.value) })}
                    className="h-8" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Kırmızı Kart</Label>
                  <Input type="number" defaultValue={player.redCards} 
                    onBlur={(e) => updatePlayer.mutate({ id: player.id, redCards: parseInt(e.target.value) })}
                    className="h-8" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function FixturesManager() {
  const { teams } = useTeams();
  const { matches, createMatch, updateMatchScore, deleteMatch } = useMatches();
  
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [week, setWeek] = useState("1");
  const [date, setDate] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMatch.mutate({
      homeTeamId: parseInt(homeTeam),
      awayTeamId: parseInt(awayTeam),
      week: parseInt(week),
      date: date ? new Date(date) : undefined
    }, {
      onSuccess: () => {
        setHomeTeam(""); setAwayTeam("");
      }
    });
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader><CardTitle>Maç Oluştur</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid md:grid-cols-5 gap-4 items-end">
            <div className="space-y-2">
              <Label>Hafta</Label>
              <Input type="number" value={week} onChange={e => setWeek(e.target.value)} min={1} required />
            </div>
            <div className="space-y-2">
              <Label>Ev Sahibi</Label>
              <Select value={homeTeam} onValueChange={setHomeTeam}>
                <SelectTrigger><SelectValue placeholder="Seç..." /></SelectTrigger>
                <SelectContent>{teams?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Deplasman</Label>
              <Select value={awayTeam} onValueChange={setAwayTeam}>
                <SelectTrigger><SelectValue placeholder="Seç..." /></SelectTrigger>
                <SelectContent>{teams?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <Label>Tarih</Label>
              <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <Button type="submit" disabled={createMatch.isPending}>Oluştur</Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="font-bold text-lg">Maçları Düzenle / Skor Gir</h3>
        {matches?.map(match => (
          <Card key={match.id} className="p-4">
             <div className="flex flex-col md:flex-row items-center gap-4">
               <div className="text-sm font-bold w-20 text-center bg-muted py-1 rounded">Week {match.week}</div>
               <div className="flex-1 flex items-center justify-between gap-4">
                  <span className="font-semibold text-right flex-1">{teams?.find(t => t.id === match.homeTeamId)?.name}</span>
                  
                  <div className="flex items-center gap-2">
                     <Input 
                       type="number" 
                       className="w-16 text-center" 
                       defaultValue={match.homeScore ?? undefined}
                       id={`home-${match.id}`}
                     />
                     <span>-</span>
                     <Input 
                       type="number" 
                       className="w-16 text-center" 
                       defaultValue={match.awayScore ?? undefined}
                       id={`away-${match.id}`}
                     />
                  </div>

                  <span className="font-semibold text-left flex-1">{teams?.find(t => t.id === match.awayTeamId)?.name}</span>
               </div>
               
               <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0">
                  <Input 
                    placeholder="Video URL" 
                    className="md:w-40" 
                    defaultValue={match.videoUrl ?? ""}
                    id={`video-${match.id}`}
                  />
                  <Button size="sm" onClick={() => {
                    const h = (document.getElementById(`home-${match.id}`) as HTMLInputElement).value;
                    const a = (document.getElementById(`away-${match.id}`) as HTMLInputElement).value;
                    const v = (document.getElementById(`video-${match.id}`) as HTMLInputElement).value;
                    if(h === "" || a === "") return;
                    updateMatchScore.mutate({
                      id: match.id,
                      homeScore: parseInt(h),
                      awayScore: parseInt(a),
                      videoUrl: v || undefined
                    });
                  }}>
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => deleteMatch.mutate(match.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
               </div>
             </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
