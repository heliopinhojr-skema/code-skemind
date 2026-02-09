/**
 * GuardianDashboard - Dashboard com métricas gerais da plataforma
 * Cards clicáveis para navegar entre tabs
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useDashboardStats, useReferralTree } from '@/hooks/useGuardianData';
import { useSupabasePlayer } from '@/hooks/useSupabasePlayer';
import { useInviteCodes } from '@/hooks/useInviteCodes';
import { Users, Zap, Box, Gift, Trophy, TrendingUp, Copy, Check, Share2, Link, ArrowDownRight, Dna } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { calculateBalanceBreakdown, formatEnergy as formatEnergyUtil } from '@/lib/tierEconomy';

interface GuardianDashboardProps {
  onNavigateTab?: (tab: string) => void;
}

export function GuardianDashboard({ onNavigateTab }: GuardianDashboardProps) {
  const { data: stats, isLoading, error } = useDashboardStats();
  const { data: referralNodes } = useReferralTree();
  const { player } = useSupabasePlayer();
  const { codes, isLoading: isLoadingCodes, isAutoGenerating, unusedCount, usedCount } = useInviteCodes(player?.id || null, player?.playerTier || null);
  const [copied, setCopied] = useState<string | null>(null);

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
    const link = `${window.location.origin}/?convite=${code}`;
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
                  ∑ Total Sistema
                </p>
                <p className="text-lg font-bold text-primary">
                  {formatEnergyUtil(systemTotal)}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
