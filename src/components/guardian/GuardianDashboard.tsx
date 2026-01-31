/**
 * GuardianDashboard - Dashboard com métricas gerais da plataforma
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardStats } from '@/hooks/useGuardianData';
import { useSupabasePlayer } from '@/hooks/useSupabasePlayer';
import { Users, Zap, Box, Gift, Trophy, TrendingUp, Copy, Check, Share2, Link } from 'lucide-react';
import { toast } from 'sonner';

export function GuardianDashboard() {
  const { data: stats, isLoading, error } = useDashboardStats();
  const { player } = useSupabasePlayer();
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const inviteCode = player?.inviteCode || '';
  const inviteLink = inviteCode ? `${window.location.origin}/?convite=${inviteCode}` : '';

  const handleCopy = async (type: 'code' | 'link') => {
    const textToCopy = type === 'code' ? inviteCode : inviteLink;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(type);
      toast.success(type === 'code' ? 'Código copiado!' : 'Link copiado!');
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
    },
    {
      title: 'Energia Circulando',
      value: stats?.totalEnergy || 0,
      icon: Zap,
      format: (v: number) => `k$${v.toFixed(2)}`,
    },
    {
      title: 'Skema Box',
      value: stats?.skemaBoxBalance || 0,
      icon: Box,
      format: (v: number) => `k$${v.toFixed(2)}`,
    },
    {
      title: 'Convites',
      value: stats?.totalReferrals || 0,
      subtitle: `${stats?.creditedReferrals || 0} creditados`,
      icon: Gift,
      format: (v: number) => v.toString(),
    },
    {
      title: 'Corridas',
      value: stats?.totalRaces || 0,
      icon: Trophy,
      format: (v: number) => v.toString(),
    },
    {
      title: 'Taxa de Conversão',
      value: stats?.totalReferrals ? ((stats?.creditedReferrals || 0) / stats.totalReferrals * 100) : 0,
      icon: TrendingUp,
      format: (v: number) => `${v.toFixed(1)}%`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Seção de Código de Convite do Guardian */}
      <Card className="bg-gradient-to-r from-primary/20 to-primary/5 border-primary/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Seu Código de Convite (Guardian)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Compartilhe este código para convidar novos <strong>Keepers</strong> com energia infinita
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {player ? (
            <>
              {/* Código de convite */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-background/80 border border-border rounded-lg px-4 py-3 font-mono text-xl font-bold text-primary tracking-wider">
                  {inviteCode}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy('code')}
                  className="h-12 w-12 shrink-0"
                >
                  {copied === 'code' ? (
                    <Check className="h-5 w-5 text-primary" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </Button>
              </div>

              {/* Link de convite */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-background/80 border border-border rounded-lg px-4 py-2 text-sm text-muted-foreground truncate">
                  <Link className="h-4 w-4 inline mr-2 text-primary" />
                  {inviteLink}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopy('link')}
                  className="h-10 w-10 shrink-0"
                >
                  {copied === 'link' ? (
                    <Check className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
                🛡️ Usuários convidados por você receberão o tier <strong>Guardião</strong> com energia infinita e poderão convidar Grão Mestres.
              </p>
            </>
          ) : (
            <Skeleton className="h-16 w-full" />
          )}
        </CardContent>
      </Card>

      <h2 className="text-xl font-semibold text-foreground">Visão Geral</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.title} className="bg-card/90 backdrop-blur-sm border-border/60">
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
