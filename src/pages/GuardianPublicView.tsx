/**
 * GuardianPublicView — Visualização pública read-only do painel Guardian.
 * Acessível via /painel/:token sem autenticação.
 * Nenhuma ação de edição é permitida.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CosmicBackground } from '@/components/CosmicBackground';
import { Crown, Users, Zap, Box, Trophy, Swords, TrendingUp, Eye, Briefcase, UserPlus, ShieldAlert } from 'lucide-react';

interface PublicStats {
  totalPlayers: number;
  totalEnergy: number;
  hxEnergy: number;
  skemaBoxBalance: number;
  botTreasuryBalance: number;
  botCount: number;
  botPerBot: number;
  totalReferrals: number;
  creditedReferrals: number;
  totalDistributed: number;
  totalRaces: number;
  totalArenas: number;
  tierCounts: Record<string, number>;
  newPlayersToday: number;
  systemTotal: number;
  systemDelta: number;
  investorCount: number;
  players: { name: string; emoji: string; tier: string; energy: number; wins: number; races: number; color: string | null; status: string }[];
  races: any[];
  arenas: any[];
  investors: { player_name: string; created_at: string }[];
}

function formatK(v: number) {
  if (v >= 1_000_000) return `k$ ${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `k$ ${(v / 1_000).toFixed(1)}K`;
  return `k$ ${v.toFixed(2)}`;
}

function tierLabel(t: string) {
  const map: Record<string, string> = {
    guardiao: 'Criador',
    grao_mestre: 'Grão Mestre',
    mestre: 'Mestre',
    jogador: 'Ploft',
    master_admin: 'HX',
  };
  return map[t] || t;
}

export default function GuardianPublicView() {
  const { token } = useParams<{ token: string }>();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error: fnError } = await supabase.functions.invoke('guardian-public-stats', {
          body: { token: token || '' },
        });
        
        if (fnError) throw fnError;
        if (data?.error) throw new Error(data.error);
        
        setStats(data);
      } catch (e: any) {
        setError(e.message || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background relative">
        <CosmicBackground />
        <div className="fixed inset-0 bg-black/80 z-[1]" />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <Crown className="h-12 w-12 mx-auto text-primary animate-pulse" />
            <Skeleton className="h-4 w-32 mx-auto" />
            <p className="text-xs text-muted-foreground">Carregando painel...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-background relative">
        <CosmicBackground />
        <div className="fixed inset-0 bg-black/80 z-[1]" />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <Card className="border-destructive/50 bg-card/90 backdrop-blur-sm max-w-sm mx-4">
            <CardContent className="pt-6 text-center space-y-3">
              <ShieldAlert className="h-12 w-12 mx-auto text-destructive" />
              <h2 className="text-lg font-bold text-foreground">Acesso Negado</h2>
              <p className="text-sm text-muted-foreground">{error || 'Link inválido ou expirado.'}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const metrics = [
    { title: 'Jogadores', value: stats.totalPlayers, icon: Users, format: (v: number) => v.toString() },
    { title: 'Energia Circulando', value: stats.totalEnergy, icon: Zap, format: formatK },
    { title: 'Skema Box', value: stats.skemaBoxBalance, icon: Box, format: formatK },
    { title: 'Convites Aceitos', value: stats.creditedReferrals, icon: UserPlus, format: (v: number) => v.toString() },
    { title: 'Distribuído', value: stats.totalDistributed, icon: TrendingUp, format: formatK },
    { title: 'Corridas', value: stats.totalRaces, icon: Trophy, format: (v: number) => v.toString() },
  ];

  return (
    <div className="min-h-screen bg-background relative">
      <CosmicBackground />
      <div className="fixed inset-0 bg-black/80 z-[1]" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 bg-card/90 backdrop-blur-md">
          <div className="container mx-auto px-4 py-4">
            {/* Read-only badge */}
            <div className="flex justify-center mb-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs bg-secondary/20 border border-secondary/40 text-secondary">
                <Eye className="h-3 w-3" />
                <span className="font-medium uppercase tracking-wider">
                  Modo Visualização • Somente Leitura
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <Crown className="h-8 w-8 text-primary" />
              <div className="text-center">
                <h1 className="text-xl font-bold text-foreground">Painel Guardian</h1>
                <p className="text-xs text-muted-foreground">Visão pública do ecossistema SKEMA</p>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6">
          {/* System Audit */}
          <Card className="border border-border/60 bg-card/90 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Balanço do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-background/60 rounded-lg p-3 border border-border/40">
                  <p className="text-xs text-muted-foreground">HX (Tesouro)</p>
                  <p className="text-lg font-bold text-foreground">{formatK(stats.hxEnergy)}</p>
                </div>
                <div className="bg-background/60 rounded-lg p-3 border border-border/40">
                  <p className="text-xs text-muted-foreground">Jogadores</p>
                  <p className="text-lg font-bold text-foreground">{formatK(stats.totalEnergy)}</p>
                </div>
                <div className="bg-background/60 rounded-lg p-3 border border-border/40">
                  <p className="text-xs text-muted-foreground">🤖 Bot Treasury</p>
                  <p className="text-lg font-bold text-foreground">{formatK(stats.botTreasuryBalance)}</p>
                  <p className="text-xs text-muted-foreground">{formatK(stats.botPerBot)}/bot</p>
                </div>
                <div className="bg-background/60 rounded-lg p-3 border border-border/40">
                  <p className="text-xs text-muted-foreground">Skema Box</p>
                  <p className="text-lg font-bold text-foreground">{formatK(stats.skemaBoxBalance)}</p>
                </div>
                <div className="bg-background/60 rounded-lg p-3 border border-border/40">
                  <p className="text-xs text-muted-foreground">Total Sistema</p>
                  <p className="text-lg font-bold text-foreground">{formatK(stats.systemTotal)}</p>
                  <p className={`text-xs font-mono ${stats.systemDelta === 0 ? 'text-green-400' : 'text-destructive'}`}>
                    Δ {stats.systemDelta === 0 ? '✓ 0' : stats.systemDelta.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {metrics.map((m) => (
              <Card key={m.title} className="border border-border/60 bg-card/90 backdrop-blur-sm">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <m.icon className="h-4 w-4 text-primary" />
                    <span className="text-xs text-muted-foreground">{m.title}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground">{m.format(m.value)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tier Breakdown */}
          <Card className="border border-border/60 bg-card/90 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground">Distribuição por Tier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(stats.tierCounts).map(([tier, count]) => (
                  <Badge key={tier} variant="secondary" className="text-xs px-3 py-1">
                    {tierLabel(tier)}: {count}
                  </Badge>
                ))}
              </div>
              {stats.newPlayersToday > 0 && (
                <p className="text-xs text-primary mt-3 flex items-center gap-1">
                  <UserPlus className="h-3 w-3" />
                  +{stats.newPlayersToday} jogador(es) hoje
                </p>
              )}
            </CardContent>
          </Card>

          {/* Players Table */}
          <Card className="border border-border/60 bg-card/90 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Jogadores ({stats.players.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border/40">
                      <th className="text-left py-2 px-2">Jogador</th>
                      <th className="text-left py-2 px-2">Tier</th>
                      <th className="text-right py-2 px-2">Energia</th>
                      <th className="text-right py-2 px-2">Vitórias</th>
                      <th className="text-right py-2 px-2">Corridas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.players
                      .sort((a, b) => b.energy - a.energy)
                      .map((p, i) => (
                        <tr key={i} className="border-b border-border/20 hover:bg-muted/20">
                          <td className="py-1.5 px-2">
                            <span className="mr-1">{p.emoji}</span>
                            <span className="font-medium text-foreground">{p.name}</span>
                            {p.status === 'blocked' && (
                              <Badge variant="destructive" className="ml-1 text-[9px] px-1 py-0">blocked</Badge>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-muted-foreground">{tierLabel(p.tier)}</td>
                          <td className="py-1.5 px-2 text-right font-mono text-foreground">{formatK(p.energy)}</td>
                          <td className="py-1.5 px-2 text-right text-foreground">{p.wins}</td>
                          <td className="py-1.5 px-2 text-right text-foreground">{p.races}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Arenas */}
          {stats.arenas.length > 0 && (
            <Card className="border border-border/60 bg-card/90 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Swords className="h-4 w-4 text-primary" />
                  Arenas Abertas ({stats.arenas.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.arenas.map((a: any) => (
                    <div key={a.id} className="flex items-center justify-between bg-background/60 rounded-lg p-3 border border-border/40">
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.name}</p>
                        <p className="text-xs text-muted-foreground">{a.difficulty} • {a.bot_count} bots</p>
                      </div>
                      <Badge variant="outline" className="text-xs">{formatK(a.buy_in)}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Investors */}
          {stats.investors.length > 0 && (
            <Card className="border border-border/60 bg-card/90 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  Interesse em Investir ({stats.investors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {stats.investors.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between text-xs py-1">
                      <span className="text-foreground font-medium">{inv.player_name}</span>
                      <span className="text-muted-foreground">{new Date(inv.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="text-center py-6">
            <p className="text-xs text-muted-foreground">
              SKEMA Universe • Visualização pública • Dados em tempo real
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
