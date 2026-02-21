import { useMatches } from "@/hooks/use-matches";
import { useTeams } from "@/hooks/use-teams";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarDays, Video, Clock } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default function Fixtures() {
  const { matches, isLoading: matchesLoading } = useMatches();
  const { teams } = useTeams();

  if (matchesLoading) return <div className="p-8 text-center animate-pulse">Yükleniyor...</div>;

  // Group matches by week
  const groupedMatches = matches?.reduce((acc, match) => {
    if (!acc[match.week]) acc[match.week] = [];
    acc[match.week].push(match);
    return acc;
  }, {} as Record<number, typeof matches>);

  const sortedWeeks = Object.keys(groupedMatches || {}).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <CalendarDays className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-black font-display">Fikstür</h1>
      </div>

      <div className="grid gap-8">
        {sortedWeeks.length > 0 ? (
          sortedWeeks.map((week) => (
            <div key={week} className="space-y-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold bg-primary/10 text-primary px-4 py-1 rounded-full">
                  {week}. Hafta
                </h2>
                <div className="h-px bg-border flex-1"></div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {groupedMatches[Number(week)].map((match) => {
                  const home = teams?.find(t => t.id === match.homeTeamId);
                  const away = teams?.find(t => t.id === match.awayTeamId);

                  return (
                    <Card key={match.id} className="border-border/50 hover:border-primary/50 transition-colors shadow-sm">
                      <CardContent className="p-4 flex flex-col gap-4">
                         <div className="flex items-center justify-between text-xs text-muted-foreground border-b pb-2">
                           <span>{match.date ? format(new Date(match.date), 'd MMMM yyyy HH:mm', { locale: tr }) : 'Tarih Belirlenmedi'}</span>
                           {match.videoUrl && (
                             <a href={match.videoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline font-medium">
                               <Video className="w-3 h-3" /> Maçı İzle
                             </a>
                           )}
                         </div>

                         <div className="flex items-center justify-between">
                            <div className="flex-1 flex items-center justify-end gap-3 text-right">
                               <span className="font-bold text-lg md:text-xl">{home?.name}</span>
                               {home?.logoUrl && <img src={home.logoUrl} className="w-8 h-8 object-contain" alt="" />}
                            </div>

                            <div className="px-4">
                              {match.isPlayed ? (
                                <div className="bg-secondary text-secondary-foreground font-black text-2xl px-4 py-2 rounded-lg min-w-[100px] text-center">
                                  {match.homeScore} - {match.awayScore}
                                </div>
                              ) : (
                                <div className="bg-muted text-muted-foreground font-bold text-lg px-4 py-2 rounded-lg min-w-[100px] text-center flex items-center justify-center gap-2">
                                  <Clock className="w-4 h-4" /> VS
                                </div>
                              )}
                            </div>

                            <div className="flex-1 flex items-center justify-start gap-3 text-left">
                               {away?.logoUrl && <img src={away.logoUrl} className="w-8 h-8 object-contain" alt="" />}
                               <span className="font-bold text-lg md:text-xl">{away?.name}</span>
                            </div>
                         </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">Fikstür henüz oluşturulmadı.</div>
        )}
      </div>
    </div>
  );
}
