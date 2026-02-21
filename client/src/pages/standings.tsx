import { useTeams } from "@/hooks/use-teams";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default function Standings() {
  const { teams, isLoading } = useTeams();

  const sortedTeams = [...(teams || [])].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = a.goalsFor - a.goalsAgainst;
    const diffB = b.goalsFor - b.goalsAgainst;
    if (diffB !== diffA) return diffB - diffA;
    return b.goalsFor - a.goalsFor;
  });

  if (isLoading) return <div className="p-8 text-center animate-pulse">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Trophy className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-black font-display">Puan Durumu</h1>
      </div>

      <Card className="overflow-hidden border-border/50 shadow-lg">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-16 text-center font-bold">POS</TableHead>
                <TableHead className="font-bold">TAKIM</TableHead>
                <TableHead className="text-center font-bold">O</TableHead>
                <TableHead className="text-center font-bold hidden sm:table-cell">G</TableHead>
                <TableHead className="text-center font-bold hidden sm:table-cell">B</TableHead>
                <TableHead className="text-center font-bold hidden sm:table-cell">M</TableHead>
                <TableHead className="text-center font-bold hidden md:table-cell">A</TableHead>
                <TableHead className="text-center font-bold hidden md:table-cell">Y</TableHead>
                <TableHead className="text-center font-bold">AV</TableHead>
                <TableHead className="text-center font-black text-primary text-lg">P</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTeams.map((team, index) => (
                <TableRow key={team.id} className={index < 3 ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"}>
                  <TableCell className="text-center font-medium">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center mx-auto text-sm
                      ${index === 0 ? "bg-yellow-400 text-yellow-900 font-bold" : 
                        index === 1 ? "bg-slate-300 text-slate-800 font-bold" : 
                        index === 2 ? "bg-amber-600 text-amber-100 font-bold" : "text-muted-foreground"}
                    `}>
                      {index + 1}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-base">
                    <div className="flex items-center gap-3">
                      {team.logoUrl ? (
                         <img src={team.logoUrl} alt={team.name} className="w-8 h-8 object-contain" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                          {team.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      {team.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-muted-foreground">{team.played}</TableCell>
                  <TableCell className="text-center text-muted-foreground hidden sm:table-cell">{team.wins}</TableCell>
                  <TableCell className="text-center text-muted-foreground hidden sm:table-cell">{team.draws}</TableCell>
                  <TableCell className="text-center text-muted-foreground hidden sm:table-cell">{team.losses}</TableCell>
                  <TableCell className="text-center text-muted-foreground hidden md:table-cell">{team.goalsFor}</TableCell>
                  <TableCell className="text-center text-muted-foreground hidden md:table-cell">{team.goalsAgainst}</TableCell>
                  <TableCell className="text-center font-medium">{team.goalsFor - team.goalsAgainst}</TableCell>
                  <TableCell className="text-center font-black text-xl text-primary">{team.points}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
