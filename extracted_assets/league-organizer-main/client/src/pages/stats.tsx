import { usePlayers } from "@/hooks/use-players";
import { useTeams } from "@/hooks/use-teams";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Flame, Medal, Shield, RectangleVertical, Users, Search } from "lucide-react";
import { useState } from "react";

export default function Stats() {
  const { players } = usePlayers();
  const { teams } = useTeams();
  const [searchTerm, setSearchTerm] = useState("");

  const getTeamName = (id: number) => teams?.find(t => t.id === id)?.name || "-";

  const renderTable = (data: any[], valueKey: string) => {
    const filteredData = data
      .filter(p => p[valueKey] > 0)
      .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => b[valueKey] - a[valueKey])
      .slice(0, 20);

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            <TableHead>Oyuncu</TableHead>
            <TableHead>Takım</TableHead>
            <TableHead className="text-right text-lg font-bold">Sayı</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredData.map((player, i) => (
            <TableRow key={player.id}>
              <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
              <TableCell className="font-semibold">{player.name}</TableCell>
              <TableCell className="text-muted-foreground">{getTeamName(player.teamId)}</TableCell>
              <TableCell className="text-right font-black text-primary text-lg">{player[valueKey]}</TableCell>
            </TableRow>
          ))}
          {filteredData.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                Sonuç bulunamadı.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-black font-display">İstatistikler</h1>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Oyuncu ara..." 
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-player-stats"
          />
        </div>
      </div>

      <Tabs defaultValue="goals" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 bg-muted/50 p-1 rounded-xl h-auto">
          <TabsTrigger value="goals" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5">Gol Krallığı</TabsTrigger>
          <TabsTrigger value="assists" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white py-2.5">Asist Krallığı</TabsTrigger>
          <TabsTrigger value="clean" className="data-[state=active]:bg-green-500 data-[state=active]:text-white py-2.5">Gol Yemeyen</TabsTrigger>
          <TabsTrigger value="yellow" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-white py-2.5">Sarı Kart</TabsTrigger>
          <TabsTrigger value="red" className="data-[state=active]:bg-red-500 data-[state=active]:text-white py-2.5">Kırmızı Kart</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="goals">
             <Card>
               <CardHeader className="flex flex-row items-center gap-2">
                 <Flame className="text-primary" />
                 <CardTitle>Gol Krallığı</CardTitle>
               </CardHeader>
               <CardContent>
                 {renderTable(players || [], 'goals')}
               </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="assists">
             <Card>
               <CardHeader className="flex flex-row items-center gap-2">
                 <Medal className="text-blue-500" />
                 <CardTitle>Asist Krallığı</CardTitle>
               </CardHeader>
               <CardContent>
                 {renderTable(players || [], 'assists')}
               </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="clean">
             <Card>
               <CardHeader className="flex flex-row items-center gap-2">
                 <Shield className="text-green-500" />
                 <CardTitle>Gol Yenmeyen Maç</CardTitle>
               </CardHeader>
               <CardContent>
                 {renderTable(players || [], 'cleanSheets')}
               </CardContent>
             </Card>
          </TabsContent>

           <TabsContent value="yellow">
             <Card>
               <CardHeader className="flex flex-row items-center gap-2">
                 <RectangleVertical className="text-yellow-500" />
                 <CardTitle>Sarı Kartlar</CardTitle>
               </CardHeader>
               <CardContent>
                 {renderTable(players || [], 'yellowCards')}
               </CardContent>
             </Card>
          </TabsContent>

           <TabsContent value="red">
             <Card>
               <CardHeader className="flex flex-row items-center gap-2">
                 <RectangleVertical className="text-red-500" />
                 <CardTitle>Kırmızı Kartlar</CardTitle>
               </CardHeader>
               <CardContent>
                 {renderTable(players || [], 'redCards')}
               </CardContent>
             </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
