import { useMatches } from "@/hooks/use-matches";
import { useTeams } from "@/hooks/use-teams";
import { CalendarDays, Video, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export default function Fixtures() {
  const { matches, isLoading: matchesLoading } = useMatches();
  const { teams } = useTeams();

  if (matchesLoading) return <div className="p-8 text-center animate-pulse text-muted-foreground">Yükleniyor...</div>;

  const leagueMatches = (matches || []).filter(m => m.tournament === "league" && m.week != null);

  const groupedMatches = leagueMatches.reduce((acc, match) => {
    const w = match.week!;
    if (!acc[w]) acc[w] = [];
    acc[w].push(match);
    return acc;
  }, {} as Record<number, typeof leagueMatches>);

  const sortedWeeks = Object.keys(groupedMatches).sort((a, b) => Number(a) - Number(b));

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 glow-primary-sm">
          <CalendarDays className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black font-display">Fikstür</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Lig Maçları</p>
        </div>
      </div>

      <div className="space-y-10">
        {sortedWeeks.length > 0 ? (
          sortedWeeks.map((week) => (
            <div key={week} className="space-y-4">
              {/* Week header */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-1.5 rounded-full shadow-lg glow-primary-sm">
                  <span className="text-xs font-black tracking-widest uppercase opacity-70">Hafta</span>
                  <span className="text-lg font-black">{week}</span>
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {groupedMatches[Number(week)].map((match) => {
                  const home = teams?.find(t => t.id === match.homeTeamId);
                  const away = teams?.find(t => t.id === match.awayTeamId);
                  const played = match.isPlayed;

                  return (
                    <div
                      key={match.id}
                      className={`
                        relative overflow-hidden rounded-2xl border transition-all duration-300 group
                        hover:-translate-y-0.5 hover:shadow-xl
                        ${played
                          ? "border-primary/20 bg-card hover:border-primary/40 hover:shadow-primary/10"
                          : "border-border/40 bg-card hover:border-border/70"}
                      `}
                    >
                      {/* Top accent line */}
                      {played && <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />}

                      {/* Header row */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-muted/20">
                        <div className="flex items-center gap-2">
                          {played ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                          <span className="text-xs font-semibold text-muted-foreground">
                            {match.date
                              ? format(new Date(match.date), 'd MMMM yyyy · HH:mm', { locale: tr })
                              : played ? "Oynandı" : "Tarih Belirlenmedi"}
                          </span>
                        </div>
                        {match.videoUrl && (
                          <a
                            href={match.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2.5 py-1 rounded-full"
                          >
                            <Video className="w-3 h-3" /> İzle
                          </a>
                        )}
                      </div>

                      {/* Match content */}
                      <div className="p-5 flex items-center justify-between gap-4">
                        {/* Home team */}
                        <div className="flex-1 flex flex-col items-center gap-2 text-center">
                          {home?.logoUrl ? (
                            <img src={home.logoUrl} className="w-12 h-12 object-contain drop-shadow-md" alt={home.name} />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-black text-primary">
                              {home?.name?.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="font-bold text-sm leading-tight">{home?.name}</span>
                        </div>

                        {/* Score / VS */}
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          {played ? (
                            <div className="bg-primary text-primary-foreground font-black text-3xl px-6 py-3 rounded-2xl glow-primary-sm tabular-nums tracking-tight shadow-lg">
                              {match.homeScore} <span className="text-primary-foreground/50 text-2xl">·</span> {match.awayScore}
                            </div>
                          ) : (
                            <div className="bg-muted border border-border/50 font-black text-xl px-6 py-3 rounded-2xl text-muted-foreground tracking-widest">
                              VS
                            </div>
                          )}
                        </div>

                        {/* Away team */}
                        <div className="flex-1 flex flex-col items-center gap-2 text-center">
                          {away?.logoUrl ? (
                            <img src={away.logoUrl} className="w-12 h-12 object-contain drop-shadow-md" alt={away.name} />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-sm font-black text-primary">
                              {away?.name?.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="font-bold text-sm leading-tight">{away?.name}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 text-muted-foreground border border-dashed border-border/50 rounded-2xl">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Fikstür henüz oluşturulmadı.</p>
          </div>
        )}
      </div>
    </div>
  );
}
