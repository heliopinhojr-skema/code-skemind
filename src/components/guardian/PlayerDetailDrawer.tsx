/**
 * PlayerDetailDrawer - Drawer lateral com detalhes completos de um jogador
 * Mostra: perfil, saldo, ascendência, descendência, histórico de jogos
 */

import { useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ReferralNode } from '@/hooks/useGuardianData';
import { calculateBalanceBreakdown, formatEnergy } from '@/lib/tierEconomy';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Zap, Trophy, Clock, Users, GitBranch, ChevronUp, ChevronDown,
  Shield, Star, Crown, Swords, Rocket, Gamepad2, Lock, Unlock,
  Target, Calendar, ArrowUpRight, ArrowDownRight, TrendingUp
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

export function PlayerDetailDrawer({ playerId, open, onOpenChange, allNodes }: PlayerDetailDrawerProps) {
  const player = useMemo(() => allNodes.find(n => n.id === playerId), [allNodes, playerId]);
  const { data: gameHistory, isLoading: historyLoading } = usePlayerGameHistory(playerId);

  // Build ancestry (who invited this player, and their inviter, etc.)
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

  // Build descendants (who this player invited, recursively)
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

  // Stats
  const totalDescendants = descendants.length;
  const totalEnergyTree = descendants.reduce((sum, d) => sum + d.energy, 0);
  
  // Game stats from history
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

  // Time since registration
  const timeSinceRegistration = player 
    ? formatDistanceToNow(new Date(player.created_at), { locale: ptBR, addSuffix: true })
    : '';

  if (!player) return null;

  const tierConfig = getTierConfig(player.player_tier);
  const balance = calculateBalanceBreakdown(player.energy, player.player_tier, player.invites_sent);

  return (
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

            {/* Ancestry (who invited them) */}
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
                  {ancestry.map((a, i) => {
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
  );
}
