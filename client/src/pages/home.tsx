import { useTeams } from "@/hooks/use-teams";
import { usePlayers } from "@/hooks/use-players";
import { useMatches } from "@/hooks/use-matches";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Flame, Calendar, Video, Shield, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { TOURNAMENT_LABELS, ROUND_LABELS } from "@shared/schema";

export default function Home() {
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { matches } = useMatches();

  const sortedTeams = [...(teams || [])].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = a.goalsFor - a.goalsAgainst;
    const diffB = b.goalsFor - b.goalsAgainst;
    if (diffB !== diffA) return diffB - diffA;
    return b.goalsFor - a.goalsFor;
  });

  const leader = sortedTeams[0];
  const topScorer     = [...(players || [])].filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals)[0];
  const topAssister   = [...(players || [])].filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists)[0];
  const topCleanSheet = [...(players || [])].filter(p => p.cleanSheets > 0).sort((a, b) => b.cleanSheets - a.cleanSheets)[0];

  const recentMatches = [...(matches || [])].filter(m => m.isPlayed).sort((a, b) => b.id - a.id).slice(0, 3);
  const upcomingMatches = [...(matches || [])].filter(m => !m.isPlayed).slice(0, 3);

  const currentWeek = (matches || [])
    .filter(m => m.isPlayed && m.tournament === "league" && m.week != null)
    .reduce((max, m) => (m.week! > max ? m.week! : max), 0) || 1;

  return (
    <div className="space-y-8 animate-slide-up">

      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl shadow-2xl">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-700 to-violet-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.07),transparent_60%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-5 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-sm font-semibold border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Sezon 2025/26 · Aktif
            </div>
            <div>
              <p className="text-white/60 text-sm font-medium uppercase tracking-widest mb-1">Güncel Hafta</p>
              <h1 className="text-6xl md:text-8xl font-black font-display tracking-tighter text-white leading-none">
                {currentWeek}<span className="text-white/30 text-4xl md:text-5xl">.HFT</span>
              </h1>
            </div>
            <p className="text-white/60 max-w-sm text-sm leading-relaxed">
              Auren League heyecanı devam ediyor. Liderlik mücadelesi kızışırken haftanın maçlarını kaçırma.
            </p>
          </div>

          {leader ? (
            <div className="flex flex-col items-center gap-3 bg-white/10 backdrop-blur-md p-7 rounded-2xl border border-white/10 min-w-[180px] shine">
              <div className="text-xs font-black tracking-widest text-white/50 uppercase">Lider</div>
              {leader.logoUrl ? (
                <img src={leader.logoUrl} alt={leader.name} className="w-20 h-20 object-contain drop-shadow-2xl" />
              ) : (
                <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
                  <Trophy className="w-10 h-10 text-yellow-400" />
                </div>
              )}
              <div className="text-center">
                <h2 className="text-xl font-black text-white">{leader.name}</h2>
                <div className="text-4xl font-black text-yellow-400 tabular-nums mt-1">{leader.points}</div>
                <div className="text-xs text-white/40 font-medium mt-0.5">Puan</div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 bg-white/10 backdrop-blur-md p-7 rounded-2xl border border-white/10 min-w-[180px]">
              <Trophy className="w-12 h-12 text-yellow-400/50" />
              <p className="text-white/40 text-sm text-center">Henüz takım yok</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 stagger">
        <StatCard
          title="GOL KRALI"
          player={topScorer}
          value={topScorer?.goals}
          unit="Gol"
          icon={<Flame className="w-5 h-5 text-orange-400" />}
          iconBg="bg-orange-500/10"
          teamName={teams?.find(t => t.id === topScorer?.teamId)?.name}
          accentColor="text-orange-400"
        />
        <StatCard
          title="ASİST KRALI"
          player={topAssister}
          value={topAssister?.assists}
          unit="Asist"
          icon={<Medal className="w-5 h-5 text-blue-400" />}
          iconBg="bg-blue-500/10"
          teamName={teams?.find(t => t.id === topAssister?.teamId)?.name}
          accentColor="text-blue-400"
        />
        <StatCard
          title="GOL YENMEYEN"
          player={topCleanSheet}
          value={topCleanSheet?.cleanSheets}
          unit="Maç"
          icon={<Shield className="w-5 h-5 text-emerald-400" />}
          iconBg="bg-emerald-500/10"
          teamName={teams?.find(t => t.id === topCleanSheet?.teamId)?.name}
          accentColor="text-emerald-400"
        />
      </div>

      {/* Recent matches */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-black font-display">Son Oynanan Maçlar</h2>
        </div>
        {recentMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger">
            {recentMatches.map(match => <MatchCard key={match.id} match={match} teams={teams} played />)}
          </div>
        ) : (
          <EmptyState icon={<CheckCircle2 className="w-8 h-8" />} text="Henüz oynanmış maç yok." />
        )}
      </div>

      {/* Upcoming matches */}
      {upcomingMatches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-black font-display">Yaklaşan Maçlar</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger">
            {upcomingMatches.map(match => <MatchCard key={match.id} match={match} teams={teams} played={false} />)}
          </div>
        </div>
      )}

      {/* Mini table - top 5 */}
      {sortedTeams.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-black font-display">Puan Durumu</h2>
          </div>
          <Card className="card-glass border-border/50 shadow-xl overflow-hidden">
            <CardContent className="p-0">
              {sortedTeams.slice(0, 5).map((team, i) => {
                const gd = team.goalsFor - team.goalsAgainst;
                const medals = ["bg-yellow-400 text-yellow-900", "bg-slate-300 text-slate-800", "bg-amber-600 text-amber-100"];
                return (
                  <div key={team.id} className="flex items-center gap-4 px-5 py-3.5 border-b border-border/20 last:border-0 hover:bg-muted/20 transition-colors group">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${medals[i] || "bg-muted text-muted-foreground"}`}>
                      {i + 1}
                    </div>
                    {team.logoUrl
                      ? <img src={team.logoUrl} className="w-7 h-7 object-contain shrink-0" alt="" />
                      : <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary shrink-0">{team.name.substring(0, 2).toUpperCase()}</div>
                    }
                    <span className="font-bold text-sm flex-1 truncate">{team.name}</span>
                    <span className={`text-xs font-medium tabular-nums ${gd > 0 ? "text-emerald-500" : gd < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                      {gd > 0 ? `+${gd}` : gd} AV
                    </span>
                    <span className="text-xl font-black text-primary tabular-nums w-8 text-right">{team.points}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, player, value, unit, icon, iconBg, teamName, accentColor }: any) {
  if (!player) return (
    <Card className="card-glass border-border/50 p-6 flex items-center justify-center min-h-[120px]">
      <p className="text-sm text-muted-foreground/50 text-center">Henüz istatistik yok</p>
    </Card>
  );
  return (
    <Card className="card-glass border-border/50 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-2.5 rounded-xl ${iconBg}`}>{icon}</div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{title}</span>
        </div>
        <div className="space-y-0.5 mb-3">
          <div className="font-black text-lg leading-tight">{player.name}</div>
          <div className="text-xs text-muted-foreground">{teamName}</div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className={`text-5xl font-black tabular-nums leading-none ${accentColor}`}>{value}</span>
          <span className="text-sm text-muted-foreground font-medium">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function MatchCard({ match, teams, played }: { match: any; teams: any; played: boolean }) {
  const home = teams?.find((t: any) => t.id === match.homeTeamId);
  const away = teams?.find((t: any) => t.id === match.awayTeamId);
  const matchLabel = match.tournament === "league" && match.week != null
    ? `${match.week}. Hafta`
    : match.round
      ? `${TOURNAMENT_LABELS[match.tournament] || match.tournament} · ${ROUND_LABELS[match.round] || match.round}`
      : TOURNAMENT_LABELS[match.tournament] || match.tournament;

  return (
    <div className={`
      relative overflow-hidden rounded-2xl border transition-all duration-300
      hover:-translate-y-0.5 hover:shadow-xl group
      ${played
        ? "border-primary/20 bg-card hover:border-primary/40 hover:shadow-primary/10"
        : "border-border/40 bg-card hover:border-border/70"}
    `}>
      {played && <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/20 bg-muted/20">
        <span className="text-[11px] font-semibold text-muted-foreground">{matchLabel}</span>
        {match.videoUrl && (
          <a href={match.videoUrl} target="_blank" rel="noreferrer" className="text-[11px] text-primary flex items-center gap-1 font-bold hover:opacity-80">
            <Video className="w-3 h-3" /> İzle
          </a>
        )}
      </div>
      <div className="p-4 flex items-center gap-3">
        <div className="flex-1 text-center">
          {home?.logoUrl
            ? <img src={home.logoUrl} className="w-9 h-9 object-contain mx-auto mb-1 drop-shadow" alt="" />
            : <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary mx-auto mb-1">{home?.name?.substring(0,2).toUpperCase()}</div>
          }
          <div className="text-sm font-bold leading-tight truncate">{home?.name}</div>
        </div>
        {played ? (
          <div className="text-2xl font-black bg-primary/10 border border-primary/20 rounded-xl px-4 py-2 tabular-nums text-primary shrink-0">
            {match.homeScore} <span className="text-primary/30">·</span> {match.awayScore}
          </div>
        ) : (
          <div className="text-sm font-black bg-muted rounded-xl px-4 py-2 text-muted-foreground shrink-0 tracking-widest">
            VS
          </div>
        )}
        <div className="flex-1 text-center">
          {away?.logoUrl
            ? <img src={away.logoUrl} className="w-9 h-9 object-contain mx-auto mb-1 drop-shadow" alt="" />
            : <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary mx-auto mb-1">{away?.name?.substring(0,2).toUpperCase()}</div>
          }
          <div className="text-sm font-bold leading-tight truncate">{away?.name}</div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="text-center py-14 text-muted-foreground/30 border border-dashed border-border/30 rounded-2xl">
      <div className="mx-auto mb-3 w-fit">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}
