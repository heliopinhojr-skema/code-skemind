/**
 * CreatorsMissionBoard - Mostra todos os Criadores e seu progresso na missão de convites
 * Cada criador vê a evolução dos irmãos e descendentes
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Users, Crown, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getColorConfig, PlanetFace } from './GenerationColorPicker';
import { useI18n } from '@/i18n/I18nContext';

// Max slots per tier for invite mission
const CREATOR_SLOTS = 10; // Criador convida até 10 Grão Mestres

interface CreatorData {
  id: string;
  name: string;
  generationColor: string | null;
  emoji: string;
  directInvites: number; // Grão Mestres diretos
  totalDescendants: number;
  activeDescendants: number; // que jogaram ao menos 1 corrida
}

export function CreatorsMissionBoard() {
  const [expanded, setExpanded] = useState(false);
  const { t } = useI18n();

  const { data, isLoading } = useQuery({
    queryKey: ['creators-mission-board'],
    queryFn: async () => {
      // Fetch all creators (guardiao tier)
      const { data: creators } = await supabase
        .from('profiles')
        .select('id, name, generation_color, emoji, invite_code')
        .in('player_tier', ['guardiao', 'Criador']);

      if (!creators || creators.length === 0) return [];

      // Fetch all referrals and profiles for descendant calculation
      const [{ data: referrals }, { data: allProfiles }] = await Promise.all([
        supabase.from('referrals').select('inviter_id, invited_id'),
        supabase.from('profiles').select('id, player_tier, stats_races'),
      ]);

      if (!referrals || !allProfiles) return [];

      const profileMap = new Map(allProfiles.map(p => [p.id, p]));
      const childrenMap = new Map<string, string[]>();
      referrals.forEach(r => {
        if (!childrenMap.has(r.inviter_id)) childrenMap.set(r.inviter_id, []);
        childrenMap.get(r.inviter_id)!.push(r.invited_id);
      });

      const result: CreatorData[] = creators.map(c => {
        const directKids = childrenMap.get(c.id) || [];
        const directInvites = directKids.filter(kid => {
          const p = profileMap.get(kid);
          return p && ['grao_mestre', 'Grão Mestre'].includes(p.player_tier || '');
        }).length;

        const queue = [c.id];
        const visited = new Set<string>();
        let totalDescendants = 0;
        let activeDescendants = 0;

        while (queue.length > 0) {
          const current = queue.shift()!;
          if (visited.has(current)) continue;
          visited.add(current);
          const kids = childrenMap.get(current) || [];
          for (const kid of kids) {
            if (!visited.has(kid)) {
              totalDescendants++;
              const p = profileMap.get(kid);
              if (p && p.stats_races > 0) activeDescendants++;
              queue.push(kid);
            }
          }
        }

        return {
          id: c.id,
          name: c.name,
          generationColor: c.generation_color,
          emoji: c.emoji,
          directInvites,
          totalDescendants,
          activeDescendants,
        };
      });

      return result.sort((a, b) => b.totalDescendants - a.totalDescendants);
    },
    staleTime: 60_000,
  });

  const creators = data || [];
  if (isLoading && !data) {
    return (
      <div className="mx-4 mt-2 bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-center">
        <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
      </div>
    );
  }

  if (creators.length === 0) return null;

  return (
    <div className="mx-4 mt-2 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-orange-500/10 border border-amber-500/20 rounded-xl overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-white drop-shadow-md">{t.creators.title}</span>
          <span className="text-[10px] font-medium text-white/60">({creators.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mini avatars preview */}
          <div className="flex -space-x-1.5">
            {creators.slice(0, 5).map(c => {
              const colorCfg = getColorConfig(c.generationColor);
              return (
                <div
                  key={c.id}
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[8px] border border-black/50 ${
                    colorCfg ? `${colorCfg.bg}` : 'bg-amber-500/40'
                  }`}
                >
                  {colorCfg ? (
                    <PlanetFace className={`w-3 h-3 ${colorCfg.face}`} />
                  ) : (
                    <span>{c.emoji}</span>
                  )}
                </div>
              );
            })}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-white/30" /> : <ChevronDown className="w-4 h-4 text-white/30" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10 overflow-hidden"
          >
            <div className="p-3 space-y-2 max-h-72 overflow-y-auto">
              {creators.map((c, i) => {
                const colorCfg = getColorConfig(c.generationColor);
                const progress = Math.min(c.directInvites / CREATOR_SLOTS, 1);
                const progressColor = progress >= 0.8 ? 'bg-emerald-500' : progress >= 0.4 ? 'bg-yellow-500' : 'bg-red-500/70';

                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-white/5 rounded-lg p-2.5 flex items-center gap-3"
                  >
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                      colorCfg ? `${colorCfg.bg} ${colorCfg.glow}` : 'bg-amber-500/30'
                    }`}>
                      {colorCfg ? (
                        <PlanetFace className={`w-6 h-6 ${colorCfg.face}`} />
                      ) : (
                        <span className="text-lg">{c.emoji}</span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-white truncate">{c.name}</span>
                        <span className="text-[10px] text-amber-300/70 shrink-0 ml-2">
                          {c.directInvites}/{CREATOR_SLOTS} GM
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-1">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress * 100}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05 }}
                          className={`h-full rounded-full ${progressColor}`}
                        />
                      </div>

                      {/* Descendants stats */}
                      <div className="flex items-center gap-3 text-[10px]">
                        <span className="text-white/50 flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {c.totalDescendants} {t.creators.desc}
                        </span>
                        <span className={c.activeDescendants > 0 ? 'text-emerald-400' : 'text-red-400/50'}>
                          {c.activeDescendants} {c.activeDescendants !== 1 ? t.creators.actives : t.creators.active}
                        </span>
                        {c.totalDescendants > 0 && (
                          <span className="text-white/30">
                            {Math.round((c.activeDescendants / c.totalDescendants) * 100)}% {t.creators.engaged}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
