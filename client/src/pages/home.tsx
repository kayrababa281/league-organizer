import { useTeams } from "@/hooks/use-teams";
import { usePlayers } from "@/hooks/use-players";
import { useMatches } from "@/hooks/use-matches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Flame, Calendar, Video, Shield } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

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

  const topScorer = [...(players || [])].filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals)[0];
  const topAssister = [...(players || [])].filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists)[0];
  const topCleanSheet = [...(players || [])].filter(p => p.cleanSheets > 0).sort((a, b) => b.cleanSheets - a.cleanSheets)[0];

  const recentMatches = [...(matches || [])]
    .filter(m => m.isPlayed)
    .sort((a, b) => b.id - a.id)
    .slice(0, 3);

  // Calculate current week based on played matches
  const currentWeek = matches?.reduce((max, m) => (m.isPlayed && m.week > max ? m.week : max), 0) || 1;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-purple-800 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-sm font-medium border border-white/10">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Sezon 2025/26
            </div>
            <h1 className="text-4xl md:text-6xl font-black font-display tracking-tight">
              {currentWeek}. HAFTA
            </h1>
            <p className="text-lg text-white/80 max-w-md">
              Auren League heyecanı devam ediyor. Liderlik mücadelesi kızışırken haftanın maçlarını kaçırma.
            </p>
          </div>

          {leader && (
            <div className="flex flex-col items-center bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 min-w-[200px]">
              <span className="text-sm font-bold tracking-wider opacity-80 mb-2">LİDER</span>
              {leader.logoUrl ? (
                <img src={leader.logoUrl} alt={leader.name} className="w-20 h-20 object-contain mb-3 drop-shadow-lg" />
              ) : (
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-3">
                  <Trophy className="w-10 h-10 text-yellow-400" />
                </div>
              )}
              <h2 className="text-2xl font-bold">{leader.name}</h2>
              <span className="text-3xl font-black text-yellow-400">{leader.points} P</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="GOL KRALI" 
          player={topScorer} 
          value={topScorer?.goals} 
          unit="Gol" 
          icon={<Flame className="w-6 h-6 text-orange-500" />} 
          teamName={teams?.find(t => t.id === topScorer?.teamId)?.name}
        />
        <StatCard 
          title="ASİST KRALI" 
          player={topAssister} 
          value={topAssister?.assists} 
          unit="Asist" 
          icon={<Medal className="w-6 h-6 text-blue-500" />} 
          teamName={teams?.find(t => t.id === topAssister?.teamId)?.name}
        />
        <StatCard 
          title="GOL YENMEYEN" 
          player={topCleanSheet} 
          value={topCleanSheet?.cleanSheets} 
          unit="Maç" 
          icon={<Shield className="w-6 h-6 text-green-500" />} 
          teamName={teams?.find(t => t.id === topCleanSheet?.teamId)?.name}
        />
      </div>

      {/* Recent Matches */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold font-display flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" />
          Son Oynanan Maçlar
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recentMatches.length > 0 ? (
            recentMatches.map((match) => {
              const home = teams?.find(t => t.id === match.homeTeamId);
              const away = teams?.find(t => t.id === match.awayTeamId);
              return (
                <Card key={match.id} className="overflow-hidden border-border/50 hover:border-primary/50 transition-colors">
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between p-4 bg-muted/30">
                      <span className="text-xs font-medium text-muted-foreground">
                        {match.date ? format(new Date(match.date), 'd MMM yyyy', { locale: tr }) : `${match.week}. Hafta`}
                      </span>
                      {match.videoUrl && (
                        <a href={match.videoUrl} target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 text-primary hover:underline">
                          <Video className="w-3 h-3" /> İzle
                        </a>
                      )}
                    </div>
                    <div className="p-6 flex items-center justify-between">
                      <div className="text-center w-1/3">
                        <div className="font-bold text-lg truncate" title={home?.name}>{home?.name}</div>
                      </div>
                      <div className="text-center w-1/3 px-2">
                        <div className="text-3xl font-black font-display tracking-wider bg-secondary px-3 py-1 rounded-lg">
                          {match.homeScore} - {match.awayScore}
                        </div>
                      </div>
                      <div className="text-center w-1/3">
                        <div className="font-bold text-lg truncate" title={away?.name}>{away?.name}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-card rounded-2xl border border-dashed">
              Henüz oynanmış maç yok.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, player, value, unit, icon, teamName }: any) {
  if (!player) return null;
  return (
    <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground tracking-wider">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{player.name}</div>
        <p className="text-xs text-muted-foreground mb-4">{teamName}</p>
        <div className="flex items-end gap-2">
          <span className="text-4xl font-black text-primary">{value}</span>
          <span className="text-sm font-medium text-muted-foreground mb-1.5">{unit}</span>
        </div>
      </CardContent>
    </Card>
  );
}
