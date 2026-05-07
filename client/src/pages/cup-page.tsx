import { usePlayers } from "@/hooks/use-players";
import { useMatches } from "@/hooks/use-matches";
import { useTeams } from "@/hooks/use-teams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Video, CheckCircle2, Clock, Medal } from "lucide-react";
import { TOURNAMENT_LABELS, ROUND_LABELS } from "@shared/schema";

const CUP_KEYS: Record<string, { goals: string; assists: string }> = {
  carabag_cup:      { goals: "carabagCupGoals",      assists: "carabagCupAssists" },
  auren_lig_cup:    { goals: "aurenLigCupGoals",     assists: "aurenLigCupAssists" },
  champions_league: { goals: "championsLeagueGoals", assists: "championsLeagueAssists" },
  europa_league:    { goals: "europaLeagueGoals",    assists: "europaLeagueAssists" },
  super_cup:        { goals: "superCupGoals",        assists: "superCupAssists" },
};

const MEDALS = [
  { bg: "bg-yellow-400", text: "text-yellow-900" },
  { bg: "bg-slate-300",  text: "text-slate-800"  },
  { bg: "bg-amber-600",  text: "text-amber-100"  },
];

const ROUND_ORDER = ["group_stage", "round_of_16", "round_of_12", "round_of_8", "quarter_final", "semi_final", "final"];

interface CupPageProps {
  tournament: string;
}

