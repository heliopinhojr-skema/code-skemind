/**
 * GuardianUsersTable - Lista de usuários agrupados por tier com filtros e busca
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePlayersList } from '@/hooks/useGuardianData';
import { Search, Users, Shield, Crown, Swords, Gamepad2, Zap, Rocket, Star } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Tier labels match the player_tier values set by register_player
const TIER_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  'master_admin': { 
    label: 'CD HX', 
    icon: <Shield className="h-3 w-3" />, 
    color: 'text-red-400 bg-red-400/10 border-red-400/30' 
  },
  'Criador': { 
    label: 'Criador', 
    icon: <Star className="h-3 w-3" />, 
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' 
  },
  'Grão Mestre': { 
    label: 'Grão Mestre', 
    icon: <Crown className="h-3 w-3" />, 
    color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' 
  },
  'Mestre': { 
    label: 'Mestre', 
    icon: <Swords className="h-3 w-3" />, 
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' 
  },
  'Boom': { 
    label: 'Boom', 
    icon: <Rocket className="h-3 w-3" />, 
    color: 'text-green-400 bg-green-400/10 border-green-400/30' 
  },
  'Ploft': { 
    label: 'Ploft', 
    icon: <Gamepad2 className="h-3 w-3" />, 
    color: 'text-muted-foreground bg-muted/30 border-border' 
  },
  'jogador': { 
    label: 'Jogador', 
    icon: <Gamepad2 className="h-3 w-3" />, 
    color: 'text-muted-foreground bg-muted/30 border-border' 
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

function formatEnergy(energy: number): string {
  if (energy >= 1000000) return `k$${(energy / 1000000).toFixed(2)}M`;
  if (energy >= 1000) return `k$${(energy / 1000).toFixed(1)}k`;
  return `k$${energy.toFixed(2)}`;
}

export function GuardianUsersTable() {
  const { data: players, isLoading, error } = usePlayersList();
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');

  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    
    let filtered = players;
    
    // Filter by tier
    if (tierFilter !== 'all') {
      filtered = filtered.filter(p => p.player_tier === tierFilter);
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
      const tier = p.player_tier || 'jogador';
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

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jogador</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Convidado por</TableHead>
                <TableHead>Stats</TableHead>
                <TableHead>Registro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    {search || tierFilter !== 'all' ? 'Nenhum usuário encontrado' : 'Nenhum usuário registrado'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlayers.map((player) => {
                  const tierConfig = getTierConfig(player.player_tier);
                  
                  return (
                    <TableRow key={player.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{player.emoji}</span>
                          <span className="font-medium">{player.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs border ${tierConfig.color}`}>
                          <span className="flex items-center gap-1">
                            {tierConfig.icon}
                            {tierConfig.label}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          <Zap className="h-3 w-3 mr-1" />
                          {formatEnergy(Number(player.energy))}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {player.invite_code}
                        </code>
                      </TableCell>
                      <TableCell>
                        {player.invited_by_name ? (
                          <span className="text-muted-foreground">
                            {player.invited_by_name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          <div>🏆 {player.stats_wins} vitórias</div>
                          <div>🏁 {player.stats_races} corridas</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(player.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
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
  );
}
