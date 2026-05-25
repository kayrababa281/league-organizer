import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTeams } from "@/hooks/use-teams";
import { usePlayers } from "@/hooks/use-players";
import { useMatches } from "@/hooks/use-matches";
import {
  Trash2, Plus, Save, Search, Shield, Trophy, Users, Calendar,
  BarChart3, Edit2, CheckCircle, XCircle, Ban, RefreshCw,
  Flame, Star, Target, Swords, AlertTriangle, UserX, Zap,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { TOURNAMENT_LABELS, ROUND_LABELS } from "@shared/schema";

const ALL_TOURNAMENTS = [
  { value: "league",           label: "Lig",               icon: "⚽" },
  { value: "carabag_cup",      label: "Carabağ Cup",       icon: "🏆" },
  { value: "auren_lig_cup",    label: "Auren Lig Cup",     icon: "🥇" },
  { value: "champions_league", label: "Champions League",  icon: "⭐" },
  { value: "europa_league",    label: "UEFA Avrupa Ligi",  icon: "🌍" },
  { value: "super_cup",        label: "UEFA Süper Kupa",   icon: "🎖️" },
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

const TOURNAMENT_STAT_FIELDS: Record<string, { goalsKey: string; assistsKey: string; label: string }> = {
  carabag_cup:      { goalsKey: "carabagCupGoals",      assistsKey: "carabagCupAssists",      label: "Carabağ Cup" },
  auren_lig_cup:    { goalsKey: "aurenLigCupGoals",     assistsKey: "aurenLigCupAssists",     label: "Auren Lig Cup" },
  champions_league: { goalsKey: "championsLeagueGoals", assistsKey: "championsLeagueAssists", label: "Champions League" },
  europa_league:    { goalsKey: "europaLeagueGoals",    assistsKey: "europaLeagueAssists",    label: "UEFA Avrupa Ligi" },
  super_cup:        { goalsKey: "superCupGoals",        assistsKey: "superCupAssists",        label: "Süper Kupa" },
};

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  return (
    <Card className={`relative overflow-hidden border-0 shadow-lg`}>
      <div className={`absolute inset-0 opacity-10 ${color}`} />
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-2xl ${color} bg-opacity-20`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-2xl font-black text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Admin() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { matches } = useMatches();
  const { data: users } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });

  useEffect(() => {
    if (!isLoading && (!user || user.isAdmin !== true)) setLocation("/login");
  }, [user, isLoading, setLocation]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-muted-foreground text-sm">Yükleniyor...</p>
      </div>
    </div>
  );
  if (!user || user.isAdmin !== true) return null;

  const playedCount = matches?.filter(m => m.isPlayed).length ?? 0;

  return (
    <div className="space-y-8 pb-8">
      {/* ── Header ── */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary via-purple-700 to-indigo-900 p-6 md:p-8 shadow-2xl shadow-primary/30">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white blur-3xl transform translate-x-16 -translate-y-16" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-purple-300 blur-3xl transform -translate-x-8 translate-y-8" />
        </div>
        <div className="relative flex items-center gap-4">
          <div className="p-3 md:p-4 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-lg">
            <Shield className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">Yönetim Paneli</h1>
            <p className="text-white/60 text-sm mt-0.5">Auren Lig • Admin Kontrol Merkezi</p>
          </div>
          <div className="ml-auto hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/80 text-xs font-semibold">Kralbaba12</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          {[
            { label: "Takım",   value: teams?.length ?? 0,   color: "from-yellow-400 to-orange-500" },
            { label: "Oyuncu",  value: players?.length ?? 0, color: "from-blue-400 to-cyan-500" },
            { label: "Maç",     value: matches?.length ?? 0, color: "from-green-400 to-emerald-500" },
            { label: "Üye",     value: users?.length ?? 0,   color: "from-pink-400 to-rose-500" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm p-3 text-center">
              <p className="text-2xl md:text-3xl font-black text-white">{s.value}</p>
              <p className="text-white/60 text-xs font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="teams" className="space-y-6">
        <TabsList className="bg-muted/60 p-1.5 rounded-2xl h-auto flex-wrap gap-1 border border-border/50">
          {[
            { value: "teams",    label: "Takımlar",         icon: Trophy,   count: teams?.length },
            { value: "players",  label: "Oyuncular",        icon: Users,    count: players?.length },
            { value: "fixtures", label: "Fikstür",          icon: Calendar, count: matches?.length },
            { value: "users",    label: "Üyeler",           icon: Shield,   count: users?.length },
            { value: "banned",   label: "Banlılar",         icon: Ban,      count: undefined },
          ].map(t => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-primary/30 font-semibold text-sm transition-all"
            >
              <t.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
              {t.count !== undefined && (
                <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1.5 data-[state=active]:bg-white/20 data-[state=active]:text-white">
                  {t.count}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="teams"><TeamsManager /></TabsContent>
        <TabsContent value="players"><PlayersManager /></TabsContent>
        <TabsContent value="fixtures"><FixturesManager /></TabsContent>
        <TabsContent value="users"><UsersManager /></TabsContent>
        <TabsContent value="banned"><BannedManager /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TEAMS MANAGER
═══════════════════════════════════════════════════════════ */
function TeamsManager() {
  const { teams, createTeam, deleteTeam, updateTeam } = useTeams();
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTeam) {
      updateTeam.mutate({ id: editingTeam.id, name, logoUrl }, {
        onSuccess: () => {
          setEditingTeam(null); setName(""); setLogoUrl("");
          toast({ title: "✅ Takım güncellendi" });
        }
      });
    } else {
      createTeam.mutate({ name, logoUrl }, {
        onSuccess: () => { setName(""); setLogoUrl(""); toast({ title: "✅ Takım eklendi" }); }
      });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Form */}
      <Card className="lg:col-span-2 border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-yellow-500/15">
              <Trophy className="w-5 h-5 text-yellow-500" />
            </div>
            <CardTitle className="text-lg">{editingTeam ? "Takımı Düzenle" : "Yeni Takım Ekle"}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Takım Adı</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Örn: Real Madrid"
                required
                className="rounded-xl border-border/60 focus:border-primary/50 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Logo URL (İsteğe Bağlı)</Label>
              <Input
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="rounded-xl border-border/60 focus:border-primary/50 h-11"
              />
            </div>
            {logoUrl && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/40">
                <img src={logoUrl} className="w-10 h-10 object-contain rounded-lg" alt="" onError={e => (e.currentTarget.style.display = "none")} />
                <span className="text-xs text-muted-foreground">Logo önizlemesi</span>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                disabled={createTeam.isPending || updateTeam.isPending}
                className="flex-1 rounded-xl h-11 font-bold shadow-md shadow-primary/20"
              >
                {editingTeam ? <><Edit2 className="w-4 h-4 mr-2" /> Güncelle</> : <><Plus className="w-4 h-4 mr-2" /> Takım Ekle</>}
              </Button>
              {editingTeam && (
                <Button type="button" variant="outline" className="rounded-xl h-11" onClick={() => { setEditingTeam(null); setName(""); setLogoUrl(""); }}>
                  İptal
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Team list */}
      <div className="lg:col-span-3 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">Mevcut Takımlar ({teams?.length ?? 0})</h3>
        </div>
        {teams?.length === 0 && (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Henüz takım eklenmedi</p>
          </div>
        )}
        {teams?.map((team, i) => (
          <div
            key={team.id}
            className="flex items-center gap-4 p-4 rounded-2xl border border-border/50 bg-card hover:border-primary/30 hover:shadow-md transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-muted/60 flex items-center justify-center text-xs font-black text-muted-foreground shrink-0">
              {i + 1}
            </div>
            {team.logoUrl
              ? <img src={team.logoUrl} className="w-10 h-10 object-contain rounded-xl shrink-0" alt="" />
              : <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-primary/50" />
                </div>
            }
            <div className="flex-1 min-w-0">
              <p className="font-bold truncate">{team.name}</p>
              <div className="flex gap-3 text-[11px] text-muted-foreground mt-0.5">
                <span>{team.points} puan</span>
                <span>•</span>
                <span>{team.played} maç</span>
                <span>•</span>
                <span>{team.wins}G {team.draws}B {team.losses}M</span>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl hover:bg-primary/10 hover:text-primary"
                onClick={() => { setEditingTeam(team); setName(team.name); setLogoUrl(team.logoUrl || ""); }}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-xl hover:bg-destructive/10 hover:text-destructive"
                onClick={() => deleteTeam.mutate(team.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PLAYERS MANAGER
═══════════════════════════════════════════════════════════ */
function PlayersManager() {
  const { teams } = useTeams();
  const { players, createPlayer, deletePlayer, updatePlayer } = usePlayers();
  const [newPlayerName, setNewPlayerName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTeam, setFilterTeam] = useState("all");
  const { toast } = useToast();

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;
    createPlayer.mutate({
      name: newPlayerName,
      teamId: parseInt(selectedTeamId),
      goals: 0, assists: 0,
      carabagCupGoals: 0, carabagCupAssists: 0,
      aurenLigCupGoals: 0, aurenLigCupAssists: 0,
      championsLeagueGoals: 0, championsLeagueAssists: 0,
      europaLeagueGoals: 0, europaLeagueAssists: 0,
      superCupGoals: 0, superCupAssists: 0,
      top8Goals: 0, top12Goals: 0, top16Goals: 0,
      cleanSheets: 0, yellowCards: 0, redCards: 0,
    }, {
      onSuccess: () => { setNewPlayerName(""); toast({ title: "✅ Oyuncu eklendi" }); }
    });
  };

  const filteredPlayers = players?.filter(p => {
    const teamName = teams?.find(t => t.id === p.teamId)?.name ?? "";
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || teamName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTeam = filterTeam === "all" || p.teamId === parseInt(filterTeam);
    return matchesSearch && matchesTeam;
  });

  const cupStatEntries = Object.entries(TOURNAMENT_STAT_FIELDS);

  return (
    <div className="space-y-6">
      {/* Add player + search row */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4">
            <form onSubmit={handleCreate} className="flex gap-3 items-end flex-wrap">
              <div className="space-y-1.5 flex-1 min-w-[120px]">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Takım</Label>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Takım seç..." /></SelectTrigger>
                  <SelectContent>
                    {teams?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 flex-1 min-w-[120px]">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Oyuncu Adı</Label>
                <Input value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)} className="h-10 rounded-xl" required />
              </div>
              <Button type="submit" disabled={createPlayer.isPending} className="h-10 rounded-xl px-5 shrink-0 shadow-md shadow-primary/20">
                <Plus className="w-4 h-4 mr-1" /> Ekle
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex gap-3 items-end h-full">
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Oyuncu Ara</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="İsim veya takım..." className="pl-9 h-10 rounded-xl" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Takım Filtrele</Label>
              <Select value={filterTeam} onValueChange={setFilterTeam}>
                <SelectTrigger className="h-10 rounded-xl w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {teams?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {filteredPlayers?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Oyuncu bulunamadı</p>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredPlayers?.map(player => {
          const team = teams?.find(t => t.id === player.teamId);
          return (
            <Card key={player.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              {/* Card header */}
              <div className="px-4 pt-4 pb-3 border-b border-border/40 bg-gradient-to-r from-primary/5 to-purple-500/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-primary/30">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Input
                      defaultValue={player.name}
                      onBlur={e => {
                        const val = e.target.value.trim();
                        if (val && val !== player.name) updatePlayer.mutate({ id: player.id, name: val });
                      }}
                      className="h-7 font-bold border-transparent bg-transparent hover:bg-muted/40 focus:bg-background px-1 rounded-lg text-sm"
                    />
                    <p className="text-xs text-muted-foreground px-1">{team?.name ?? "—"}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-lg hover:bg-destructive/10 hover:text-destructive shrink-0"
                    onClick={() => deletePlayer.mutate(player.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                {/* Takım seç */}
                <div className="mt-2">
                  <Select
                    defaultValue={String(player.teamId)}
                    onValueChange={val => updatePlayer.mutate({ id: player.id, teamId: parseInt(val) })}
                  >
                    <SelectTrigger className="h-8 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {teams?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <CardContent className="p-4 space-y-3">
                {/* Lig istatistikleri */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">⚽ Lig</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: "goals", label: "Gol", icon: "⚽" },
                      { key: "assists", label: "Asist", icon: "🎯" },
                      { key: "cleanSheets", label: "Gol Yememe", icon: "🧤" },
                    ].map(f => (
                      <div key={f.key} className="text-center space-y-1">
                        <Label className="text-[10px] text-muted-foreground">{f.label}</Label>
                        <Input
                          type="number"
                          min={0}
                          defaultValue={(player as any)[f.key]}
                          onBlur={e => updatePlayer.mutate({ id: player.id, [f.key]: parseInt(e.target.value) || 0 })}
                          className="h-8 text-center text-sm font-bold rounded-xl"
                        />
                      </div>
                    ))}
                    {[
                      { key: "yellowCards", label: "Sarı Kart", cls: "text-yellow-500" },
                      { key: "redCards",    label: "Kırmızı Kart", cls: "text-red-500" },
                    ].map(f => (
                      <div key={f.key} className="text-center space-y-1">
                        <Label className={`text-[10px] ${f.cls} font-semibold`}>{f.label}</Label>
                        <Input
                          type="number"
                          min={0}
                          defaultValue={(player as any)[f.key]}
                          onBlur={e => updatePlayer.mutate({ id: player.id, [f.key]: parseInt(e.target.value) || 0 })}
                          className="h-8 text-center text-sm font-bold rounded-xl"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kupa istatistikleri */}
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-yellow-500">🏆 Kupalar</p>
                  {cupStatEntries.map(([, { goalsKey, assistsKey, label }]) => (
                    <div key={goalsKey} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-20 shrink-0 truncate">{label}</span>
                      <div className="flex gap-1.5 flex-1">
                        <div className="space-y-0.5 flex-1">
                          <Label className="text-[9px] text-muted-foreground">Gol</Label>
                          <Input
                            type="number" min={0}
                            defaultValue={(player as any)[goalsKey] || 0}
                            onBlur={e => updatePlayer.mutate({ id: player.id, [goalsKey]: parseInt(e.target.value) || 0 })}
                            className="h-7 text-center text-xs rounded-lg"
                          />
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <Label className="text-[9px] text-muted-foreground">Asist</Label>
                          <Input
                            type="number" min={0}
                            defaultValue={(player as any)[assistsKey] || 0}
                            onBlur={e => updatePlayer.mutate({ id: player.id, [assistsKey]: parseInt(e.target.value) || 0 })}
                            className="h-7 text-center text-xs rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FIXTURES MANAGER
═══════════════════════════════════════════════════════════ */
function FixturesManager() {
  const { teams } = useTeams();
  const { matches, createMatch, updateMatchScore, deleteMatch } = useMatches();
  const [homeTeam, setHomeTeam] = useState("");
  const [awayTeam, setAwayTeam] = useState("");
  const [week, setWeek] = useState("1");
  const [date, setDate] = useState("");
  const [tournament, setTournament] = useState("league");
  const [round, setRound] = useState("group_stage");
  const [filterTournament, setFilterTournament] = useState("all");
  const { toast } = useToast();

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
      onSuccess: () => { setHomeTeam(""); setAwayTeam(""); toast({ title: "✅ Maç oluşturuldu" }); }
    });
  };

  const getMatchLabel = (match: any) => {
    if (match.tournament === "league") return match.week != null ? `${match.week}. Hafta` : "Lig";
    const tLabel = TOURNAMENT_LABELS[match.tournament] || match.tournament;
    const rLabel = match.round ? (ROUND_LABELS[match.round] || match.round) : "";
    return rLabel ? `${tLabel} — ${rLabel}` : tLabel;
  };

  const filtered = filterTournament === "all"
    ? matches
    : matches?.filter(m => m.tournament === filterTournament);

  const played = filtered?.filter(m => m.isPlayed).length ?? 0;
  const upcoming = (filtered?.length ?? 0) - played;

  return (
    <div className="space-y-6">
      {/* Create match */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-green-500/15">
              <Plus className="w-5 h-5 text-green-500" />
            </div>
            <CardTitle className="text-lg">Maç Oluştur</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Turnuva</Label>
              <Select value={tournament} onValueChange={setTournament}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_TOURNAMENTS.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {tournament === "league" ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hafta</Label>
                <Input type="number" value={week} onChange={e => setWeek(e.target.value)} min={1} required className="h-10 rounded-xl" />
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tur</Label>
                <Select value={round} onValueChange={setRound}>
                  <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ALL_ROUNDS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ev Sahibi</Label>
              <Select value={homeTeam} onValueChange={setHomeTeam}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Seç..." /></SelectTrigger>
                <SelectContent>
                  {teams?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deplasman</Label>
              <Select value={awayTeam} onValueChange={setAwayTeam}>
                <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Seç..." /></SelectTrigger>
                <SelectContent>
                  {teams?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tarih</Label>
              <Input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} className="h-10 rounded-xl text-xs" />
            </div>

            <Button type="submit" disabled={createMatch.isPending} className="h-10 rounded-xl font-bold shadow-md shadow-primary/20">
              <Plus className="w-4 h-4 mr-1" /> Oluştur
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Filter + stats */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3">
          <div className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold">
            ✅ {played} Oynandı
          </div>
          <div className="px-4 py-2 rounded-xl bg-muted/60 border border-border/50 text-muted-foreground text-xs font-bold">
            📅 {upcoming} Bekliyor
          </div>
        </div>
        <Select value={filterTournament} onValueChange={setFilterTournament}>
          <SelectTrigger className="h-9 rounded-xl w-48 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Turnuvalar</SelectItem>
            {ALL_TOURNAMENTS.map(t => <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Match list */}
      {filtered?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Maç bulunamadı</p>
        </div>
      )}
      <div className="space-y-3">
        {filtered?.map(match => (
          <MatchEditCard
            key={`${match.id}-${match.homeScore}-${match.awayScore}-${match.videoUrl}`}
            match={match}
            teams={teams}
            getMatchLabel={getMatchLabel}
            onSave={(homeScore, awayScore, videoUrl) =>
              updateMatchScore.mutate({ id: match.id, homeScore, awayScore, videoUrl: videoUrl || undefined },
              { onSuccess: () => toast({ title: "✅ Skor kaydedildi" }) })
            }
            onDelete={() => deleteMatch.mutate(match.id)}
          />
        ))}
      </div>
    </div>
  );
}

function MatchEditCard({ match, teams, getMatchLabel, onSave, onDelete }: {
  match: any; teams: any; getMatchLabel: (m: any) => string;
  onSave: (home: number, away: number, video: string) => void;
  onDelete: () => void;
}) {
  const [homeScore, setHomeScore] = useState<string>(match.homeScore != null ? String(match.homeScore) : "");
  const [awayScore, setAwayScore] = useState<string>(match.awayScore != null ? String(match.awayScore) : "");
  const [videoUrl, setVideoUrl] = useState<string>(match.videoUrl ?? "");

  const homeTeam = teams?.find((t: any) => t.id === match.homeTeamId);
  const awayTeam = teams?.find((t: any) => t.id === match.awayTeamId);
  const isPlayed = match.isPlayed;

  return (
    <div className={`rounded-2xl border ${isPlayed ? "border-green-500/20 bg-green-500/5" : "border-border/50 bg-card"} p-4 transition-all hover:shadow-md`}>
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        {/* Label badge */}
        <div className="flex items-center gap-2 shrink-0">
          {isPlayed
            ? <CheckCircle className="w-4 h-4 text-green-500" />
            : <Calendar className="w-4 h-4 text-muted-foreground" />
          }
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${isPlayed ? "bg-green-500/15 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
            {getMatchLabel(match)}
          </span>
        </div>

        {/* Score section */}
        <div className="flex-1 flex items-center gap-3 justify-center min-w-0">
          {/* Home team */}
          <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
            {homeTeam?.logoUrl && <img src={homeTeam.logoUrl} className="w-7 h-7 object-contain rounded shrink-0" alt="" />}
            <span className="font-bold text-sm truncate">{homeTeam?.name}</span>
          </div>
          {/* Score inputs */}
          <div className="flex items-center gap-2 shrink-0">
            <Input
              type="number" min={0}
              className="w-14 h-10 text-center text-lg font-black rounded-xl border-border/60"
              value={homeScore}
              onChange={e => setHomeScore(e.target.value)}
            />
            <span className="text-muted-foreground font-black text-lg">:</span>
            <Input
              type="number" min={0}
              className="w-14 h-10 text-center text-lg font-black rounded-xl border-border/60"
              value={awayScore}
              onChange={e => setAwayScore(e.target.value)}
            />
          </div>
          {/* Away team */}
          <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
            <span className="font-bold text-sm truncate">{awayTeam?.name}</span>
            {awayTeam?.logoUrl && <img src={awayTeam.logoUrl} className="w-7 h-7 object-contain rounded shrink-0" alt="" />}
          </div>
        </div>

        {/* Video + actions */}
        <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto">
          <Input
            placeholder="📹 Video URL..."
            className="h-9 rounded-xl text-xs lg:w-44"
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
          />
          <Button
            size="sm"
            className="h-9 rounded-xl px-4 font-bold shadow-sm"
            onClick={() => {
              if (homeScore === "" || awayScore === "") return;
              onSave(parseInt(homeScore), parseInt(awayScore), videoUrl);
            }}
          >
            <Save className="w-3.5 h-3.5" />
          </Button>
          <Button variant="destructive" size="sm" className="h-9 rounded-xl" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   USERS MANAGER
═══════════════════════════════════════════════════════════ */
function UsersManager() {
  const { data: users, isLoading } = useQuery<any[]>({ queryKey: ["/api/admin/users"] });
  const { toast } = useToast();
  const [search, setSearch] = useState("");

  const deleteUser = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "✅ Üye silindi" }); }
  });

  const updateUser = useMutation({
    mutationFn: ({ id, ...updates }: any) => apiRequest("PATCH", `/api/admin/users/${id}`, updates),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "✅ Güncellendi" }); }
  });

  const banUser = useMutation({
    mutationFn: (identifier: string) => apiRequest("POST", "/api/chat/ban", { identifier }),
    onSuccess: () => toast({ title: "🔨 Kullanıcı banlandı" })
  });

  const filtered = users?.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Kullanıcı ara..." className="pl-9 h-10 rounded-xl" />
        </div>
        <Badge variant="secondary" className="px-3 py-1.5 text-sm">
          {filtered?.length ?? 0} üye
        </Badge>
      </div>

      {(!filtered || filtered.length === 0) && (
        <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Kayıtlı üye bulunamadı</p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered?.map(u => (
          <Card key={u.id} className="border-border/50 shadow-sm hover:shadow-md transition-all overflow-hidden">
            <div className="p-4 border-b border-border/40 bg-gradient-to-r from-muted/30 to-transparent">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-border/50 shadow-sm">
                  <AvatarImage src={u.avatarUrl || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-purple-500/20 font-black text-primary">
                    {u.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-bold truncate">{u.username}</p>
                  <p className="text-xs text-muted-foreground truncate">{u.bio || "Biyografi yok"}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl hover:bg-destructive/10 hover:text-destructive shrink-0"
                  onClick={() => {
                    if (confirm(`${u.username} silinsin mi?`)) deleteUser.mutate(u.id);
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Profil Fotoğrafı URL</Label>
                <div className="flex gap-2">
                  <Input defaultValue={u.avatarUrl || ""} id={`pp-${u.id}`} className="h-8 text-xs rounded-xl" />
                  <Button size="icon" className="h-8 w-8 rounded-xl shrink-0" onClick={() => {
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
                  className="flex-1 text-xs rounded-xl h-8"
                  onClick={() => {
                    const newName = prompt("Yeni kullanıcı adı:", u.username);
                    if (newName && newName !== u.username) updateUser.mutate({ id: u.id, username: newName });
                  }}
                >
                  <Edit2 className="w-3 h-3 mr-1.5" /> İsim Değiştir
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 text-xs rounded-xl h-8"
                  onClick={() => {
                    if (confirm(`${u.username} banlanacak. Emin misiniz?`)) banUser.mutate(u.username);
                  }}
                >
                  <Ban className="w-3 h-3 mr-1.5" /> Banla
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   BANNED MANAGER
═══════════════════════════════════════════════════════════ */
function BannedManager() {
  const { toast } = useToast();
  const [banInput, setBanInput] = useState("");

  const { data: bannedList = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/chat/banned"],
  });

  const banUser = useMutation({
    mutationFn: (identifier: string) => apiRequest("POST", "/api/chat/ban", { identifier }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/banned"] });
      setBanInput("");
      toast({ title: "🔨 Kullanıcı banlandı" });
    }
  });

  const unbanUser = useMutation({
    mutationFn: (identifier: string) => apiRequest("DELETE", "/api/chat/ban", { identifier }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/banned"] });
      toast({ title: "✅ Ban kaldırıldı" });
    }
  });

  return (
    <div className="space-y-6">
      <Card className="border-red-500/20 bg-red-500/5 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/15">
              <Ban className="w-5 h-5 text-red-500" />
            </div>
            <CardTitle className="text-lg text-red-500">Kullanıcı Banla</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={banInput}
              onChange={e => setBanInput(e.target.value)}
              placeholder="Kullanıcı adı veya IP adresi..."
              className="rounded-xl h-11 border-red-500/30 focus:border-red-500/60"
              onKeyDown={e => { if (e.key === "Enter" && banInput.trim()) banUser.mutate(banInput.trim()); }}
            />
            <Button
              variant="destructive"
              className="h-11 rounded-xl px-5 font-bold"
              disabled={!banInput.trim() || banUser.isPending}
              onClick={() => banUser.mutate(banInput.trim())}
            >
              <UserX className="w-4 h-4 mr-2" /> Banla
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wide">Banlı Kullanıcılar</h3>
          <Badge variant="destructive" className="text-xs">{bannedList.length}</Badge>
        </div>

        {isLoading && <div className="text-center py-12 text-muted-foreground">Yükleniyor...</div>}

        {!isLoading && bannedList.length === 0 && (
          <div className="text-center py-16 text-muted-foreground border-2 border-dashed border-border/50 rounded-2xl">
            <CheckCircle className="w-10 h-10 mx-auto mb-3 opacity-20 text-green-500" />
            <p className="text-sm">Banlı kullanıcı yok</p>
          </div>
        )}

        <div className="space-y-2">
          {bannedList.map((b: any) => (
            <div key={b.id} className="flex items-center gap-4 p-4 rounded-2xl border border-red-500/20 bg-red-500/5">
              <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                <UserX className="w-4 h-4 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{b.identifier}</p>
                <p className="text-xs text-muted-foreground">
                  {b.reason || "Sebep belirtilmedi"} •{" "}
                  {b.bannedAt ? new Date(b.bannedAt).toLocaleDateString("tr-TR") : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl h-8 text-xs hover:bg-green-500/10 hover:text-green-500 border border-border/50"
                onClick={() => unbanUser.mutate(b.identifier)}
              >
                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Ban Kaldır
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