export default function CupPage({ tournament }: CupPageProps) {
  const { players, isLoading: playersLoading } = usePlayers();
  const { matches, isLoading: matchesLoading } = useMatches();
  const { teams, isLoading: teamsLoading } = useTeams();

  if (playersLoading || matchesLoading || teamsLoading) {
    return <div className="p-8 text-center animate-pulse text-muted-foreground">Yükleniyor...</div>;
  }

  const keys = CUP_KEYS[tournament];
  const title = TOURNAMENT_LABELS[tournament] || tournament;
  const cupMatches = (matches || []).filter(m => m.tournament === tournament);

  const getTeamName = (id: number) => teams?.find(t => t.id === id)?.name || "-";

  const topScorers = [...(players || [])]
    .filter(p => keys && (p as any)[keys.goals] > 0)
    .sort((a, b) => (b as any)[keys.goals] - (a as any)[keys.goals])
    .slice(0, 10);

  const topAssisters = [...(players || [])]
    .filter(p => keys && (p as any)[keys.assists] > 0)
    .sort((a, b) => (b as any)[keys.assists] - (a as any)[keys.assists])
    .slice(0, 10);

  const matchesByRound = ROUND_ORDER.reduce((acc, r) => {
    const rMatches = cupMatches.filter(m => m.round === r);
    if (rMatches.length > 0) acc[r] = rMatches;
    return acc;
  }, {} as Record<string, typeof cupMatches>);

  const noRoundMatches = cupMatches.filter(m => !m.round || !ROUND_ORDER.includes(m.round));

  return (
    <div className="space-y-8 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 glow-primary-sm">
          <Trophy className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-black font-display text-primary">{title}</h1>
      </div>

      {/* Stats: Gol + Asist yan yana */}
      <div className="grid gap-5 lg:grid-cols-2">
        <StatsTable
          title="Gol Krallığı"
          players={topScorers}
          valueKey={keys?.goals}
          unit="Gol"
          icon={<Trophy className="w-4 h-4 text-yellow-500" />}
          getTeamName={getTeamName}
        />
        <StatsTable
          title="Asist Krallığı"
          players={topAssisters}
          valueKey={keys?.assists}
          unit="Asist"
          icon={<Medal className="w-4 h-4 text-blue-400" />}
          getTeamName={getTeamName}
        />
      </div>

      {/* Matches */}
      <Card className="card-glass border-border/50 shadow-xl">
        <CardHeader className="border-b border-border/30">
          <CardTitle className="text-lg">Maçlar</CardTitle>
        </CardHeader>
        <CardContent className="pt-5 space-y-6">
          {cupMatches.length === 0 ? (
            <div className="text-center text-muted-foreground py-10">Henüz maç eklenmedi.</div>
          ) : (
            <>
              {Object.entries(matchesByRound).map(([round, roundMatches]) => (
                <div key={round} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest">
                      {ROUND_LABELS[round] || round}
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {roundMatches.map(match => <MatchCard key={match.id} match={match} teams={teams} />)}
                  </div>
                </div>
              ))}
              {noRoundMatches.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {noRoundMatches.map(match => <MatchCard key={match.id} match={match} teams={teams} />)}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatsTable({ title, players, valueKey, unit, icon, getTeamName }: {
  title: string;
  players: any[];
  valueKey: string;
  unit: string;
  icon: React.ReactNode;
  getTeamName: (id: number) => string;
}) {
  return (
    <Card className="card-glass border-border/50 shadow-xl">
      <CardHeader className="flex flex-row items-center gap-2 pb-3 border-b border-border/30">
        {icon}
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-3 p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 pl-4">#</TableHead>
              <TableHead>Oyuncu</TableHead>
              <TableHead>Takım</TableHead>
              <TableHead className="text-right pr-4 font-bold">{unit}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Henüz kayıt yok.
                </TableCell>
              </TableRow>
            ) : players.map((player, idx) => {
              const m = MEDALS[idx];
              return (
                <TableRow key={player.id} className="hover:bg-primary/5 transition-colors">
                  <TableCell className="pl-4">
                    {m ? (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${m.bg} ${m.text}`}>
                        {idx + 1}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground pl-1">{idx + 1}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold">{player.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{getTeamName(player.teamId)}</TableCell>
                  <TableCell className="text-right pr-4 font-black text-primary text-lg tabular-nums">
                    {(player as any)[valueKey]}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function MatchCard({ match, teams }: { match: any; teams: any }) {
  const home = teams?.find((t: any) => t.id === match.homeTeamId);
  const away = teams?.find((t: any) => t.id === match.awayTeamId);
  const played = match.isPlayed;

  return (
    <div className={`
      relative overflow-hidden rounded-2xl border transition-all duration-200
      hover:-translate-y-0.5 hover:shadow-lg
      ${played ? "border-primary/20 bg-card" : "border-border/40 bg-card"}
    `}>
      {played && <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />}

      {/* Match row */}
      <div className="flex items-center gap-2 px-4 py-3.5">
        {/* Home */}
        <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
          <span className="font-bold text-sm truncate">{home?.name}</span>
          {home?.logoUrl
            ? <img src={home.logoUrl} className="w-7 h-7 object-contain shrink-0 drop-shadow" alt="" />
            : <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary shrink-0">{home?.name?.substring(0,2).toUpperCase()}</div>
          }
        </div>

        {/* Score */}
        {played ? (
          <div className="bg-primary text-primary-foreground font-black text-base px-3 py-1.5 rounded-xl tabular-nums shadow glow-primary-sm shrink-0">
            {match.homeScore} <span className="opacity-50">·</span> {match.awayScore}
          </div>
        ) : (
          <div className="bg-muted text-muted-foreground font-bold text-sm px-3 py-1.5 rounded-xl tracking-widest shrink-0">
            VS
          </div>
        )}

        {/* Away */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          {away?.logoUrl
            ? <img src={away.logoUrl} className="w-7 h-7 object-contain shrink-0 drop-shadow" alt="" />
            : <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary shrink-0">{away?.name?.substring(0,2).toUpperCase()}</div>
          }
          <span className="font-bold text-sm truncate">{away?.name}</span>
        </div>

        {/* Video */}
        {match.videoUrl && (
          <a href={match.videoUrl} target="_blank" rel="noreferrer"
            className="shrink-0 text-primary hover:text-primary/70 bg-primary/10 p-1.5 rounded-lg transition-colors">
            <Video className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}
