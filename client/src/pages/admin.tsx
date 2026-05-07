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
import { Trash2, Plus, Save, Search } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { TOURNAMENT_LABELS, ROUND_LABELS } from "@shared/schema";

const ALL_TOURNAMENTS = [
  { value: "league",           label: "Lig" },
  { value: "carabag_cup",      label: "Carabağ Cup" },
  { value: "auren_lig_cup",    label: "Auren Lig Cup" },
  { value: "champions_league", label: "Champions League" },
  { value: "europa_league",    label: "UEFA Avrupa Ligi" },
  { value: "super_cup",        label: "UEFA Süper Kupa" },
];

const ALL_ROUNDS = [
  { value: "group_stage",   label: "Grup Aşaması" },
  { value: "round_of_16",   label: "İlk 16" },
  { value: "round_of_12",   label: "İlk 12" },
  { value: "round_of_8",    label: "İlk 8" },
  { value: "quarter_final", label: "Çeyrek Final" },
  { value: "semi_final",    label: "Yarı Final" },
  { value: "final",         label: "Final" },
];

// Map tournament → player goals field key
const TOURNAMENT_GOAL_FIELDS: Record<string, { key: string; label: string }> = {
  carabag_cup:      { key: "carabagCupGoals",      label: "Carabağ Cup Gol" },
  auren_lig_cup:    { key: "aurenLigCupGoals",     label: "Auren Lig Cup Gol" },
  champions_league: { key: "championsLeagueGoals", label: "Champions League Gol" },
  europa_league:    { key: "europaLeagueGoals",    label: "UEFA Avrupa Ligi Gol" },
  super_cup:        { key: "superCupGoals",        label: "Süper Kupa Gol" },
};

