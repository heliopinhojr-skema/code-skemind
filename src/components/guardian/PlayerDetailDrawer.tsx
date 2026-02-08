/**
 * PlayerDetailDrawer - Drawer lateral com detalhes completos de um jogador
 * Mostra: perfil, saldo, ascendência, descendência, histórico de jogos
 * Admin actions: zerar saldo, penalizar, bloquear/desbloquear (master_admin only)
 */

import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ReferralNode } from '@/hooks/useGuardianData';
import { calculateBalanceBreakdown, formatEnergy } from '@/lib/tierEconomy';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Zap, Trophy, Clock, Users, GitBranch, ChevronUp, ChevronDown,
  Shield, Star, Crown, Swords, Rocket, Gamepad2, Lock, Unlock,
  Target, Calendar, ArrowUpRight, ArrowDownRight, TrendingUp,
  Ban, MinusCircle, Trash2, AlertTriangle, CheckCircle, DollarSign,
  ArrowUp, ArrowDown
} from 'lucide-react';

const TIER_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  'master_admin': { label: 'CD HX', icon: <Shield className="h-3 w-3" />, color: 'text-red-400 bg-red-400/10 border-red-400/30' },
  'Criador': { label: 'Criador', icon: <Star className="h-3 w-3" />, color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' },
  'Grão Mestre': { label: 'Grão Mestre', icon: <Crown className="h-3 w-3" />, color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' },
  'Mestre': { label: 'Mestre', icon: <Swords className="h-3 w-3" />, color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  'Boom': { label: 'Boom', icon: <Rocket className="h-3 w-3" />, color: 'text-green-400 bg-green-400/10 border-green-400/30' },
  'Ploft': { label: 'Ploft', icon: <Gamepad2 className="h-3 w-3" />, color: 'text-muted-foreground bg-muted/30 border-border' },
  'jogador': { label: 'Ploft', icon: <Gamepad2 className="h-3 w-3" />, color: 'text-muted-foreground bg-muted/30 border-border' },
};

function getTierConfig(tier: string | null) {
  return TIER_CONFIG[tier || 'jogador'] || TIER_CONFIG['jogador'];
}

interface PlayerDetailDrawerProps {
  playerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allNodes: ReferralNode[];
  isMasterAdmin?: boolean;
}

function usePlayerGameHistory(playerId: string | null) {
  return useQuery({
    queryKey: ['player-game-history', playerId],
    queryFn: async () => {
      if (!playerId) return [];
      const { data, error } = await supabase
        .from('game_history')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!playerId,
  });
}

function usePlayerArenaEntries(playerId: string | null) {
  return useQuery({
    queryKey: ['player-arena-entries', playerId],
    queryFn: async () => {
      if (!playerId) return [];
      const { data, error } = await supabase
        .from('arena_entries')
        .select('*, arena_listings(name, buy_in, rake_fee)')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!playerId,
  });
}

type AdminAction = 'zero' | 'penalize' | 'block' | 'unblock' | 'delete' | null;

export function PlayerDetailDrawer({ playerId, open, onOpenChange, allNodes, isMasterAdmin }: PlayerDetailDrawerProps) {
  const player = useMemo(() => allNodes.find(n => n.id === playerId), [allNodes, playerId]);
  const { data: gameHistory, isLoading: historyLoading } = usePlayerGameHistory(playerId);
  const { data: arenaEntries } = usePlayerArenaEntries(playerId);
  const queryClient = useQueryClient();

  // Admin action state
  const [adminAction, setAdminAction] = useState<AdminAction>(null);
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Arena P&L calculation
  const arenaPnL = useMemo(() => {
    if (!arenaEntries || arenaEntries.length === 0) return { totalBuyIns: 0, totalPrizes: 0, net: 0, arenas: 0 };
    let totalBuyIns = 0;
    let totalPrizes = 0;
    arenaEntries.forEach((entry: any) => {
      const buyIn = Number(entry.arena_listings?.buy_in || 0);
      totalBuyIns += buyIn;
      totalPrizes += Number(entry.prize_won || 0);
    });
    return {
      totalBuyIns,
      totalPrizes,
      net: totalPrizes - totalBuyIns,
      arenas: arenaEntries.length,
    };
  }, [arenaEntries]);

  // Build ancestry
  const ancestry = useMemo(() => {
    if (!player || !allNodes.length) return [];
    const chain: ReferralNode[] = [];
    let current = player;
    const visited = new Set<string>();
    
    while (current.invited_by && !visited.has(current.id)) {
      visited.add(current.id);
      const parent = allNodes.find(n => n.invite_code === current.invited_by);
      if (parent) {
        chain.push(parent);
        current = parent;
      } else {
        break;
      }
    }
    return chain;
  }, [player, allNodes]);

  // Build descendants
  const descendants = useMemo(() => {
    if (!player || !allNodes.length) return [];
    const result: Array<ReferralNode & { depth: number }> = [];
    const visited = new Set<string>();

    function collect(inviteCode: string, depth: number) {
      const children = allNodes.filter(n => n.invited_by === inviteCode && !visited.has(n.id));
      children.forEach(child => {
        visited.add(child.id);
        result.push({ ...child, depth });
        collect(child.invite_code, depth + 1);
      });
    }

    collect(player.invite_code, 1);
    return result;
  }, [player, allNodes]);

  const totalDescendants = descendants.length;
  const totalEnergyTree = descendants.reduce((sum, d) => sum + d.energy, 0);
  
  // Game stats
  const gameStats = useMemo(() => {
    if (!gameHistory) return { total: 0, wins: 0, losses: 0, avgAttempts: 0, bestTime: 0 };
    const wins = gameHistory.filter((g: any) => g.won).length;
    const totalAttempts = gameHistory.reduce((sum: number, g: any) => sum + g.attempts, 0);
    const bestTime = gameHistory
      .filter((g: any) => g.won && g.time_remaining)
      .reduce((best: number, g: any) => Math.max(best, Number(g.time_remaining)), 0);
    return {
      total: gameHistory.length,
      wins,
      losses: gameHistory.length - wins,
      avgAttempts: gameHistory.length > 0 ? Math.round(totalAttempts / gameHistory.length * 10) / 10 : 0,
      bestTime,
    };
  }, [gameHistory]);

  const timeSinceRegistration = player 
    ? formatDistanceToNow(new Date(player.created_at), { locale: ptBR, addSuffix: true })
    : '';

  // Admin actions
  const handleAdminAction = async () => {
    if (!player || !playerId) return;
    setIsProcessing(true);

    try {
      if (adminAction === 'zero') {
        const { error } = await supabase.rpc('admin_adjust_player_energy', {
          p_player_id: playerId,
          p_new_energy: 0,
          p_reason: 'Zerado pelo admin',
        });
        if (error) throw error;
        toast.success(`Saldo de ${player.name} zerado com sucesso`);
      } else if (adminAction === 'penalize') {
        const amount = parseFloat(penaltyAmount);
        if (isNaN(amount) || amount <= 0) {
          toast.error('Valor inválido para penalização');
          return;
        }
        const newEnergy = Math.max(0, player.energy - amount);
        const { error } = await supabase.rpc('admin_adjust_player_energy', {
          p_player_id: playerId,
          p_new_energy: newEnergy,
          p_reason: `Penalização: -${amount} k$`,
        });
        if (error) throw error;
        toast.success(`${player.name} penalizado em ${formatEnergy(amount)}`);
      } else if (adminAction === 'block') {
        const { error } = await supabase.rpc('admin_set_player_status', {
          p_player_id: playerId,
          p_status: 'blocked',
        });
        if (error) throw error;
        toast.success(`${player.name} foi bloqueado`);
      } else if (adminAction === 'unblock') {
        const { error } = await supabase.rpc('admin_set_player_status', {
          p_player_id: playerId,
          p_status: 'active',
        });
        if (error) throw error;
        toast.success(`${player.name} foi desbloqueado`);
      } else if (adminAction === 'delete') {
        const { error } = await supabase.rpc('admin_delete_player', {
          p_player_id: playerId,
        });
        if (error) throw error;
        toast.success(`${player.name} apagado — energia devolvida à ascendência`);
        onOpenChange(false);
      }

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['guardian-players-list'] });
      queryClient.invalidateQueries({ queryKey: ['guardian-referral-tree'] });
      queryClient.invalidateQueries({ queryKey: ['guardian-dashboard-stats'] });
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setAdminAction(null);
      setPenaltyAmount('');
    }
  };

  if (!player) return null;

  const tierConfig = getTierConfig(player.player_tier);
  const balance = calculateBalanceBreakdown(player.energy, player.player_tier, player.invites_sent);

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            <SheetHeader className="space-y-4">
              {/* Player header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/40 to-purple-500/40 flex items-center justify-center text-4xl border-2 border-primary/30">
                  {player.emoji}
                </div>
                <div className="flex-1">
                  <SheetTitle className="text-xl flex items-center gap-2">
                    {player.name}
                    <Badge variant="outline" className={`text-xs border ${tierConfig.color}`}>
                      <span className="flex items-center gap-1">
                        {tierConfig.icon}
                        {tierConfig.label}
                      </span>
                    </Badge>
                  </SheetTitle>
                  <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {player.invite_code}
                  </code>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Registrado {timeSinceRegistration}
                  </div>
                </div>
              </div>
            </SheetHeader>

            {/* Energy breakdown */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/30 rounded-lg p-3 text-center border border-border/50">
                <Zap className="h-4 w-4 mx-auto text-yellow-400 mb-1" />
                <div className="text-sm font-bold">{formatEnergy(balance.total)}</div>
                <div className="text-[10px] text-muted-foreground">Total</div>
              </div>
              <div className="bg-orange-500/5 rounded-lg p-3 text-center border border-orange-500/20">
                <Lock className="h-4 w-4 mx-auto text-orange-400 mb-1" />
                <div className="text-sm font-bold text-orange-400">{formatEnergy(balance.locked)}</div>
                <div className="text-[10px] text-muted-foreground">Bloqueado</div>
              </div>
              <div className="bg-emerald-500/5 rounded-lg p-3 text-center border border-emerald-500/20">
                <Unlock className="h-4 w-4 mx-auto text-emerald-400 mb-1" />
                <div className="text-sm font-bold text-emerald-400">{formatEnergy(balance.available)}</div>
                <div className="text-[10px] text-muted-foreground">Disponível</div>
              </div>
            </div>

            {/* Arena P&L */}
            {arenaPnL.arenas > 0 && (
              <div className="bg-muted/20 rounded-lg p-4 border border-border/50">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-yellow-400" />
                  Balanço de Arenas ({arenaPnL.arenas} participações)
                </h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1 text-red-400 text-xs mb-1">
                      <ArrowDown className="h-3 w-3" /> Buy-ins
                    </div>
                    <div className="text-sm font-bold text-red-400">-{formatEnergy(arenaPnL.totalBuyIns)}</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-green-400 text-xs mb-1">
                      <ArrowUp className="h-3 w-3" /> Prêmios
                    </div>
                    <div className="text-sm font-bold text-green-400">+{formatEnergy(arenaPnL.totalPrizes)}</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-xs mb-1">
                      <TrendingUp className="h-3 w-3" /> P&L
                    </div>
                    <div className={`text-sm font-bold ${arenaPnL.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {arenaPnL.net >= 0 ? '+' : ''}{formatEnergy(arenaPnL.net)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Actions (master_admin only) */}
            {isMasterAdmin && (
              <div className="bg-destructive/5 rounded-lg p-4 border border-destructive/20">
                <h3 className="text-sm font-semibold flex items-center gap-2 mb-3 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Ações Administrativas
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-destructive/30 hover:bg-destructive/10 text-destructive"
                    onClick={() => setAdminAction('zero')}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Zerar Saldo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-orange-500/30 hover:bg-orange-500/10 text-orange-400"
                    onClick={() => setAdminAction('penalize')}
                  >
                    <MinusCircle className="h-3 w-3 mr-1" />
                    Penalizar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-red-500/30 hover:bg-red-500/10 text-red-400"
                    onClick={() => setAdminAction('block')}
                  >
                    <Ban className="h-3 w-3 mr-1" />
                    Bloquear
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400"
                    onClick={() => setAdminAction('unblock')}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Desbloquear
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 text-xs border-red-700/40 hover:bg-red-900/20 text-red-500"
                  onClick={() => setAdminAction('delete')}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Apagar Conta (devolver energia à ascendência)
                </Button>
              </div>
            )}

            {/* Game stats */}
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                Desempenho
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="h-3 w-3 text-green-400" />
                    <span className="text-[10px] text-muted-foreground">Vitórias</span>
                  </div>
                  <div className="text-lg font-bold text-green-400">{gameStats.wins}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-3 w-3 text-red-400" />
                    <span className="text-[10px] text-muted-foreground">Derrotas</span>
                  </div>
                  <div className="text-lg font-bold text-red-400">{gameStats.losses}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-3 w-3 text-blue-400" />
                    <span className="text-[10px] text-muted-foreground">Méd. Tentativas</span>
                  </div>
                  <div className="text-lg font-bold text-blue-400">{gameStats.avgAttempts}</div>
                </div>
                <div className="bg-muted/30 rounded-lg p-3 border border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-3 w-3 text-purple-400" />
                    <span className="text-[10px] text-muted-foreground">Melhor Tempo</span>
                  </div>
                  <div className="text-lg font-bold text-purple-400">
                    {gameStats.bestTime > 0
                      ? `${Math.floor(gameStats.bestTime / 60)}:${String(Math.floor(gameStats.bestTime % 60)).padStart(2, '0')}`
                      : '-'}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Ancestry */}
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <ArrowUpRight className="h-4 w-4 text-amber-400" />
                Ascendência ({ancestry.length})
              </h3>
              {ancestry.length === 0 ? (
                <div className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-3">
                  Conta raiz (sem ascendência)
                </div>
              ) : (
                <div className="space-y-1">
                  {ancestry.map((a) => {
                    const tc = getTierConfig(a.player_tier);
                    return (
                      <div key={a.id} className="flex items-center gap-2 text-xs bg-muted/20 rounded-lg p-2">
                        <ChevronUp className="h-3 w-3 text-muted-foreground" />
                        <span className="text-base">{a.emoji}</span>
                        <span className="font-medium">{a.name}</span>
                        <Badge variant="outline" className={`text-[9px] border ${tc.color}`}>
                          {tc.label}
                        </Badge>
                        <span className="ml-auto text-muted-foreground font-mono">
                          {formatEnergy(a.energy)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* Descendants */}
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <ArrowDownRight className="h-4 w-4 text-primary" />
                Descendência ({totalDescendants})
                {totalDescendants > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    • {formatEnergy(totalEnergyTree)} circulando
                  </span>
                )}
              </h3>
              {descendants.length === 0 ? (
                <div className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-3">
                  Nenhum descendente convidado
                </div>
              ) : (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {descendants.map((d) => {
                    const tc = getTierConfig(d.player_tier);
                    return (
                      <div
                        key={d.id}
                        className="flex items-center gap-2 text-xs bg-muted/20 rounded-lg p-2"
                        style={{ paddingLeft: `${8 + d.depth * 12}px` }}
                      >
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        <span className="text-base">{d.emoji}</span>
                        <span className="font-medium">{d.name}</span>
                        <Badge variant="outline" className={`text-[9px] border ${tc.color}`}>
                          {tc.label}
                        </Badge>
                        <span className="ml-auto text-muted-foreground font-mono text-[10px]">
                          {formatEnergy(d.energy)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* Game History */}
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-blue-400" />
                Histórico de Jogos ({gameStats.total})
              </h3>
              {historyLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : gameHistory && gameHistory.length > 0 ? (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {gameHistory.map((game: any) => (
                    <div key={game.id} className="flex items-center gap-2 text-xs bg-muted/20 rounded-lg p-2">
                      <span className={game.won ? 'text-green-400' : 'text-red-400'}>
                        {game.won ? '✅' : '❌'}
                      </span>
                      <Badge variant="outline" className="text-[9px]">
                        {game.game_mode === 'solo' ? 'Solo' : game.game_mode === 'arena' ? 'Arena' : game.game_mode}
                      </Badge>
                      <span className="text-muted-foreground">
                        {game.attempts} tent.
                      </span>
                      {game.time_remaining && (
                        <span className="text-muted-foreground">
                          {Math.floor(Number(game.time_remaining) / 60)}:{String(Math.floor(Number(game.time_remaining) % 60)).padStart(2, '0')}
                        </span>
                      )}
                      <span className="ml-auto text-muted-foreground text-[10px]">
                        {format(new Date(game.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-3">
                  Nenhum jogo registrado
                </div>
              )}
            </div>

            {/* Invite info */}
            <div className="text-xs text-muted-foreground bg-muted/20 rounded-lg p-3 space-y-1">
              <div>📩 Convites enviados: <strong>{balance.invitesSent}/{balance.maxInvites}</strong></div>
              {balance.costPerInvite > 0 && (
                <div>💰 Custo por convite: <strong>{formatEnergy(balance.costPerInvite)}</strong></div>
              )}
              {player.inviter_name && (
                <div>🔗 Convidado por: <strong>{player.inviter_name}</strong></div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>

    {/* Confirmation Dialogs */}
    <AlertDialog open={adminAction === 'zero'} onOpenChange={(o) => !o && setAdminAction(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Zerar Saldo
          </AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja zerar o saldo de <strong>{player.name}</strong>?
            <br />
            <span className="text-yellow-400">Saldo atual: {formatEnergy(player.energy)}</span>
            <br />
            Esta ação <strong>não pode ser desfeita</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAdminAction}
            disabled={isProcessing}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isProcessing ? 'Processando...' : 'Confirmar — Zerar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={adminAction === 'penalize'} onOpenChange={(o) => { if (!o) { setAdminAction(null); setPenaltyAmount(''); } }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-orange-400">
            <MinusCircle className="h-5 w-5" />
            Penalizar Jogador
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Deduzir energia de <strong>{player.name}</strong>
                <br />
                <span className="text-yellow-400">Saldo atual: {formatEnergy(player.energy)}</span>
              </p>
              <div>
                <label className="text-xs text-foreground mb-1 block">Valor da penalização (k$):</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={player.energy}
                  placeholder="Ex: 5.00"
                  value={penaltyAmount}
                  onChange={(e) => setPenaltyAmount(e.target.value)}
                  className="bg-background"
                />
                {penaltyAmount && !isNaN(parseFloat(penaltyAmount)) && (
                  <p className="text-xs mt-1 text-muted-foreground">
                    Novo saldo: <strong>{formatEnergy(Math.max(0, player.energy - parseFloat(penaltyAmount)))}</strong>
                  </p>
                )}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAdminAction}
            disabled={isProcessing || !penaltyAmount || isNaN(parseFloat(penaltyAmount)) || parseFloat(penaltyAmount) <= 0}
            className="bg-orange-500 text-white hover:bg-orange-600"
          >
            {isProcessing ? 'Processando...' : `Penalizar -${penaltyAmount || '0'} k$`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={adminAction === 'block'} onOpenChange={(o) => !o && setAdminAction(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-400">
            <Ban className="h-5 w-5" />
            Bloquear Jogador
          </AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja bloquear <strong>{player.name}</strong>?
            <br />
            O jogador não poderá mais participar de arenas ou corridas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAdminAction}
            disabled={isProcessing}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            {isProcessing ? 'Processando...' : 'Confirmar — Bloquear'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={adminAction === 'unblock'} onOpenChange={(o) => !o && setAdminAction(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="h-5 w-5" />
            Desbloquear Jogador
          </AlertDialogTitle>
          <AlertDialogDescription>
            Desbloquear <strong>{player.name}</strong> e restaurar acesso normal?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAdminAction}
            disabled={isProcessing}
            className="bg-emerald-500 text-white hover:bg-emerald-600"
          >
            {isProcessing ? 'Processando...' : 'Confirmar — Desbloquear'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog open={adminAction === 'delete'} onOpenChange={(o) => !o && setAdminAction(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-500">
            <Trash2 className="h-5 w-5" />
            Apagar Conta (Teste)
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Tem certeza que deseja <strong>apagar permanentemente</strong> a conta de <strong>{player.name}</strong>?
              </p>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-sm">
                <p className="text-emerald-400 font-medium">💰 Energia será devolvida:</p>
                <p className="text-muted-foreground text-xs mt-1">
                  • <strong>{formatEnergy(player.energy)}</strong> devolvido ao ascendente direto
                </p>
                {totalDescendants > 0 && (
                  <p className="text-muted-foreground text-xs">
                    • <strong>{totalDescendants} descendente(s)</strong> também serão apagados e sua energia ({formatEnergy(totalEnergyTree)}) devolvida recursivamente
                  </p>
                )}
              </div>
              <p className="text-xs text-destructive font-medium">
                ⚠️ Histórico de jogos, arenas e referrals serão apagados. Nada se perde em k$ — tudo volta à cadeia.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleAdminAction}
            disabled={isProcessing}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isProcessing ? 'Apagando...' : `Confirmar — Apagar ${player.name}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
