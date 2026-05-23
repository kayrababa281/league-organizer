import { useTeams } from "@/hooks/use-teams";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy } from "lucide-react";

const POS_STYLE = [
  { bar: "bg-yellow-400", badge: "bg-yellow-400 text-yellow-900", glow: "shadow-yellow-400/30" },
  { bar: "bg-slate-400",  badge: "bg-slate-300 text-slate-800",  glow: "shadow-slate-400/20"  },
  { bar: "bg-amber-600",  badge: "bg-amber-600 text-amber-100",  glow: "shadow-amber-600/20"  },
];

export default function Standings() {
  const { teams, isLoading } = useTeams();

  const sortedTeams = [...(teams || [])].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = a.goalsFor - a.goalsAgainst;
    const diffB = b.goalsFor - b.goalsAgainst;
    if (diffB !== diffA) return diffB - diffA;
    return b.goalsFor - a.goalsFor;
  });

  if (isLoading) return <div className="p-8 text-center animate-pulse text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10 glow-primary-sm">
          <Trophy className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-black font-display">Puan Durumu</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Sezon 2025/26</p>
        </div>
      </div>

      <Card className="overflow-hidden border-border/50 shadow-2xl card-glass">
        {sortedTeams.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>Henüz takım eklenmedi.</p>
          </div>
        ) : (
          <>
            {/* Column headers — desktop only (sm+) */}
            <div className="hidden sm:grid items-center px-4 py-3 border-b border-border/50 bg-muted/30"
              style={{ gridTemplateColumns: "4px 52px 1fr 48px 40px 40px 40px 52px 52px 56px" }}>
              <div />
              <div className="text-xs font-bold text-muted-foreground text-center">POS</div>
              <div className="text-xs font-bold text-muted-foreground pl-2">TAKIM</div>
              <div className="text-xs font-bold text-muted-foreground text-center">O</div>
              <div className="text-xs font-bold text-muted-foreground text-center">G</div>
              <div className="text-xs font-bold text-muted-foreground text-center">B</div>
              <div className="text-xs font-bold text-muted-foreground text-center">M</div>
              <div className="text-xs font-bold text-muted-foreground text-center hidden md:block">AV</div>
              <div className="text-xs font-bold text-muted-foreground text-center hidden md:block">A/Y</div>
              <div className="text-xs font-black text-primary text-center text-sm">P</div>
            </div>

            {/* Mobile column headers */}
            <div className="sm:hidden flex items-center px-3 py-2.5 border-b border-border/50 bg-muted/30">
              <div className="w-1 shrink-0" />
              <div className="w-8 shrink-0 text-center text-xs font-bold text-muted-foreground">#</div>
              <div className="flex-1 text-xs font-bold text-muted-foreground pl-2">TAKIM</div>
              <div className="w-10 text-center text-xs font-black text-primary">P</div>
            </div>

            <CardContent className="p-0">
              <div className="stagger">
                {sortedTeams.map((team, index) => {
                  const pos = POS_STYLE[index] ?? null;
                  const gd = team.goalsFor - team.goalsAgainst;
                  return (
                    <div key={team.id} className={`border-b border-border/30 last:border-0 transition-all duration-200 group animate-slide-up ${index < 3 ? "hover:bg-primary/5" : "hover:bg-muted/20"}`}>
                      {/* Desktop row (sm+) */}
                      <div
                        className="hidden sm:grid items-center"
                        style={{ gridTemplateColumns: "4px 52px 1fr 48px 40px 40px 40px 52px 52px 56px" }}
                      >
                        <div className={`self-stretch w-1 ${pos ? pos.bar : "bg-transparent"} rounded-r`} />
                        <div className="flex justify-center py-3.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all duration-200 group-hover:scale-110 ${pos ? `${pos.badge} shadow-lg ${pos.glow}` : "text-muted-foreground bg-muted/50"}`}>
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 py-3.5 pl-2 min-w-0">
                          {team.logoUrl ? (
                            <img src={team.logoUrl} alt={team.name} className="w-9 h-9 object-contain shrink-0 drop-shadow" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-black text-primary shrink-0">
                              {team.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className={`font-bold text-base truncate ${index < 3 ? "text-foreground" : "text-foreground/80"}`}>{team.name}</span>
                        </div>
                        <div className="text-center text-sm text-muted-foreground">{team.played}</div>
                        <div className="text-center text-sm text-emerald-500 font-semibold">{team.wins}</div>
                        <div className="text-center text-sm text-muted-foreground">{team.draws}</div>
                        <div className="text-center text-sm text-red-500/80 font-semibold">{team.losses}</div>
                        <div className={`text-center text-sm font-semibold hidden md:block ${gd > 0 ? "text-emerald-500" : gd < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                          {gd > 0 ? `+${gd}` : gd}
                        </div>
                        <div className="text-center text-xs text-muted-foreground hidden md:block">{team.goalsFor}/{team.goalsAgainst}</div>
                        <div className="flex justify-center">
                          <span className={`text-xl font-black tabular-nums ${index === 0 ? "text-gradient" : index < 3 ? "text-primary" : "text-foreground"}`}>
                            {team.points}
                          </span>
                        </div>
                      </div>

                      {/* Mobile row */}
                      <div className="sm:hidden flex items-center gap-0 px-3 py-3">
                        <div className={`self-stretch w-1 mr-2 ${pos ? pos.bar : "bg-transparent"} rounded-full shrink-0`} />
                        <div className="w-8 flex justify-center shrink-0">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${pos ? `${pos.badge}` : "text-muted-foreground bg-muted/50"}`}>
                            {index + 1}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-0 pl-2">
                          {team.logoUrl ? (
                            <img src={team.logoUrl} alt={team.name} className="w-8 h-8 object-contain shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-black text-primary shrink-0">
                              {team.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-sm truncate">{team.name}</div>
                            <div className="text-[10px] text-muted-foreground">
                              {team.played}O · {team.wins}G · {team.draws}B · {team.losses}M
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 w-10 text-right">
                          <span className={`text-xl font-black tabular-nums ${index === 0 ? "text-gradient" : index < 3 ? "text-primary" : "text-foreground"}`}>
                            {team.points}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}
