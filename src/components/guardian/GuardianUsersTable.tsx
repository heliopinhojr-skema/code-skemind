/**
 * GuardianUsersTable - Lista de usuários agrupados por tier com filtros e busca
 * Mostra saldo total, bloqueado e disponível por jogador
 * Click em qualquer jogador abre o PlayerDetailDrawer
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePlayersList, useReferralTree, useIsMasterAdmin } from '@/hooks/useGuardianData';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PlayerDetailDrawer } from './PlayerDetailDrawer';
import { Search, Users, Shield, Crown, Swords, Gamepad2, Zap, Rocket, Star, Lock, Unlock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { calculateBalanceBreakdown, formatEnergy } from '@/lib/tierEconomy';
import { toast } from 'sonner';

// Tier labels match the player_tier values set by register_player
const TIER_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; glow: string }> = {
  'master_admin': { 
    label: 'CD HX', 
    icon: <Shield className="h-3 w-3" />, 
    color: 'text-red-400 bg-red-400/10 border-red-400/30',
    glow: 'from-red-500 to-orange-500 shadow-red-500/50',
  },
  'Criador': { 
    label: 'Criador', 
    icon: <Star className="h-3 w-3" />, 
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    glow: 'from-amber-400 to-yellow-500 shadow-amber-400/50',
  },
  'Grão Mestre': { 
    label: 'Grão Mestre', 
    icon: <Crown className="h-3 w-3" />, 
    color: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
    glow: 'from-purple-500 to-pink-500 shadow-purple-500/50',
  },
  'Mestre': { 
    label: 'Mestre', 
    icon: <Swords className="h-3 w-3" />, 
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    glow: 'from-blue-500 to-cyan-400 shadow-blue-500/50',
  },
  'Boom': { 
    label: 'Boom', 
    icon: <Rocket className="h-3 w-3" />, 
    color: 'text-green-400 bg-green-400/10 border-green-400/30',
    glow: 'from-green-500 to-emerald-400 shadow-green-500/50',
  },
  'Ploft': { 
    label: 'Ploft', 
    icon: <Gamepad2 className="h-3 w-3" />, 
    color: 'text-muted-foreground bg-muted/30 border-border',
    glow: 'from-slate-400 to-slate-500 shadow-slate-400/30',
  },
  'jogador': { 
    label: 'Ploft', 
    icon: <Gamepad2 className="h-3 w-3" />, 
    color: 'text-muted-foreground bg-muted/30 border-border',
    glow: 'from-slate-400 to-slate-500 shadow-slate-400/30',
  },
};

const TIER_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'Criador', label: 'Criadores' },
  { id: 'Grão Mestre', label: 'GMs' },
  { id: 'Mestre', label: 'Mestres' },
  { id: 'Boom', label: 'Booms' },
  { id: 'Ploft', label: 'Plofts' },
];

function getTierConfig(tier: string | null) {
  return TIER_CONFIG[tier || 'jogador'] || TIER_CONFIG['jogador'];
}

export function GuardianUsersTable() {
  const { data: players, isLoading, error } = usePlayersList();
  const { data: referralNodes } = useReferralTree();
  const { data: isMasterAdmin } = useIsMasterAdmin();
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  // Build a map of player_id → invites_sent count from referral data
  const invitesSentMap = useMemo(() => {
    const map = new Map<string, number>();
    referralNodes?.forEach(n => {
      map.set(n.id, n.invites_sent);
    });
    return map;
  }, [referralNodes]);

  const handleQuickDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.rpc('admin_delete_player', {
        p_player_id: deleteTarget.id,
      });
      if (error) throw error;
      toast.success(`${deleteTarget.name} apagado — energia devolvida à ascendência`);
      queryClient.invalidateQueries({ queryKey: ['guardian-players-list'] });
      queryClient.invalidateQueries({ queryKey: ['guardian-referral-tree'] });
      queryClient.invalidateQueries({ queryKey: ['guardian-dashboard-stats'] });
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    
    let filtered = players;
    
    // Filter by tier
    if (tierFilter !== 'all') {
      // Match both display tier and legacy 'jogador' when filtering for Ploft
      filtered = filtered.filter(p => {
        const normalizedTier = (p.player_tier === 'jogador' || !p.player_tier) ? 'Ploft' : p.player_tier;
        return normalizedTier === tierFilter;
      });
    }
    
    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.invite_code.toLowerCase().includes(searchLower) ||
        p.invited_by_name?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [players, search, tierFilter]);

  // Count per tier
  const tierCounts = useMemo(() => {
    if (!players) return {};
    const counts: Record<string, number> = {};
    players.forEach(p => {
      // Normalize 'jogador' → 'Ploft' for display grouping
      const tier = (p.player_tier === 'jogador' || !p.player_tier) ? 'Ploft' : p.player_tier;
      counts[tier] = (counts[tier] || 0) + 1;
    });
    return counts;
  }, [players]);

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        Erro ao carregar usuários: {error.message}
      </div>
    );
  }

  return (
    <>
    <Card className="bg-card/90 backdrop-blur-sm border-border/60">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários ({players?.length || 0})
          </CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full sm:w-64 bg-background/80"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tier filter tabs */}
        <Tabs value={tierFilter} onValueChange={setTierFilter}>
          <TabsList className="flex flex-wrap h-auto gap-1 bg-card/80 border border-border/50 p-1">
            {TIER_TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
              >
                {tab.label}
                {tab.id !== 'all' && tierCounts[tab.id] ? (
                  <span className="ml-1 text-[10px] opacity-70">({tierCounts[tab.id]})</span>
                ) : tab.id === 'all' ? (
                  <span className="ml-1 text-[10px] opacity-70">({players?.length || 0})</span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Compact Player Cards */}
        <div className="space-y-1.5">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
            ))
          ) : filteredPlayers.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">
              {search || tierFilter !== 'all' ? 'Nenhum usuário encontrado' : 'Nenhum usuário registrado'}
            </div>
          ) : (
            filteredPlayers.map((player) => {
              const tierConfig = getTierConfig(player.player_tier);
              const invitesSent = invitesSentMap.get(player.id) || 0;
              const balance = calculateBalanceBreakdown(Number(player.energy), player.player_tier, invitesSent);
              
              return (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 bg-card/50 hover:bg-primary/5 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedPlayerId(player.id);
                    setDrawerOpen(true);
                  }}
                >
                  {/* Avatar — glowing orb */}
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${tierConfig.glow} flex items-center justify-center flex-shrink-0 shadow-lg relative`}>
                    <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${tierConfig.glow} blur-md opacity-40`} />
                    <span className="text-lg leading-none relative z-10 drop-shadow-md">{player.emoji || '😌'}</span>
                  </div>
                  
                  {/* Info principal - nome + tier na mesma linha */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium text-sm truncate">{player.name}</span>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 border ${tierConfig.color}`}>
                        <span className="flex items-center gap-0.5">
                          {tierConfig.icon}
                          {tierConfig.label}
                        </span>
                      </Badge>
                      {player.invited_by_name && (
                        <span className="text-[10px] text-muted-foreground truncate">
                          ← {player.invited_by_name}
                        </span>
                      )}
                    </div>
                    {/* Saldos + convites na segunda linha */}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="font-mono text-xs text-foreground/80 flex items-center gap-0.5">
                        <Zap className="h-3 w-3 text-yellow-500" />
                        {formatEnergy(balance.total)}
                      </span>
                      {balance.locked > 0 && (
                        <>
                          <span className="font-mono text-[10px] text-orange-400 flex items-center gap-0.5">
                            <Lock className="h-2.5 w-2.5" />
                            {formatEnergy(balance.locked)}
                          </span>
                          <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-0.5">
                            <Unlock className="h-2.5 w-2.5" />
                            {formatEnergy(balance.available)}
                          </span>
                        </>
                      )}
                      {balance.maxInvites > 0 && (
                        <span className="text-[10px] text-muted-foreground">
                          📨 {balance.invitesSent}/{balance.maxInvites}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground/60 ml-auto">
                        {format(new Date(player.created_at), "dd/MM/yy", { locale: ptBR })}
                      </span>
                    </div>
                    {/* Barra de meta de convites */}
                    {balance.maxInvites > 0 && (
                      <div className="mt-1.5 w-full">
                        <div className="w-full h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          {(() => {
                            const pct = Math.min(100, (balance.invitesSent / balance.maxInvites) * 100);
                            const barColor = pct >= 80 ? 'bg-emerald-500' 
                              : pct >= 40 ? 'bg-amber-400' 
                              : pct > 0 ? 'bg-orange-500' 
                              : 'bg-destructive/40';
                            return (
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${Math.max(pct, 3)}%` }}
                              />
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delete button */}
                  {isMasterAdmin && player.player_tier !== 'master_admin' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 flex-shrink-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ id: player.id, name: player.name });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>

    {/* Player Detail Drawer */}
    <PlayerDetailDrawer
      playerId={selectedPlayerId}
      open={drawerOpen}
      onOpenChange={setDrawerOpen}
      allNodes={referralNodes || []}
      isMasterAdmin={isMasterAdmin === true}
    />

    {/* Quick Delete Confirmation */}
    <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Apagar {deleteTarget?.name}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            A conta será removida permanentemente. Toda a energia será devolvida à ascendência 
            e todos os descendentes também serão apagados recursivamente.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleQuickDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Apagando...' : 'Confirmar exclusão'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
