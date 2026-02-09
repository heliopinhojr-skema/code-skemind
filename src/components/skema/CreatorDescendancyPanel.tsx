/**
 * CreatorDescendancyPanel - Visão geral da descendência de um Criador
 * Mostra árvore completa: GM → Mestre → Boom → Ploft com contagens e energia
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TreePine, ChevronDown, ChevronUp, Users, Zap, TrendingUp, Crown, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatEnergy } from '@/lib/tierEconomy';
import { Badge } from '@/components/ui/badge';

interface CreatorDescendancyPanelProps {
  playerId: string;
  playerTier: string;
}

interface DescendantNode {
  id: string;
  name: string;
  emoji: string;
  tier: string;
  energy: number;
  createdAt: string;
  depth: number;
  children: DescendantNode[];
}

const TIER_ORDER = ['Criador', 'guardiao', 'Grão Mestre', 'grao_mestre', 'Mestre', 'mestre', 'Boom', 'Ploft', 'jogador'];

const TIER_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  'Grão Mestre': { label: 'Grão Mestre', emoji: '👑', color: 'text-purple-300' },
  'grao_mestre': { label: 'Grão Mestre', emoji: '👑', color: 'text-purple-300' },
  'Mestre': { label: 'Mestre', emoji: '⚔️', color: 'text-blue-300' },
  'mestre': { label: 'Mestre', emoji: '⚔️', color: 'text-blue-300' },
  'Boom': { label: 'Boom', emoji: '🚀', color: 'text-green-300' },
  'Ploft': { label: 'Ploft', emoji: '🎮', color: 'text-slate-300' },
  'jogador': { label: 'Ploft', emoji: '🎮', color: 'text-slate-300' },
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

  // Only show for Criador+ tiers
  const isCreatorOrAbove = ['master_admin', 'guardiao', 'Criador', 'grao_mestre', 'Grão Mestre'].includes(playerTier);

  const { data, isLoading } = useQuery({
    queryKey: ['descendancy', playerId],
    queryFn: async () => {
      // Get all profiles and referrals to build the tree
      const [{ data: profiles }, { data: referrals }] = await Promise.all([
        supabase.from('profiles').select('id, name, emoji, player_tier, energy, created_at, invite_code'),
        supabase.from('referrals').select('inviter_id, invited_id, created_at'),
      ]);

      if (!profiles || !referrals) return null;

      const profileMap = new Map(profiles.map(p => [p.id, p]));

      // Build adjacency: inviter -> [invited]
      const childrenMap = new Map<string, string[]>();
      referrals.forEach(r => {
        if (!childrenMap.has(r.inviter_id)) childrenMap.set(r.inviter_id, []);
        childrenMap.get(r.inviter_id)!.push(r.invited_id);
      });

      // BFS from playerId to collect all descendants
      const descendants: { id: string; tier: string; energy: number; name: string; emoji: string; depth: number; createdAt: string }[] = [];
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
            descendants.push({
              id: kidId,
              tier: normalizeTier(p.player_tier),
              energy: p.energy,
              name: p.name,
              emoji: p.emoji,
              depth: depth + 1,
              createdAt: p.created_at,
            });
            queue.push({ id: kidId, depth: depth + 1 });
          }
        }
      }

      // Count by tier
      const tierCounts: Record<string, number> = {};
      let totalEnergy = 0;
      descendants.forEach(d => {
        const t = d.tier;
        tierCounts[t] = (tierCounts[t] || 0) + 1;
        totalEnergy += d.energy;
      });

      // Direct invites (depth 1)
      const directCount = descendants.filter(d => d.depth === 1).length;

      // Recent (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const recentCount = descendants.filter(d => new Date(d.createdAt) >= weekAgo).length;

      return {
        total: descendants.length,
        directCount,
        recentCount,
        tierCounts,
        totalEnergy,
        descendants: descendants.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 20),
      };
    },
    enabled: isCreatorOrAbove,
    staleTime: 60_000,
  });

  if (!isCreatorOrAbove) return null;

  const tierDisplayOrder = ['Grão Mestre', 'Mestre', 'Boom', 'Ploft'];

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
              Árvore completa de convites
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
          ) : data ? (
            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded-full font-medium">
              {data.total} membros
            </span>
          ) : null}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-white/30" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/30" />
          )}
        </div>
      </button>

      {/* Expanded content */}
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
                {/* Summary strip */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <Users className="w-4 h-4 text-amber-400 mx-auto mb-0.5" />
                    <p className="text-lg font-bold text-white">{data.total}</p>
                    <p className="text-[10px] text-white/40">Total</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <Zap className="w-4 h-4 text-yellow-400 mx-auto mb-0.5" />
                    <p className="text-lg font-bold text-yellow-400">{formatEnergy(data.totalEnergy)}</p>
                    <p className="text-[10px] text-white/40">Energia ativa</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <TrendingUp className="w-4 h-4 text-emerald-400 mx-auto mb-0.5" />
                    <p className="text-lg font-bold text-emerald-400">+{data.recentCount}</p>
                    <p className="text-[10px] text-white/40">Últimos 7d</p>
                  </div>
                </div>

                {/* Tier breakdown */}
                <div className="bg-white/5 rounded-lg p-3 space-y-1.5">
                  <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Por Nível</p>
                  {tierDisplayOrder.map(tier => {
                    const count = data.tierCounts[tier] || 0;
                    if (count === 0) return null;
                    const cfg = TIER_CONFIG[tier] || TIER_CONFIG['jogador'];
                    const pct = data.total > 0 ? Math.round((count / data.total) * 100) : 0;
                    return (
                      <div key={tier} className="flex items-center gap-2">
                        <span className="text-sm">{cfg.emoji}</span>
                        <span className={`text-xs font-medium ${cfg.color} w-24`}>{cfg.label}</span>
                        <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="h-full bg-gradient-to-r from-amber-500/60 to-yellow-500/60 rounded-full"
                          />
                        </div>
                        <span className="text-xs text-white/60 w-8 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Recent descendants list */}
                {data.descendants.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/40 uppercase tracking-wider">Últimos membros</p>
                    <div className="max-h-40 overflow-y-auto space-y-1 scrollbar-thin">
                      {data.descendants.slice(0, 10).map(d => {
                        const cfg = TIER_CONFIG[d.tier] || TIER_CONFIG['jogador'];
                        return (
                          <div key={d.id} className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1.5">
                            <span className="text-sm">{d.emoji}</span>
                            <span className="text-xs text-white truncate flex-1">{d.name}</span>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 shrink-0 border-white/10">
                              {cfg.emoji} {cfg.label}
                            </Badge>
                            <span className="text-[10px] text-yellow-400/70 shrink-0">{formatEnergy(d.energy)}</span>
                            {d.depth > 1 && (
                              <span className="text-[9px] text-white/30 shrink-0">nv.{d.depth}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
