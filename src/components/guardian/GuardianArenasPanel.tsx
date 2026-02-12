/**
 * GuardianArenasPanel - Criação e gerenciamento de arenas custom
 * Grão Mestre+, Guardião e Master Admin podem criar arenas
 * Arenas ficam visíveis para qualquer jogador no lobby
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useArenaListings, useCreateArena, useCloseArena, useDeleteArena, useBotTreasuryBalance } from '@/hooks/useArenaListings';
import { useSupabasePlayer } from '@/hooks/useSupabasePlayer';
import {
  ARENA_BOT_OPTIONS,
  calculateArenaPool, calculateTotalRake, getScaledArenaPrize,
} from '@/lib/arenaPayouts';
import { RAKE_RATE, computeBuyInAndRake } from '@/lib/arenaPayouts';
import { formatEnergy } from '@/lib/tierEconomy';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Swords, Plus, Bot, Users, Zap, Trophy, Ban, Loader2, Trash2
} from 'lucide-react';

const statusColors: Record<string, string> = {
  open: 'bg-green-500/20 text-green-400 border-green-500/30',
  closed: 'bg-muted text-muted-foreground border-muted',
};

const statusLabels: Record<string, string> = {
  open: 'Aberta',
  closed: 'Encerrada',
};

export function GuardianArenasPanel() {
  const { data: arenas, isLoading } = useArenaListings();
  const createArena = useCreateArena();
  const closeArena = useCloseArena();
  const deleteArena = useDeleteArena();
  const { player } = useSupabasePlayer();
  const { data: botTreasuryBalance } = useBotTreasuryBalance();
  const [isCreating, setIsCreating] = useState(false);
  const [customBuyInInput, setCustomBuyInInput] = useState('0.55');
  const [selectedBots, setSelectedBots] = useState(99);
  const [arenaName, setArenaName] = useState('');

  const parsedBuyIn = parseFloat(customBuyInInput) || 0;
  const { buyIn, rakeFee } = computeBuyInAndRake(parsedBuyIn);
  const pool = calculateArenaPool(buyIn, rakeFee, selectedBots);
  const totalRake = calculateTotalRake(rakeFee, selectedBots);
  const first = getScaledArenaPrize(1, pool);
  const minCash = getScaledArenaPrize(25, pool);
  const isValidBuyIn = parsedBuyIn >= 0.11; // mínimo k$ 0,11
  const botTotalNeeded = selectedBots * parsedBuyIn;
  const treasurySufficient = (botTreasuryBalance ?? 0) >= botTotalNeeded;
  const maxBuyInSupported = selectedBots > 0 ? Math.floor(((botTreasuryBalance ?? 0) / selectedBots) * 100) / 100 : 0;

  const handleCreate = async () => {
    if (!player?.id || !arenaName.trim() || !isValidBuyIn) return;

    try {
      await createArena.mutateAsync({
        creator_id: player.id,
        name: arenaName.trim(),
        buy_in: buyIn,
        rake_fee: rakeFee,
        bot_count: selectedBots,
      });

      toast({
        title: '🏟️ Arena criada!',
        description: `"${arenaName}" está aberta para inscrições.`,
      });

      setIsCreating(false);
      setArenaName('');
    } catch (err: any) {
      toast({
        title: 'Erro ao criar arena',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

  const handleClose = async (arenaId: string, name: string) => {
    try {
      await closeArena.mutateAsync(arenaId);
      toast({ title: 'Arena encerrada', description: `"${name}" foi fechada.` });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (arenaId: string, name: string) => {
    try {
      await deleteArena.mutateAsync(arenaId);
      toast({ title: 'Arena excluída', description: `"${name}" foi removida.` });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Create arena */}
      <Card className="bg-card/90 backdrop-blur-sm border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Swords className="h-5 w-5 text-primary" />
              Arenas x Bots ({arenas?.length || 0})
            </CardTitle>

            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Nova Arena
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Criar Arena x Bots</DialogTitle>
                  <DialogDescription>
                    Configure buy-in e número de bots. Fica disponível para qualquer jogador.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Nome da Arena</Label>
                    <Input
                      value={arenaName}
                      onChange={(e) => setArenaName(e.target.value)}
                      placeholder="Arena Galáctica #1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Buy-in Total (k$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.11"
                        value={customBuyInInput}
                        onChange={(e) => setCustomBuyInInput(e.target.value)}
                        placeholder="Ex: 1.10"
                      />
                      <p className="text-xs text-muted-foreground">
                        Rake fixo: {(RAKE_RATE * 100).toFixed(2)}% → k$ {formatEnergy(rakeFee)}/entrada
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <Label>Bots</Label>
                      <Select
                        value={String(selectedBots)}
                        onValueChange={(v) => setSelectedBots(Number(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ARENA_BOT_OPTIONS.map((n) => (
                            <SelectItem key={n} value={String(n)}>
                              {n} bots
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm border border-border/50">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Jogadores total</span>
                      <span className="font-mono">{selectedBots + 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Rake (Skema Box)</span>
                      <span className="font-mono text-primary/80">{formatEnergy(rakeFee)} × {selectedBots + 1} = {formatEnergy(totalRake)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pool total</span>
                      <span className="font-mono text-green-400 font-bold">{formatEnergy(pool)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">1º lugar</span>
                      <span className="font-mono text-yellow-400">{formatEnergy(first)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Min-cash (25º)</span>
                      <span className="font-mono">{formatEnergy(minCash)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bot Treasury</span>
                      <span className={`font-mono ${treasurySufficient ? 'text-green-400' : 'text-destructive font-bold'}`}>
                        {formatEnergy(botTreasuryBalance ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bots precisam</span>
                      <span className={`font-mono ${treasurySufficient ? '' : 'text-destructive font-bold'}`}>
                        {formatEnergy(botTotalNeeded)}
                      </span>
                    </div>
                    {!treasurySufficient && isValidBuyIn && (
                      <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/30 text-destructive text-xs">
                        ⚠️ Bot Treasury insuficiente! Máx buy-in suportado: <strong>k$ {formatEnergy(maxBuyInSupported)}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreating(false)}>Cancelar</Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!arenaName.trim() || !isValidBuyIn || !treasurySufficient || createArena.isPending}
                  >
                    {createArena.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                    Criar Arena
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
                  <TableHead>Arena</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criador</TableHead>
                  <TableHead>Buy-in</TableHead>
                  <TableHead>Bots</TableHead>
                  <TableHead>Pool</TableHead>
                  <TableHead>Criação</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-6 w-16" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : arenas?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      Nenhuma arena criada
                    </TableCell>
                  </TableRow>
                ) : (
                  [...(arenas || [])]
                    .sort((a, b) => Number(b.buy_in) - Number(a.buy_in))
                    .map((arena) => {
                    const arenaPool = calculateArenaPool(Number(arena.buy_in), Number(arena.rake_fee), arena.bot_count);
                    return (
                      <TableRow key={arena.id}>
                        <TableCell className="font-medium">{arena.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[arena.status] || ''}>
                            {statusLabels[arena.status] || arena.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {arena.creator_emoji} {arena.creator_name}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs">
                            <Zap className="h-3 w-3 text-yellow-400" />
                            {formatEnergy(Number(arena.buy_in))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs">
                            <Bot className="h-3 w-3 text-muted-foreground" />
                            {arena.bot_count}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-xs text-green-400">
                            <Trophy className="h-3 w-3" />
                            {formatEnergy(arenaPool)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(arena.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {arena.status === 'open' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleClose(arena.id, arena.name)}
                                disabled={closeArena.isPending}
                              >
                                <Ban className="h-3 w-3 mr-1" />
                                Fechar
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(arena.id, arena.name)}
                              disabled={deleteArena.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
