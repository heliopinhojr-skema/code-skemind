/**
 * GuardianDashboard - Dashboard com métricas gerais da plataforma
 * Cards clicáveis para navegar entre tabs
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useDashboardStats, useReferralTree, useSkemaBoxTransactions } from '@/hooks/useGuardianData';
import { useSupabasePlayer } from '@/hooks/useSupabasePlayer';
import { useInviteCodes } from '@/hooks/useInviteCodes';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Zap, Box, Gift, Trophy, TrendingUp, Copy, Check, Share2, Link, ArrowDownRight, Dna, TreePine, Heart, Loader2, Calendar, Receipt, Radio, UserPlus, Activity, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { calculateBalanceBreakdown, formatEnergy as formatEnergyUtil, getTierEconomy } from '@/lib/tierEconomy';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GuardianDashboardProps {
  onNavigateTab?: (tab: string) => void;
}

export function GuardianDashboard({ onNavigateTab }: GuardianDashboardProps) {
  const { data: stats, isLoading, error } = useDashboardStats();
  const { data: referralNodes } = useReferralTree();
  const { data: sboxTransactions } = useSkemaBoxTransactions();
  const { player } = useSupabasePlayer();
  const { codes, isLoading: isLoadingCodes, isAutoGenerating, unusedCount, usedCount } = useInviteCodes(player?.id || null, player?.playerTier || null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showDonate, setShowDonate] = useState(false);
  const [donateAmount, setDonateAmount] = useState('');
  const [isDonating, setIsDonating] = useState(false);

  // Fetch detailed referral data with inviter/invited info
  const { data: detailedReferrals } = useQuery({
    queryKey: ['guardian-detailed-referrals'],
    queryFn: async () => {
      const { data: referrals, error: refErr } = await supabase
        .from('referrals')
        .select('inviter_id, invited_id, reward_amount, reward_credited, created_at');
      if (refErr) throw refErr;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, player_tier');

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return referrals?.map(r => ({
        ...r,
        inviterName: profileMap.get(r.inviter_id)?.name || '?',
        inviterTier: profileMap.get(r.inviter_id)?.player_tier || '?',
        invitedName: profileMap.get(r.invited_id)?.name || '?',
        invitedTier: profileMap.get(r.invited_id)?.player_tier || '?',
        day: r.created_at.slice(0, 10),
      })) || [];
    },
    staleTime: 30_000,
  });

  const botCount = stats?.botTreasuryBotCount || 99;

  // Real-time online player count via presence
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlinePlayersList, setOnlinePlayersList] = useState<{ id: string; name: string; emoji: string; status: string }[]>([]);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const channel = supabase.channel('skema-lobby', {
      config: { presence: { key: 'guardian-watcher' } },
    });
    channelRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const uniquePlayers = new Map<string, { id: string; name: string; emoji: string; status: string }>();
      Object.values(state).forEach((presences: any) => {
        presences.forEach((p: any) => {
          if (p.id && p.id !== 'guardian' && p.name) {
            uniquePlayers.set(p.id, { id: p.id, name: p.name, emoji: p.emoji || '🎮', status: p.status || 'online' });
          }
        });
      });
      setOnlineCount(uniquePlayers.size);
      setOnlinePlayersList(Array.from(uniquePlayers.values()));
    });

    channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ id: 'guardian', role: 'watcher', joinedAt: new Date().toISOString() });
      }
    });

    return () => { channel.unsubscribe(); channelRef.current = null; };
  }, []);

  // Real-time new player growth tracker - listens for profile inserts
  const [newPlayersToday, setNewPlayersToday] = useState(0);
  const [recentJoins, setRecentJoins] = useState<{ name: string; emoji: string; tier: string; time: string }[]>([]);

  useEffect(() => {
    // Get local day boundaries in UTC for correct timezone filtering
    const localStart = new Date();
    localStart.setHours(0, 0, 0, 0);
    const todayStartUTC = localStart.toISOString();

    supabase
      .from('profiles')
      .select('id, name, emoji, player_tier, created_at')
      .neq('player_tier', 'master_admin')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) {
          const todayPlayers = data.filter(p => p.created_at >= todayStartUTC);
          setNewPlayersToday(todayPlayers.length);
          setRecentJoins(data.slice(0, 5).map(p => ({
            name: p.name, emoji: p.emoji,
            tier: p.player_tier === 'jogador' ? 'Ploft' : (p.player_tier || 'Ploft'),
            time: format(new Date(p.created_at), "dd/MM HH:mm", { locale: ptBR }),
          })));
        }
      });

    // Subscribe to realtime inserts
    const sub = supabase
      .channel('guardian-new-players')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
        const p = payload.new as any;
        if (p.player_tier !== 'master_admin') {
          setNewPlayersToday(prev => prev + 1);
          setRecentJoins(prev => [{
            name: p.name, emoji: p.emoji,
            tier: p.player_tier === 'jogador' ? 'Ploft' : (p.player_tier || 'Ploft'),
            time: format(new Date(), "HH:mm", { locale: ptBR }),
          }, ...prev].slice(0, 5));
        }
      })
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, []);

  const handleDonateToBots = useCallback(async () => {
    const totalAmount = parseFloat(donateAmount);
    if (!totalAmount || totalAmount <= 0 || !player?.id) return;
    
    if ((player.energy || 0) < totalAmount) {
      toast.error('Saldo insuficiente');
      return;
    }

    setIsDonating(true);
    try {
      // 1. Debit from admin
      const { error: debitErr } = await supabase.rpc('update_player_energy', {
        p_player_id: player.id,
        p_amount: -totalAmount,
      });
      if (debitErr) throw debitErr;

      // 2. Credit to Bot Treasury
      const { error: creditErr } = await supabase.rpc('update_bot_treasury', {
        p_amount: totalAmount,
        p_description: `Doação HX: k$ ${totalAmount.toFixed(2)} (${(totalAmount / botCount).toFixed(4)}/bot)`,
      });
      if (creditErr) throw creditErr;

      // 3. Update balance_per_bot
      const newBalance = (stats?.botTreasuryBalance || 0) + totalAmount;
      const perBot = Math.round((newBalance / botCount) * 100) / 100;
      await supabase.from('bot_treasury').update({ 
        balance_per_bot: perBot 
      }).eq('id', '00000000-0000-0000-0000-000000000002');

      toast.success(`Doado k$ ${totalAmount.toFixed(2)} para ${botCount} bots (k$ ${(totalAmount / botCount).toFixed(4)}/bot)`);
      setDonateAmount('');
      setShowDonate(false);
      // Refresh data
      window.location.reload();
    } catch (e: any) {
      toast.error('Erro ao doar: ' + (e.message || 'desconhecido'));
    } finally {
      setIsDonating(false);
    }
  }, [donateAmount, player, botCount, stats]);

  // Calculate total locked and available from all non-HX players
  const { totalLocked, totalAvailable } = (() => {
    if (!referralNodes) return { totalLocked: 0, totalAvailable: 0 };
    let locked = 0, available = 0;
    referralNodes.filter(n => n.player_tier !== 'master_admin').forEach(n => {
      const bal = calculateBalanceBreakdown(n.energy, n.player_tier, n.invites_sent);
      locked += bal.locked;
      available += bal.available;
    });
    return { totalLocked: locked, totalAvailable: available };
  })();

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success('Código copiado!');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const handleCopyLink = async (code: string) => {
    const link = `${window.location.origin}/auth?convite=${code}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(`link-${code}`);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        Erro ao carregar métricas: {error.message}
      </div>
    );
  }

  const metrics = [
    {
      title: 'Jogadores',
      value: stats?.totalPlayers || 0,
      icon: Users,
      format: (v: number) => v.toString(),
      tab: 'users',
      clickable: true,
    },
    {
      title: 'Energia Circulando',
      value: stats?.totalEnergy || 0,
      icon: Zap,
      format: (v: number) => formatEnergyUtil(v),
      subtitle: `🔒 ${formatEnergyUtil(totalLocked)} bloq. | 🔓 ${formatEnergyUtil(totalAvailable)} livre`,
      tab: 'users',
      clickable: true,
    },
    {
      title: 'Skema Box',
      value: stats?.skemaBoxBalance || 0,
      icon: Box,
      format: (v: number) => formatEnergyUtil(v),
      subtitle: 'Rake acumulado de corridas',
      tab: 'skemabox',
      clickable: true,
    },
    {
      title: 'Convites',
      value: stats?.totalReferrals || 0,
      subtitle: `${stats?.creditedReferrals || 0} aceitos`,
      icon: Gift,
      format: (v: number) => v.toString(),
      tab: 'referrals',
      clickable: true,
    },
    {
      title: 'Distribuído',
      value: stats?.totalDistributed || 0,
      icon: ArrowDownRight,
      format: (v: number) => formatEnergyUtil(v),
      subtitle: 'k$ transferido via convites',
      tab: 'referrals',
      clickable: true,
    },
    {
      title: 'Corridas',
      value: stats?.totalRaces || 0,
      icon: Trophy,
      format: (v: number) => v.toString(),
      tab: 'races',
      clickable: true,
    },
  ];

  const systemTotal = stats?.systemTotal || 0;

  return (
    <div className="space-y-6">
      {/* Card de Auditoria Econômica */}
      <Card className="border border-border/60 bg-card/90 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Balanço do Sistema
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Distribuição total de k$ — energia só é transferida, nunca criada
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="bg-background/60 rounded-lg p-3 border border-border/40">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3" /> HX (Tesouro)
                </p>
                <p className="text-lg font-bold text-foreground">
                  {formatEnergyUtil(stats?.hxEnergy || 0)}
                </p>
              </div>
              <div className="bg-background/60 rounded-lg p-3 border border-border/40">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Jogadores
                </p>
                <p className="text-lg font-bold text-foreground">
                  {formatEnergyUtil(stats?.playersEnergy || 0)}
                </p>
              </div>
              <div className="bg-background/60 rounded-lg p-3 border border-border/40">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  🤖 Bot Treasury
                </p>
                <p className="text-lg font-bold text-foreground">
                  {formatEnergyUtil(stats?.botTreasuryBalance || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatEnergyUtil((stats?.botTreasuryBalance || 0) / botCount)}/bot
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full h-7 text-xs gap-1"
                  onClick={() => setShowDonate(!showDonate)}
                >
                  <Heart className="h-3 w-3" />
                  Doar
                </Button>
              </div>
              <div className="bg-background/60 rounded-lg p-3 border border-border/40">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Box className="h-3 w-3" /> Skema Box
                </p>
                <p className="text-lg font-bold text-foreground">
                  {formatEnergyUtil(stats?.skemaBoxBalance || 0)}
                </p>
              </div>
              <div className="bg-primary/10 rounded-lg p-3 border border-primary/30">
                <p className="text-xs text-muted-foreground font-medium">
                  ∑ Total Sistema (imutável)
                </p>
                <p className="text-lg font-bold text-primary">
                  {formatEnergyUtil(10_000_000)}
                </p>
              </div>
            </div>

            {/* Painel de Doação para Bots */}
            {showDonate && (
              <div className="mt-3 bg-background/60 rounded-lg p-3 border border-border/40 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Doar de HX → Bot Treasury (valor total, dividido por {botCount} bots)
                </p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Valor total k$"
                    value={donateAmount}
                    onChange={e => setDonateAmount(e.target.value)}
                    className="h-8 text-sm"
                    min="0"
                    step="0.01"
                  />
                  <Button
                    size="sm"
                    className="h-8 gap-1"
                    onClick={handleDonateToBots}
                    disabled={isDonating || !donateAmount || parseFloat(donateAmount) <= 0}
                  >
                    {isDonating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Heart className="h-3 w-3" />}
                    Doar
                  </Button>
                </div>
                {donateAmount && parseFloat(donateAmount) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    = {formatEnergyUtil(parseFloat(donateAmount) / botCount)} por bot
                  </p>
                )}
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Live Counters Strip */}
      <div className="grid grid-cols-3 gap-3">
        {/* Online agora */}
        <Card className="bg-card/90 backdrop-blur-sm border-border/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <Radio className="h-5 w-5 text-primary" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-ping" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{onlineCount}</p>
                <p className="text-[10px] text-muted-foreground">online agora</p>
              </div>
            </div>
            {onlinePlayersList.length > 0 ? (
              <div className="space-y-0.5 max-h-24 overflow-y-auto">
                {onlinePlayersList.map((p) => (
                  <div key={p.id} className="flex items-center gap-1 text-[10px]">
                    <span>{p.emoji}</span>
                    <span className="text-foreground truncate">{p.name}</span>
                    <Badge variant="outline" className={cn(
                      "text-[8px] px-1 py-0 h-3.5 shrink-0",
                      p.status === 'playing' ? 'border-primary text-primary' : 'border-muted-foreground'
                    )}>
                      {p.status === 'playing' ? '🎮' : '🟢'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">Ninguém no lobby</p>
            )}
          </CardContent>
        </Card>

        {/* Novos hoje */}
        <Card className="bg-card/90 backdrop-blur-sm border-border/60">
          <CardContent className="p-3 flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">+{newPlayersToday}</p>
              <p className="text-[10px] text-muted-foreground">novos hoje</p>
            </div>
          </CardContent>
        </Card>

        {/* Crescimento recente */}
        <Card className="bg-card/90 backdrop-blur-sm border-border/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-[10px] text-muted-foreground">Últimos registros</span>
            </div>
            {recentJoins.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">Nenhum registro</p>
            ) : (
              <div className="space-y-0.5">
                {recentJoins.map((j, i) => (
                  <div key={i} className="flex items-center gap-1 text-[10px]">
                    <span>{j.emoji}</span>
                    <span className="text-foreground truncate">{j.name}</span>
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 shrink-0">{j.tier}</Badge>
                    <span className="text-muted-foreground ml-auto shrink-0">{j.time}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerta: Jogadores que atingiram o limite de convites */}
      {referralNodes && (() => {
        const playersAtLimit = referralNodes
          .filter(n => n.player_tier !== 'master_admin' && n.player_tier !== 'jogador' && n.player_tier !== 'Ploft')
          .map(n => {
            const config = getTierEconomy(n.player_tier);
            if (config.maxInvites <= 0) return null;
            return {
              id: n.id,
              name: n.name,
              emoji: n.emoji,
              tier: n.player_tier,
              invitesSent: n.invites_sent,
              maxInvites: config.maxInvites,
              invitedTierLabel: config.invitedTierLabel,
            };
          })
          .filter((p): p is NonNullable<typeof p> => p !== null && p.invitesSent >= p.maxInvites);

        if (playersAtLimit.length === 0) return null;

        return (
          <Card className="border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Jogadores com Slots Esgotados ({playersAtLimit.length})
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                Esses jogadores usaram todos os convites do tier — avaliar se devem receber mais slots
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
                {playersAtLimit.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-muted/30">
                    <span>{p.emoji}</span>
                    <span className="font-medium text-foreground truncate flex-1">{p.name}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{p.tier}</Badge>
                    <span className="text-amber-400 font-mono shrink-0">
                      {p.invitesSent}/{p.maxInvites} {p.invitedTierLabel}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Visão Geral */}
      <h2 className="text-xl font-semibold text-foreground">Visão Geral</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((metric) => (
          <Card 
            key={metric.title} 
            className={cn(
              "bg-card/90 backdrop-blur-sm border-border/60 transition-all",
              metric.clickable && onNavigateTab && "cursor-pointer hover:border-primary/40 hover:bg-card/95 hover:scale-[1.02]"
            )}
            onClick={() => metric.clickable && onNavigateTab?.(metric.tab)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <metric.icon className="h-4 w-4" />
                {metric.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-foreground">
                    {metric.format(metric.value)}
                  </div>
                  {metric.subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {metric.subtitle}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Evolução Diária de Convites */}
      {detailedReferrals && detailedReferrals.length > 0 && (
        <Card className="border border-border/60 bg-card/90 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Evolução Diária de Convites
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Convites aceitos por dia — quem convidou, quem entrou, tier e valor transferido
            </p>
          </CardHeader>
          <CardContent>
            {(() => {
              // Group by day
              const byDay = new Map<string, typeof detailedReferrals>();
              detailedReferrals.forEach(r => {
                const list = byDay.get(r.day) || [];
                list.push(r);
                byDay.set(r.day, list);
              });
              const sortedDays = [...byDay.keys()].sort().reverse();

              return (
                <div className="space-y-4">
                  {sortedDays.map(day => {
                    const refs = byDay.get(day)!;
                    const dayTotal = refs.reduce((s, r) => s + Number(r.reward_amount), 0);
                    // Count by invited tier
                    const tierCounts: Record<string, number> = {};
                    refs.forEach(r => {
                      const t = r.invitedTier === 'jogador' ? 'Ploft' : (r.invitedTier || 'Ploft');
                      tierCounts[t] = (tierCounts[t] || 0) + 1;
                    });

                    return (
                      <div key={day} className="bg-background/60 rounded-lg border border-border/40 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-mono">
                              {format(new Date(day + 'T12:00:00'), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {refs.length} convite(s)
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {Object.entries(tierCounts).map(([tier, count]) => (
                              <span key={tier} className="text-[10px] text-muted-foreground">
                                {tier}: {count}
                              </span>
                            ))}
                            <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
                              k$ {formatEnergyUtil(dayTotal)} transferido
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {refs.map((r, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-muted/30">
                              <span className="text-muted-foreground shrink-0">
                                {r.inviterTier === 'master_admin' ? 'HX' : r.inviterName}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-medium text-foreground">{r.invitedName}</span>
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {r.invitedTier === 'jogador' ? 'Ploft' : r.invitedTier}
                              </Badge>
                              <span className="ml-auto font-mono text-foreground shrink-0">
                                k$ {formatEnergyUtil(Number(r.reward_amount))}
                              </span>
                              {r.reward_credited ? (
                                <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <span className="text-[9px] text-orange-400 shrink-0">pendente</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Extrato de Transações — Taxas Administrativas */}
      {sboxTransactions && sboxTransactions.length > 0 && (
        <Card className="border border-border/60 bg-card/90 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Extrato de Taxas & Receitas (Skema Box)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Todas as taxas administrativas na fonte — arenas (9,09%), transferências (6,43%) e corridas (k$ 0,10)
            </p>
          </CardHeader>
          <CardContent>
            {(() => {
              // Group by type and summarize
              const byType: Record<string, { count: number; total: number }> = {};
              sboxTransactions.forEach(t => {
                if (!byType[t.type]) byType[t.type] = { count: 0, total: 0 };
                byType[t.type].count++;
                byType[t.type].total += t.amount;
              });

              const typeLabels: Record<string, string> = {
                arena_rake: '🎮 Rake de Arenas (9,09%)',
                transfer_tax: '💸 Taxa de Transferência (6,43%)',
                official_rake: '🏆 Taxa de Corrida Oficial (k$ 0,10)',
                correction: '🔧 Correção/Ajuste',
              };

              return (
                <div className="space-y-3">
                  {/* Resumo por tipo */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    {Object.entries(byType).map(([type, data]) => (
                      <div key={type} className="bg-background/60 rounded-lg p-2 border border-border/40 text-center">
                        <p className="text-[10px] text-muted-foreground">{typeLabels[type] || type}</p>
                        <p className="text-sm font-bold text-foreground">{formatEnergyUtil(data.total)}</p>
                        <p className="text-[10px] text-muted-foreground">{data.count} operação(ões)</p>
                      </div>
                    ))}
                  </div>

                  {/* Lista detalhada (últimas 20) */}
                  <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                    {sboxTransactions.slice(0, 30).map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-muted/30">
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {format(new Date(t.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                        <Badge variant="outline" className={cn("text-[10px] shrink-0", 
                          t.type === 'transfer_tax' ? 'border-amber-400/30 text-amber-400' :
                          t.type === 'arena_rake' ? 'border-blue-400/30 text-blue-400' :
                          t.type === 'official_rake' ? 'border-purple-400/30 text-purple-400' :
                          'border-border'
                        )}>
                          {t.type === 'transfer_tax' ? '💸 Transf.' :
                           t.type === 'arena_rake' ? '🎮 Arena' :
                           t.type === 'official_rake' ? '🏆 Corrida' : t.type}
                        </Badge>
                        <span className="text-muted-foreground truncate flex-1">
                          {t.description || '-'}
                        </span>
                        <span className="font-mono font-medium text-emerald-400 shrink-0">
                          +{formatEnergyUtil(t.amount)}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          saldo: {formatEnergyUtil(t.balance_after)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Seção de Códigos DNA Únicos */}
      <Card className="bg-gradient-to-r from-primary/20 to-primary/5 border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Dna className="h-5 w-5 text-primary" />
              Códigos DNA de Convite
            </CardTitle>
            <div className="flex items-center gap-2">
              {isAutoGenerating && (
                <Badge variant="outline" className="text-xs animate-pulse border-primary/40 text-primary">
                  Gerando...
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {unusedCount} livres / {codes.length} total
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Cada código é único e de uso único — compartilhe individualmente
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoadingCodes ? (
            <Skeleton className="h-20 w-full" />
          ) : codes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum código disponível para seu tier
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {codes.map((code) => {
                const isUsed = !!code.usedById;
                return (
                  <div
                    key={code.id}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 border transition-colors",
                      isUsed
                        ? "bg-muted/30 border-border/30 opacity-60"
                        : "bg-background/80 border-primary/20 hover:border-primary/40"
                    )}
                  >
                    <div className="flex-1 font-mono text-sm font-bold tracking-wider">
                      <span className={isUsed ? "text-muted-foreground line-through" : "text-primary"}>
                        {code.code}
                      </span>
                    </div>
                    {isUsed ? (
                      <Badge variant="outline" className="text-xs border-muted text-muted-foreground">
                        ✓ {code.usedByName || 'usado'}
                      </Badge>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopyCode(code.code)}
                          title="Copiar código"
                        >
                          {copied === code.code ? (
                            <Check className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopyLink(code.code)}
                          title="Copiar link"
                        >
                          {copied === `link-${code.code}` ? (
                            <Check className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Link className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
            🧬 Cada código DNA é exclusivo do seu perfil. Convidados herdam tier e saldo baseado na hierarquia SKEMA.
          </p>
        </CardContent>
      </Card>

      {/* Descendência Direta — quem o player já convidou */}
      {(() => {
        const myInviteCode = player?.inviteCode;
        const descendants = referralNodes?.filter(n => n.invited_by === myInviteCode) || [];
        if (descendants.length === 0) return null;
        return (
          <Card className="border border-border/60 bg-card/90 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <TreePine className="h-5 w-5 text-primary" />
                Descendência Direta
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {descendants.length} jogador(es) convidado(s) por você
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {descendants.map(d => (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-background/60 border border-border/40"
                  >
                    <span className="text-xl">{d.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.player_tier || 'Ploft'} · k$ {formatEnergyUtil(d.energy)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {d.total_invited > 0 && `${d.total_invited} convite(s)`}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {d.invite_code}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

    </div>
  );
}
