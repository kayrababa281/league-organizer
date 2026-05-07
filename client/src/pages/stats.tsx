import { usePlayers } from "@/hooks/use-players";
import { useTeams } from "@/hooks/use-teams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Flame, Medal, Shield, RectangleVertical, Users, Search, Trophy } from "lucide-react";
import { useState } from "react";

const MEDALS = [
  { bg: "bg-yellow-400", text: "text-yellow-900", shadow: "shadow-yellow-400/40", label: "🥇" },
  { bg: "bg-slate-300",  text: "text-slate-800",  shadow: "shadow-slate-300/30",  label: "🥈" },
  { bg: "bg-amber-600",  text: "text-amber-100",  shadow: "shadow-amber-600/30",  label: "🥉" },
];

export default function Stats() {
  const { players } = usePlayers();
  const { teams } = useTeams();
  const [searchTerm, setSearchTerm] = useState("");

  const getTeamName = (id: number) => teams?.find(t => t.id === id)?.name || "-";

  const getTop = (valueKey: string, count = 20) =>
    [...(players || [])]
      .filter(p => (p as any)[valueKey] > 0)
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => (b as any)[valueKey] - (a as any)[valueKey])
      .slice(0, count);

  const renderPodium = (data: any[], valueKey: string, unit: string) => {
    const top3 = data.slice(0, 3);
    if (top3.length === 0) return null;
    return (
      <div className="grid grid-cols-3 gap-3 mb-6">
        {top3.map((player, i) => {
          const m = MEDALS[i];
          return (
            <div
              key={player.id}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-2xl border
                ${i === 0
                  ? "border-yellow-400/30 bg-yellow-400/5 col-start-2 -mt-2"
                  : i === 1
                    ? "border-slate-400/20 bg-slate-400/5 col-start-1 row-start-1 mt-4"
                    : "border-amber-600/20 bg-amber-600/5 mt-4"}
                relative overflow-hidden order-${i === 1 ? 1 : i === 0 ? 2 : 3}
              `}
              style={{ order: i === 1 ? 1 : i === 0 ? 2 : 3 }}
            >
              <div className={`w-10 h-10 rounded-full ${m.bg} ${m.text} flex items-center justify-center font-black text-lg shadow-lg ${m.shadow}`}>
                {i + 1}
              </div>
              <div className="text-center">
                <div className="font-bold text-sm leading-tight">{player.name}</div>
                <div className="text-xs text-muted-foreground truncate max-w-[80px]">{getTeamName(player.teamId)}</div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-black ${i === 0 ? "text-gradient" : "text-primary"}`}>
                  {(player as any)[valueKey]}
                </span>
                <span className="text-xs text-muted-foreground">{unit}</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderTable = (data: any[], valueKey: string, offset = 0) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-16">#</TableHead>
          <TableHead>Oyuncu</TableHead>
          <TableHead>Takım</TableHead>
          <TableHead className="text-right font-bold">Sayı</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((player, i) => {
          const rank = i + offset;
          const medal = MEDALS[rank];
          return (
            <TableRow key={player.id} className="group hover:bg-primary/5 transition-colors">
              <TableCell>
                {medal ? (
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${medal.bg} ${medal.text} shadow-sm`}>
                    {rank + 1}
                  </div>
                ) : (
                  <span className="text-sm font-medium text-muted-foreground pl-1">{rank + 1}</span>
                )}
              </TableCell>
              <TableCell className="font-semibold">{player.name}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{getTeamName(player.teamId)}</TableCell>
              <TableCell className="text-right font-black text-primary text-lg tabular-nums">{(player as any)[valueKey]}</TableCell>
            </TableRow>
          );
        })}
        {data.length === 0 && (
          <TableRow>
            <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
              Henüz istatistik yok.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const categories = [
    { key: "goals",      label: "Gol Krallığı",     icon: Flame,             color: "text-orange-500", unit: "Gol",   tabColor: "data-[state=active]:bg-orange-500"  },
    { key: "assists",    label: "Asist Krallığı",    icon: Medal,             color: "text-blue-500",   unit: "Asist", tabColor: "data-[state=active]:bg-blue-500"    },
    { key: "cleanSheets",label: "Gol Yenmeyen",      icon: Shield,            color: "text-emerald-500",unit: "Maç",   tabColor: "data-[state=active]:bg-emerald-500" },
    { key: "yellowCards",label: "Sarı Kart",          icon: RectangleVertical, color: "text-yellow-500", unit: "Kart",  tabColor: "data-[state=active]:bg-yellow-500"  },
    { key: "redCards",   label: "Kırmızı Kart",       icon: RectangleVertical, color: "text-red-500",    unit: "Kart",  tabColor: "data-[state=active]:bg-red-500"     },
  ];

  return (
    <div className="space-y-8 animate-slide-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 glow-primary-sm">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-black font-display">İstatistikler</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Lig sezon istatistikleri</p>
          </div>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Oyuncu ara..."
            className="pl-9 bg-card border-border/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="goals" className="w-full">
        <TabsList className="flex w-full bg-card border border-border/50 p-1.5 rounded-2xl h-auto gap-1">
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <TabsTrigger
                key={cat.key}
                value={cat.key}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${cat.tabColor} data-[state=active]:text-white data-[state=active]:shadow-lg`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{cat.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <div className="mt-6 stagger">
          {categories.map(cat => {
            const Icon = cat.icon;
            const data = getTop(cat.key);
            return (
              <TabsContent key={cat.key} value={cat.key} className="animate-scale-in">
                <Card className="card-glass border-border/50 shadow-xl overflow-hidden">
                  <CardHeader className="flex flex-row items-center gap-3 pb-4 border-b border-border/30">
                    <div className={`p-2.5 rounded-xl bg-muted`}>
                      <Icon className={`w-5 h-5 ${cat.color}`} />
                    </div>
                    <CardTitle className="text-xl">{cat.label}</CardTitle>
                    <span className="ml-auto text-sm text-muted-foreground font-medium">{data.length} oyuncu</span>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {renderPodium(data, cat.key, cat.unit)}
                    {data.length > 3 && (
                      <div className="mt-2">
                        <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                          <div className="h-px flex-1 bg-border/50" />
                          Diğerleri
                          <div className="h-px flex-1 bg-border/50" />
                        </div>
                        {renderTable(data.slice(3), cat.key, 3)}
                      </div>
                    )}
                    {data.length === 0 && renderTable([], cat.key)}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </div>
      </Tabs>
    </div>
  );
}