function UsersManager() {
  const { data: users } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });
  const { toast } = useToast();

  const deleteUser = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Başarılı", description: "Üye silindi" });
    }
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, ...updates }: any) => apiRequest("PATCH", `/api/admin/users/${id}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Başarılı", description: "Üye güncellendi" });
    }
  });

  const banUser = useMutation({
    mutationFn: async (identifier: string) => apiRequest("POST", "/api/chat/ban", { identifier }),
    onSuccess: () => toast({ title: "Başarılı", description: "Kullanıcı banlandı" })
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
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">{u.username}</CardTitle>
                <CardDescription className="text-xs truncate">{u.bio || "Biyografi yok"}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => deleteUser.mutate(u.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Profil Fotoğrafı URL</Label>
              <div className="flex gap-2">
                <Input defaultValue={u.avatarUrl || ""} id={`pp-${u.id}`} className="h-8 text-xs" />
                <Button size="icon" className="h-8 w-8 shrink-0" onClick={() => {
                  const url = (document.getElementById(`pp-${u.id}`) as HTMLInputElement).value;
                  updateUser.mutate({ id: u.id, avatarUrl: url });
                }}>
                  <Save className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => {
                const newName = prompt("Yeni kullanıcı adı:", u.username);
                if (newName && newName !== u.username) updateUser.mutate({ id: u.id, username: newName });
              }}>
                İsim Değiştir
              </Button>
              <Button variant="destructive" size="sm" className="flex-1 text-xs" onClick={() => {
                if (confirm(`${u.username} adlı kullanıcıyı banlamak istediğinize emin misiniz?`)) {
                  banUser.mutate(u.username);
                }
              }}>
                Banla
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      {(!users || users.length === 0) && (
        <div className="col-span-full text-center py-12 text-muted-foreground">Kayıtlı üye bulunamadı.</div>
      )}
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
        <TabsList className="bg-muted p-1 rounded-xl h-auto flex-wrap gap-1">
          <TabsTrigger value="teams" className="py-2.5 px-4">Takımlar</TabsTrigger>
          <TabsTrigger value="players" className="py-2.5 px-4">Oyuncular</TabsTrigger>
          <TabsTrigger value="fixtures" className="py-2.5 px-4">Fikstür & Maçlar</TabsTrigger>
          <TabsTrigger value="users" className="py-2.5 px-4">Üyeler</TabsTrigger>
        </TabsList>

        <TabsContent value="teams"><TeamsManager /></TabsContent>
        <TabsContent value="players"><PlayersManager /></TabsContent>
        <TabsContent value="fixtures"><FixturesManager /></TabsContent>
        <TabsContent value="users"><UsersManager /></TabsContent>
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
        onSuccess: () => { setEditingTeam(null); setName(""); setLogoUrl(""); }
      });
    } else {
      createTeam.mutate({ name, logoUrl }, {
        onSuccess: () => { setName(""); setLogoUrl(""); }
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
                <Button type="button" variant="outline" onClick={() => { setEditingTeam(null); setName(""); setLogoUrl(""); }}>
                  İptal
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Mevcut Takımlar</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {teams?.map(team => (
            <div key={team.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {team.logoUrl && <img src={team.logoUrl} className="w-8 h-8 object-contain" alt="" />}
                <span className="font-semibold">{team.name}</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => { setEditingTeam(team); setName(team.name); setLogoUrl(team.logoUrl || ""); }}>
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
      goals: 0, assists: 0,
      carabagCupGoals: 0, aurenLigCupGoals: 0,
      championsLeagueGoals: 0, europaLeagueGoals: 0,
      superCupGoals: 0, top8Goals: 0, top12Goals: 0, top16Goals: 0,
      cleanSheets: 0, yellowCards: 0, redCards: 0,
    }, { onSuccess: () => setNewPlayerName("") });
  };

  const filteredPlayers = players?.filter(player =>
    player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teams?.find(t => t.id === player.teamId)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cupFields = Object.entries(TOURNAMENT_GOAL_FIELDS);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Oyuncu Ekle</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="flex gap-4 items-end flex-wrap">
            <div className="space-y-2 flex-1 min-w-[140px]">
              <Label>Takım Seç</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger><SelectValue placeholder="Takım..." /></SelectTrigger>
                <SelectContent>
                  {teams?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1 min-w-[140px]">
              <Label>Oyuncu Adı</Label>
              <Input value={newPlayerName} onChange={(e) => setNewPlayerName(e.target.value)} required />
            </div>
            <Button type="submit" disabled={createPlayer.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Ekle
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Oyuncu veya takım ara..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 shrink-0" onClick={() => deletePlayer.mutate(player.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                {/* Takım */}
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs text-muted-foreground">Takım</Label>
                  <Select
                    defaultValue={String(player.teamId)}
                    onValueChange={(val) => updatePlayer.mutate({ id: player.id, teamId: parseInt(val) })}
                  >
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {teams?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {/* Lig İstatistikleri */}
                {[
                  { key: "goals", label: "Lig Golü" },
                  { key: "assists", label: "Asist" },
                  { key: "cleanSheets", label: "Gol Yememe" },
                  { key: "yellowCards", label: "Sarı Kart" },
                  { key: "redCards", label: "Kırmızı Kart" },
                ].map(f => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{f.label}</Label>
                    <Input
                      type="number"
                      min={0}
                      defaultValue={(player as any)[f.key]}
                      onBlur={(e) => updatePlayer.mutate({ id: player.id, [f.key]: parseInt(e.target.value) || 0 })}
                      className="h-8"
                    />
                  </div>
                ))}

                {/* Kupa Golleri */}
                {cupFields.map(([, { key, label }]) => (
                  <div key={key} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <Input
                      type="number"
                      min={0}
                      defaultValue={(player as any)[key] || 0}
                      onBlur={(e) => updatePlayer.mutate({ id: player.id, [key]: parseInt(e.target.value) || 0 })}
                      className="h-8"
                    />
                  </div>
                ))}
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
  const [tournament, setTournament] = useState("league");
  const [round, setRound] = useState("group_stage");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeTeam || !awayTeam) return;
    createMatch.mutate({
      homeTeamId: parseInt(homeTeam),
      awayTeamId: parseInt(awayTeam),
      week: tournament === "league" ? parseInt(week) : null,
      tournament,
      round: tournament !== "league" ? round : null,
      date: date ? new Date(date) : undefined,
    }, {
      onSuccess: () => { setHomeTeam(""); setAwayTeam(""); }
    });
  };

  const getMatchLabel = (match: any) => {
    if (match.tournament === "league") {
      return match.week != null ? `${match.week}. Hafta` : "Lig";
    }
    const tLabel = TOURNAMENT_LABELS[match.tournament] || match.tournament;
    const rLabel = match.round ? (ROUND_LABELS[match.round] || match.round) : "";
    return rLabel ? `${tLabel} — ${rLabel}` : tLabel;
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader><CardTitle>Maç Oluştur</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
            {/* Turnuva */}
            <div className="space-y-2">
              <Label>Turnuva</Label>
              <Select value={tournament} onValueChange={setTournament}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_TOURNAMENTS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Hafta veya Tur */}
            {tournament === "league" ? (
              <div className="space-y-2">
                <Label>Hafta</Label>
                <Input type="number" value={week} onChange={e => setWeek(e.target.value)} min={1} required />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Tur</Label>
                <Select value={round} onValueChange={setRound}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_ROUNDS.map(r => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Ev Sahibi */}
            <div className="space-y-2">
              <Label>Ev Sahibi</Label>
              <Select value={homeTeam} onValueChange={setHomeTeam}>
                <SelectTrigger><SelectValue placeholder="Seç..." /></SelectTrigger>
                <SelectContent>
                  {teams?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Deplasman */}
            <div className="space-y-2">
              <Label>Deplasman</Label>
              <Select value={awayTeam} onValueChange={setAwayTeam}>
                <SelectTrigger><SelectValue placeholder="Seç..." /></SelectTrigger>
                <SelectContent>
                  {teams?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Tarih */}
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
        {matches?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">Henüz maç yok.</div>
        )}
        {matches?.map(match => (
          <MatchEditCard
            key={`${match.id}-${match.homeScore}-${match.awayScore}-${match.videoUrl}`}
            match={match}
            teams={teams}
            getMatchLabel={getMatchLabel}
            onSave={(homeScore, awayScore, videoUrl) =>
              updateMatchScore.mutate({ id: match.id, homeScore, awayScore, videoUrl: videoUrl || undefined })
            }
            onDelete={() => deleteMatch.mutate(match.id)}
          />
        ))}
      </div>
    </div>
  );
}

function MatchEditCard({ match, teams, getMatchLabel, onSave, onDelete }: {
  match: any;
  teams: any;
  getMatchLabel: (m: any) => string;
  onSave: (home: number, away: number, video: string) => void;
  onDelete: () => void;
}) {
  const [homeScore, setHomeScore] = useState<string>(match.homeScore != null ? String(match.homeScore) : "");
  const [awayScore, setAwayScore] = useState<string>(match.awayScore != null ? String(match.awayScore) : "");
  const [videoUrl, setVideoUrl] = useState<string>(match.videoUrl ?? "");

  return (
    <Card className="p-4">
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="text-xs font-bold w-40 text-center bg-muted py-1.5 rounded px-2 shrink-0 truncate">
          {getMatchLabel(match)}
        </div>
        <div className="flex-1 flex items-center justify-between gap-4 min-w-0">
          <span className="font-semibold text-right flex-1 truncate">
            {teams?.find((t: any) => t.id === match.homeTeamId)?.name}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <Input
              type="number"
              className="w-16 text-center"
              value={homeScore}
              onChange={e => setHomeScore(e.target.value)}
              min={0}
            />
            <span className="font-bold text-muted-foreground">-</span>
            <Input
              type="number"
              className="w-16 text-center"
              value={awayScore}
              onChange={e => setAwayScore(e.target.value)}
              min={0}
            />
          </div>
          <span className="font-semibold text-left flex-1 truncate">
            {teams?.find((t: any) => t.id === match.awayTeamId)?.name}
          </span>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 shrink-0">
          <Input
            placeholder="Video URL"
            className="md:w-44"
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
          />
          <Button
            size="sm"
            onClick={() => {
              if (homeScore === "" || awayScore === "") return;
              onSave(parseInt(homeScore), parseInt(awayScore), videoUrl);
            }}
            title="Kaydet"
          >
            <Save className="w-4 h-4" />
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete} title="Sil">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
