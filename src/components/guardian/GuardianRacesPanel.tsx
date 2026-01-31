/**
 * GuardianRacesPanel - Gerenciamento de corridas oficiais
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOfficialRaces } from '@/hooks/useGuardianData';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Trophy, Plus, Users, Calendar, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';

const statusColors: Record<string, string> = {
  registration: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  completed: 'bg-muted text-muted-foreground border-muted',
  cancelled: 'bg-destructive/20 text-destructive border-destructive/30',
};

const statusLabels: Record<string, string> = {
  registration: 'Inscrições Abertas',
  active: 'Em Andamento',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

export function GuardianRacesPanel() {
  const { data: races, isLoading, error } = useOfficialRaces();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newRace, setNewRace] = useState({
    name: '',
    scheduled_date: '',
    entry_fee: '1.10',
    prize_per_player: '1.00',
    skema_box_fee: '0.10',
    min_players: '2',
    max_players: '16',
  });

  const handleCreateRace = async () => {
    try {
      const { error } = await supabase
        .from('official_races')
        .insert({
          name: newRace.name,
          scheduled_date: new Date(newRace.scheduled_date).toISOString(),
          entry_fee: parseFloat(newRace.entry_fee),
          prize_per_player: parseFloat(newRace.prize_per_player),
          skema_box_fee: parseFloat(newRace.skema_box_fee),
          min_players: parseInt(newRace.min_players),
          max_players: parseInt(newRace.max_players),
        });

      if (error) throw error;

      toast({
        title: 'Corrida criada!',
        description: `A corrida "${newRace.name}" foi criada com sucesso.`,
      });

      setIsCreating(false);
      setNewRace({
        name: '',
        scheduled_date: '',
        entry_fee: '1.10',
        prize_per_player: '1.00',
        skema_box_fee: '0.10',
        min_players: '2',
        max_players: '16',
      });
      queryClient.invalidateQueries({ queryKey: ['guardian-official-races'] });
    } catch (err: any) {
      toast({
        title: 'Erro ao criar corrida',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleCancelRace = async (raceId: string, raceName: string) => {
    try {
      const { error } = await supabase
        .from('official_races')
        .update({ status: 'cancelled' })
        .eq('id', raceId);

      if (error) throw error;

      toast({
        title: 'Corrida cancelada',
        description: `A corrida "${raceName}" foi cancelada.`,
      });

      queryClient.invalidateQueries({ queryKey: ['guardian-official-races'] });
    } catch (err: any) {
      toast({
        title: 'Erro ao cancelar corrida',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        Erro ao carregar corridas: {error.message}
      </div>
    );
  }

  return (
    <Card className="bg-card/90 backdrop-blur-sm border-border/60">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Corridas Oficiais ({races?.length || 0})
          </CardTitle>
          
          <Dialog open={isCreating} onOpenChange={setIsCreating}>
            <DialogTrigger asChild>
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Nova Corrida
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Criar Nova Corrida</DialogTitle>
                <DialogDescription>
                  Configure os parâmetros da nova corrida oficial.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nome da Corrida</Label>
                  <Input
                    id="name"
                    value={newRace.name}
                    onChange={(e) => setNewRace({ ...newRace, name: e.target.value })}
                    placeholder="Corrida Estelar #1"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="date">Data e Hora</Label>
                  <Input
                    id="date"
                    type="datetime-local"
                    value={newRace.scheduled_date}
                    onChange={(e) => setNewRace({ ...newRace, scheduled_date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label htmlFor="entry_fee">Taxa Entrada</Label>
                    <Input
                      id="entry_fee"
                      type="number"
                      step="0.01"
                      value={newRace.entry_fee}
                      onChange={(e) => setNewRace({ ...newRace, entry_fee: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="prize">Prêmio/Jogador</Label>
                    <Input
                      id="prize"
                      type="number"
                      step="0.01"
                      value={newRace.prize_per_player}
                      onChange={(e) => setNewRace({ ...newRace, prize_per_player: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="box_fee">Taxa Box</Label>
                    <Input
                      id="box_fee"
                      type="number"
                      step="0.01"
                      value={newRace.skema_box_fee}
                      onChange={(e) => setNewRace({ ...newRace, skema_box_fee: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="min">Mín. Jogadores</Label>
                    <Input
                      id="min"
                      type="number"
                      value={newRace.min_players}
                      onChange={(e) => setNewRace({ ...newRace, min_players: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max">Máx. Jogadores</Label>
                    <Input
                      id="max"
                      type="number"
                      value={newRace.max_players}
                      onChange={(e) => setNewRace({ ...newRace, max_players: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreating(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateRace} disabled={!newRace.name || !newRace.scheduled_date}>
                  Criar Corrida
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Corrida</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Inscritos</TableHead>
                <TableHead>Taxas</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : races?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhuma corrida oficial criada
                  </TableCell>
                </TableRow>
              ) : (
                races?.map((race) => (
                  <TableRow key={race.id}>
                    <TableCell>
                      <span className="font-medium">{race.name}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[race.status]}>
                        {statusLabels[race.status] || race.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(race.scheduled_date), "dd/MM/yy HH:mm", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        {race.registrations_count}/{race.max_players}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Zap className="h-3 w-3" />
                        k${Number(race.entry_fee).toFixed(2)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {race.status === 'registration' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleCancelRace(race.id, race.name)}
                        >
                          Cancelar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
