import { usePlayers } from "@/hooks/use-players";
import { useMatches } from "@/hooks/use-matches";
import { useTeams } from "@/hooks/use-teams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function CarabagCup() {
  const { players, isLoading: playersLoading } = usePlayers();
  const { matches, isLoading: matchesLoading } = useMatches();
  const { teams, isLoading: teamsLoading } = useTeams();

  if (playersLoading || matchesLoading || teamsLoading) return <div>Yükleniyor...</div>;

  const cupMatches = matches?.filter(m => m.tournament === "carabag_cup") || [];
  
  // Get top scorers for this cup
  const topScorers = [...(players || [])]
    .filter(p => (p.carabagCupGoals || 0) > 0)
    .sort((a, b) => (b.carabagCupGoals || 0) - (a.carabagCupGoals || 0))
    .slice(0, 10);

  const getRoundName = (round: string | null) => {
    if (round === "quarter_final") return "Çeyrek Final";
    if (round === "semi_final") return "Yarı Final";
    if (round === "final") return "Final";
    return round;
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-black font-display text-primary">Carabağ Cup</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Gol Krallığı</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Oyuncu</TableHead>
                  <TableHead>Takım</TableHead>
                  <TableHead className="text-right">Gol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topScorers.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center">Henüz gol yok.</TableCell></TableRow>
                ) : topScorers.map((player, idx) => (
                  <TableRow key={player.id}>
                    <TableCell className="font-medium">{idx + 1}</TableCell>
                    <TableCell>{player.name}</TableCell>
                    <TableCell>{teams?.find(t => t.id === player.teamId)?.name}</TableCell>
                    <TableCell className="text-right font-bold">{player.carabagCupGoals}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Maçlar</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {cupMatches.length === 0 ? (
              <div className="text-center text-muted-foreground">Henüz maç yok.</div>
            ) : cupMatches.map(match => (
              <div key={match.id} className="flex flex-col gap-2 p-3 border rounded-lg bg-muted/30">
                <div className="text-xs font-bold text-center text-primary uppercase tracking-wider">
                  {getRoundName(match.round)}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-right font-semibold">{teams?.find(t => t.id === match.homeTeamId)?.name}</div>
                  <div className="px-4 font-black text-lg bg-background rounded-md mx-2 py-1 shadow-sm">
                    {match.isPlayed ? `${match.homeScore} - ${match.awayScore}` : "v"}
                  </div>
                  <div className="flex-1 text-left font-semibold">{teams?.find(t => t.id === match.awayTeamId)?.name}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
