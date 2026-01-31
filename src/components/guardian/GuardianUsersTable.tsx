/**
 * GuardianUsersTable - Lista de usuários com filtros, busca e gestão de roles
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePlayersList } from '@/hooks/useGuardianData';
import { supabase } from '@/integrations/supabase/client';
import { Search, Users, Shield, Crown, Swords, Gamepad2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

type PlayerTier = 'master_admin' | 'guardiao' | 'grao_mestre' | 'mestre' | 'jogador';

const TIER_CONFIG: Record<PlayerTier, { label: string; icon: React.ReactNode; color: string }> = {
  master_admin: { 
    label: 'Master Admin', 
    icon: <Shield className="h-3 w-3" />, 
    color: 'text-red-400 bg-red-400/10 border-red-400/30' 
  },
  guardiao: { 
    label: 'Guardião', 
    icon: <Shield className="h-3 w-3" />, 
    color: 'text-amber-400 bg-amber-400/10 border-amber-400/30' 
  },
  grao_mestre: { 
    label: 'Grão Mestre', 
    icon: <Crown className="h-3 w-3" />, 
    color: 'text-purple-400 bg-purple-400/10 border-purple-400/30' 
  },
  mestre: { 
    label: 'Mestre', 
    icon: <Swords className="h-3 w-3" />, 
    color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' 
  },
  jogador: { 
    label: 'Jogador', 
    icon: <Gamepad2 className="h-3 w-3" />, 
    color: 'text-muted-foreground bg-muted/30 border-border' 
  },
};

export function GuardianUsersTable() {
  const { data: players, isLoading, error } = usePlayersList();
  const [search, setSearch] = useState('');
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const filteredPlayers = useMemo(() => {
    if (!players) return [];
    if (!search.trim()) return players;
    
    const searchLower = search.toLowerCase();
    return players.filter(p => 
      p.name.toLowerCase().includes(searchLower) ||
      p.invite_code.toLowerCase().includes(searchLower) ||
      p.invited_by_name?.toLowerCase().includes(searchLower)
    );
  }, [players, search]);

  const handleTierChange = async (userId: string, newTier: PlayerTier) => {
    setUpdatingUser(userId);
    
    try {
      // Map tier to role (they're the same in our system)
      const newRole = newTier;
      
      // Use direct RPC call since types may not be updated yet
      const { data, error } = await supabase.rpc('set_user_role_and_tier' as never, {
        p_target_user_id: userId,
        p_new_role: newRole,
        p_new_tier: newTier,
      } as never);

      if (error) {
        console.error('Error updating tier:', error);
        toast.error(`Erro ao atualizar: ${error.message}`);
        return;
      }

      toast.success(`Tier alterado para ${TIER_CONFIG[newTier].label}`);
      
      // Refresh the players list
      queryClient.invalidateQueries({ queryKey: ['guardian', 'players'] });
      
    } catch (e) {
      console.error('Unexpected error:', e);
      toast.error('Erro inesperado ao atualizar tier');
    } finally {
      setUpdatingUser(null);
    }
  };

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
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Jogador</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Energia</TableHead>
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
                    {search ? 'Nenhum usuário encontrado' : 'Nenhum usuário registrado'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlayers.map((player) => {
                  const currentTier = (player.player_tier as PlayerTier) || 'jogador';
                  const tierConfig = TIER_CONFIG[currentTier];
                  const isUpdating = updatingUser === player.user_id;
                  
                  return (
                    <TableRow key={player.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{player.emoji}</span>
                          <span className="font-medium">{player.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={currentTier}
                          onValueChange={(value) => handleTierChange(player.user_id, value as PlayerTier)}
                          disabled={isUpdating}
                        >
                          <SelectTrigger className={`w-[140px] h-8 text-xs border ${tierConfig.color}`}>
                            <SelectValue>
                              <div className="flex items-center gap-1.5">
                                {tierConfig.icon}
                                <span>{tierConfig.label}</span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(TIER_CONFIG).map(([tier, config]) => (
                              <SelectItem key={tier} value={tier}>
                                <div className="flex items-center gap-2">
                                  {config.icon}
                                  <span>{config.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {currentTier === 'guardiao' ? '∞' : `k$${Number(player.energy).toFixed(2)}`}
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
