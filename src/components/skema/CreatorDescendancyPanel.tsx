/**
 * CreatorDescendancyPanel - Visão geral da descendência de um Criador
 * Integrado com stats de jogo dos descendentes para avaliar engajamento
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TreePine, ChevronDown, ChevronUp, Users, Zap, TrendingUp, Loader2, Gamepad2, Trophy, Target } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatEnergy } from '@/lib/tierEconomy';
import { Badge } from '@/components/ui/badge';

interface CreatorDescendancyPanelProps {
  playerId: string;
  playerTier: string;
}

const TIER_CONFIG: Record<string, { label: string; emoji: string; color: string; mission: string }> = {
  'Criador': { label: 'Criador', emoji: '🌟', color: 'text-amber-300', mission: 'Expandir o universo recrutando Grão Mestres estratégicos' },
  'guardiao': { label: 'Criador', emoji: '🌟', color: 'text-amber-300', mission: 'Expandir o universo recrutando Grão Mestres estratégicos' },
  'Grão Mestre': { label: 'Grão Mestre', emoji: '👑', color: 'text-purple-300', mission: 'Recrutar Mestres que formem jogadores ativos e competitivos' },
  'grao_mestre': { label: 'Grão Mestre', emoji: '👑', color: 'text-purple-300', mission: 'Recrutar Mestres que formem jogadores ativos e competitivos' },
  'Mestre': { label: 'Mestre', emoji: '⚔️', color: 'text-blue-300', mission: 'Formar Booms que tragam Plofts engajados ao universo' },
  'mestre': { label: 'Mestre', emoji: '⚔️', color: 'text-blue-300', mission: 'Formar Booms que tragam Plofts engajados ao universo' },
  'Boom': { label: 'Boom', emoji: '🚀', color: 'text-green-300', mission: 'Convidar Plofts que joguem, compitam e permaneçam ativos' },
  'Ploft': { label: 'Ploft', emoji: '🎮', color: 'text-slate-300', mission: 'Jogar, competir e manter a energia circulando' },
  'jogador': { label: 'Ploft', emoji: '🎮', color: 'text-slate-300', mission: 'Jogar, competir e manter a energia circulando' },
};

function normalizeTier(tier: string | null): string {
  if (!tier) return 'Ploft';
  if (tier === 'jogador') return 'Ploft';
  if (tier === 'guardiao') return 'Criador';
  if (tier === 'grao_mestre') return 'Grão Mestre';
  if (tier === 'mestre') return 'Mestre';
  return tier;
}

export function CreatorDescendancyPanel({ playerId, playerTier }: CreatorDescendancyPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const isCreatorOrAbove = ['master_admin', 'guardiao', 'Criador', 'grao_mestre', 'Grão Mestre'].includes(playerTier);

  const { data, isLoading } = useQuery({
    queryKey: ['descendancy-full', playerId],
    queryFn: async () => {
      const [{ data: profiles }, { data: referrals }, { data: gameHistory }] = await Promise.all([
        supabase.from('profiles').select('id, name, emoji, player_tier, energy, created_at, invite_code, stats_wins, stats_races'),
        supabase.from('referrals').select('inviter_id, invited_id, created_at'),
        supabase.from('game_history').select('player_id, won, score, created_at'),
      ]);

      if (!profiles || !referrals) return null;

      const profileMap = new Map(profiles.map(p => [p.id, p]));

      // Game stats per player
      const playerGames = new Map<string, { games: number; wins: number; lastPlayed: string | null }>();
      (gameHistory || []).forEach(g => {
        const existing = playerGames.get(g.player_id) || { games: 0, wins: 0, lastPlayed: null };
        existing.games++;
        if (g.won) existing.wins++;
        if (!existing.lastPlayed || g.created_at > existing.lastPlayed) existing.lastPlayed = g.created_at;
        playerGames.set(g.player_id, existing);
      });

      // BFS to collect descendants
      const childrenMap = new Map<string, string[]>();
      referrals.forEach(r => {
        if (!childrenMap.has(r.inviter_id)) childrenMap.set(r.inviter_id, []);
        childrenMap.get(r.inviter_id)!.push(r.invited_id);
      });

      const descendants: {
        id: string; tier: string; energy: number; name: string; emoji: string;
        depth: number; createdAt: string; games: number; wins: number; lastPlayed: string | null;
        statsWins: number; statsRaces: number;
      }[] = [];
      const queue: { id: string; depth: number }[] = [{ id: playerId, depth: 0 }];
      const visited = new Set<string>();

      while (queue.length > 0) {
        const { id, depth } = queue.shift()!;
        if (visited.has(id)) continue;
        visited.add(id);

        const kids = childrenMap.get(id) || [];
        for (const kidId of kids) {
          const p = profileMap.get(kidId);
          if (p && !visited.has(kidId)) {
            const gs = playerGames.get(kidId) || { games: 0, wins: 0, lastPlayed: null };
            descendants.push({
              id: kidId,
              tier: normalizeTier(p.player_tier),
              energy: p.energy,
              name: p.name,
              emoji: p.emoji,
              depth: depth + 1,
              createdAt: p.created_at,
              games: gs.games,
              wins: gs.wins,
              lastPlayed: gs.lastPlayed,
              statsWins: p.stats_wins,
              statsRaces: p.stats_races,
            });
            queue.push({ id: kidId, depth: depth + 1 });
          }
        }
      }

      // Aggregate
      const tierCounts: Record<string, number> = {};
      const tierStats: Record<string, { totalGames: number; totalWins: number; active: number; inactive: number }> = {};
      let totalEnergy = 0;
      let totalGames = 0;
      let totalWins = 0;
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      descendants.forEach(d => {
        tierCounts[d.tier] = (tierCounts[d.tier] || 0) + 1;
        totalEnergy += d.energy;
        totalGames += d.statsRaces;
        totalWins += d.statsWins;

        if (!tierStats[d.tier]) tierStats[d.tier] = { totalGames: 0, totalWins: 0, active: 0, inactive: 0 };
        tierStats[d.tier].totalGames += d.statsRaces;
        tierStats[d.tier].totalWins += d.statsWins;
        if (d.statsRaces > 0) {
          tierStats[d.tier].active++;
        } else {
          tierStats[d.tier].inactive++;
        }
      });

      const recentCount = descendants.filter(d => new Date(d.createdAt) >= weekAgo).length;
      const activeCount = descendants.filter(d => d.statsRaces > 0).length;

      return {
        total: descendants.length,
        recentCount,
        activeCount,
        inactiveCount: descendants.length - activeCount,
        tierCounts,
        tierStats,
        totalEnergy,
        totalGames,
        totalWins,
        descendants: descendants.sort((a, b) => b.statsRaces - a.statsRaces || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
      };
    },
    enabled: isCreatorOrAbove,
    staleTime: 60_000,
  });

  if (!isCreatorOrAbove) return null;

  const tierDisplayOrder = ['Criador', 'Grão Mestre', 'Mestre', 'Boom', 'Ploft'];

  return (
    <div className="bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-orange-500/10 border border-amber-500/20 rounded-xl overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500/30 to-yellow-500/30 flex items-center justify-center">
            <TreePine className="w-3.5 h-3.5 text-amber-300" />
          </div>
          <div className="text-left">
            <span className="font-medium text-white text-sm">Minha Descendência</span>
            <div className="text-[10px] text-white/40">
              Gestão de linhagem • quem joga e quem não joga
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
          ) : data ? (
            <>
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded-full font-medium">
                {data.total}
              </span>
              {data.activeCount > 0 && (
                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] rounded-full">
                  {data.activeCount} ativo{data.activeCount !== 1 ? 's' : ''}
                </span>
              )}
            </>
          ) : null}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10 overflow-hidden"
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
              </div>
            ) : data ? (
              <div className="p-3 space-y-3">
                {/* Stats strip */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <Users className="w-3.5 h-3.5 text-amber-400 mx-auto mb-0.5" />
                    <p className="text-base font-bold text-white">{data.total}</p>
                    <p className="text-[9px] text-white/40">Membros</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <Gamepad2 className="w-3.5 h-3.5 text-emerald-400 mx-auto mb-0.5" />
                    <p className="text-base font-bold text-emerald-400">{data.activeCount}</p>
                    <p className="text-[9px] text-white/40">Ativos</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <Trophy className="w-3.5 h-3.5 text-yellow-400 mx-auto mb-0.5" />
                    <p className="text-base font-bold text-yellow-400">{data.totalWins}</p>
                    <p className="text-[9px] text-white/40">Vitórias</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <Target className="w-3.5 h-3.5 text-blue-400 mx-auto mb-0.5" />
                    <p className="text-base font-bold text-blue-400">{data.totalGames}</p>
                    <p className="text-[9px] text-white/40">Corridas</p>
                  </div>
                </div>

                {/* Tier breakdown with mission + engagement */}
                <div className="space-y-2">
                  {tierDisplayOrder.map(tier => {
                    const count = data.tierCounts[tier] || 0;
                    if (count === 0) return null;
                    const cfg = TIER_CONFIG[tier] || TIER_CONFIG['jogador'];
                    const ts = data.tierStats[tier] || { totalGames: 0, totalWins: 0, active: 0, inactive: 0 };
                    const isSelected = selectedTier === tier;

                    return (
                      <div key={tier}>
                        <button
                          onClick={() => setSelectedTier(isSelected ? null : tier)}
                          className="w-full bg-white/5 rounded-lg p-2.5 hover:bg-white/8 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{cfg.emoji}</span>
                              <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                              <span className="text-xs text-white/50">×{count}</span>
                            </div>
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="text-emerald-400">{ts.active} ✓</span>
                              {ts.inactive > 0 && <span className="text-red-400/70">{ts.inactive} ✗</span>}
                              <span className="text-white/30">{ts.totalGames} jogos</span>
                              {isSelected ? <ChevronUp className="w-3 h-3 text-white/30" /> : <ChevronDown className="w-3 h-3 text-white/30" />}
                            </div>
                          </div>
                          <p className="text-[9px] text-white/30 text-left italic">
                            🎯 {cfg.mission}
                          </p>
                        </button>

                        {/* Expanded tier members */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-1 space-y-0.5 max-h-48 overflow-y-auto scrollbar-thin pl-2">
                                {data.descendants
                                  .filter(d => d.tier === tier)
                                  .map(d => (
                                    <div key={d.id} className="flex items-center gap-2 bg-white/3 rounded px-2 py-1.5 text-[11px]">
                                      <span>{d.emoji}</span>
                                      <span className="text-white truncate flex-1">{d.name}</span>
                                      <span className="text-yellow-400/60 shrink-0">{formatEnergy(d.energy)}</span>
                                      <span className={`shrink-0 ${d.statsRaces > 0 ? 'text-emerald-400' : 'text-red-400/50'}`}>
                                        {d.statsRaces > 0 ? `${d.statsWins}W/${d.statsRaces}R` : 'inativo'}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>

                {/* Inactive alert */}
                {data.inactiveCount > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-[10px] text-red-300/80">
                    ⚠️ {data.inactiveCount} membro{data.inactiveCount !== 1 ? 's' : ''} nunca jogou. A missão é trazer jogadores que fiquem e vivam no universo.
                  </div>
                )}

                {data.total === 0 && (
                  <div className="text-center py-4">
                    <TreePine className="w-6 h-6 text-white/20 mx-auto mb-1" />
                    <p className="text-xs text-white/40">Nenhum descendente ainda. Compartilhe seus códigos DNA!</p>
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
