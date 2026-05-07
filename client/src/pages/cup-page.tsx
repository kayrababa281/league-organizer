import { usePlayers } from "@/hooks/use-players";
import { useMatches } from "@/hooks/use-matches";
import { useTeams } from "@/hooks/use-teams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy } from "lucide-react";
import { TOURNAMENT_LABELS, ROUND_LABELS } from "@shared/schema";

const CUP_GOALS_KEY: Record<string, keyof import("@shared/schema").Player> = {
  carabag_cup: "carabagCupGoals",
  auren_lig_cup: "aurenLigCupGoals",
  champions_league: "championsLeagueGoals",
  europa_league: "europaLeagueGoals",
  super_cup: "superCupGoals",
  top_8: "top8Goals",
  top_12: "top12Goals",
  top_16: "top16Goals",
};

interface CupPageProps {
  tournament: string;
}

export default function CupPage({ tournament }: CupPageProps) {
  const { players, isLoading: playersLoading } = usePlayers();
  const { matches, isLoading: matchesLoading } = useMatches();
  const { teams, isLoading: teamsLoading } = useTeams();

  if (playersLoading || matchesLoading || teamsLoading) {
    return <div className="p-8 text-center animate-pulse">Yükleniyor...</div>;
  }

  const cupMatches = (matches || []).filter(m => m.tournament === tournament);
  const goalsKey = CUP_GOALS_KEY[tournament];
  const title = TOURNAMENT_LABELS[tournament] || tournament;

  const topScorers = [...(players || [])]
    .filter(p => goalsKey && (p[goalsKey] as number) > 0)
    .sort((a, b) => ((b[goalsKey] as number) || 0) - ((a[goalsKey] as number) || 0))
    .slice(0, 10);

  // Group matches by round
  const roundOrder = ["group_stage", "round_of_16", "round_of_12", "round_of_8", "quarter_final", "semi_final", "final"];
  const matchesByRound = roundOrder.reduce((acc, r) => {
    const rMatches = cupMatches.filter(m => m.round === r);
    if (rMatches.length > 0) acc[r] = rMatches;
    return acc;
  }, {} as Record<string, typeof cupMatches>);

  const noRoundMatches = cupMatches.filter(m => !m.round || !roundOrder.includes(m.round));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Trophy className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-black font-display text-primary">{title}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Scorers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Gol Krallığı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Oyuncu</TableHead>
                  <TableHead>Takım</TableHead>
                  <TableHead className="text-right">Gol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topScorers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Henüz gol kaydedilmedi.
                    </TableCell>
                  </TableRow>
                ) : topScorers.map((player, idx) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-bold text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-semibold">{player.name}</TableCell>
                    <TableCell className="text-muted-foreground">{teams?.find(t => t.id === player.teamId)?.name}</TableCell>
                    <TableCell className="text-right font-black text-primary text-lg">{player[goalsKey] as number}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Matches */}
        <Card>
          <CardHeader>
            <CardTitle>Maçlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {cupMatches.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">Henüz maç eklenmedi.</div>
            ) : (
              <>
                {Object.entries(matchesByRound).map(([round, roundMatches]) => (
                  <div key={round} className="space-y-2">
                    <div className="text-xs font-bold text-primary uppercase tracking-widest border-b pb-1 mb-2">
                      {ROUND_LABELS[round] || round}
                    </div>
                    {roundMatches.map(match => (
                      <MatchCard key={match.id} match={match} teams={teams} />
                    ))}
                  </div>
                ))}
                {noRoundMatches.map(match => (
                  <MatchCard key={match.id} match={match} teams={teams} />
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MatchCard({ match, teams }: { match: any; teams: any }) {
  const home = teams?.find((t: any) => t.id === match.homeTeamId);
  const away = teams?.find((t: any) => t.id === match.awayTeamId);
  return (
    <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
      <div className="flex-1 text-right font-semibold text-sm truncate">{home?.name}</div>
      <div className="px-3 py-1 font-black text-base bg-background rounded-md shadow-sm min-w-[70px] text-center shrink-0">
        {match.isPlayed ? `${match.homeScore} - ${match.awayScore}` : "- v -"}
      </div>
      <div className="flex-1 text-left font-semibold text-sm truncate">{away?.name}</div>
    </div>
  );
}
