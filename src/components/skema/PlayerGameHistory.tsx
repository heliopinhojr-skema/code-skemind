/**
 * PlayerGameHistory - Extrato de jogos do jogador
 * 
 * Mostra histórico de arenas com:
 * - Data/hora
 * - Resultado (vitória/derrota)
 * - Posição (#1, #2, etc.)
 * - Prêmio ganho
 * - Tentativas e pontos
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Target, Clock, ChevronDown, Scroll, Medal, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatEnergy } from '@/lib/tierEconomy';
import { isITM } from '@/lib/arenaPayouts';

interface GameHistoryEntry {
  id: string;
  game_mode: string;
  won: boolean;
  attempts: number;
  score: number;
  time_remaining: number | null;
  rank: number | null;
  prize_won: number;
  arena_buy_in: number | null;
  arena_pool: number | null;
  created_at: string;
}

interface PlayerGameHistoryProps {
  playerId: string;
}

export function PlayerGameHistory({ playerId }: PlayerGameHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || history.length > 0) return;
    
    setIsLoading(true);
    supabase
      .from('game_history')
      .select('id, game_mode, won, attempts, score, time_remaining, rank, prize_won, arena_buy_in, arena_pool, created_at')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data, error }) => {
        if (!error && data) {
          setHistory(data as GameHistoryEntry[]);
        }
        setIsLoading(false);
      });
  }, [isOpen, playerId, history.length]);

  // Reset history when playerId changes
  useEffect(() => {
    setHistory([]);
  }, [playerId]);

  const totalPrizes = history.reduce((sum, g) => sum + (g.prize_won || 0), 0);
  const totalBuyIns = history.reduce((sum, g) => sum + (g.arena_buy_in || 0), 0);
  const wins = history.filter(g => g.won).length;
  const winRate = history.length > 0 ? Math.round((wins / history.length) * 100) : 0;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const getRankBadge = (rank: number | null, won: boolean) => {
    if (!rank) return won ? '✅' : '❌';
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    if (isITM(rank)) return '💰';
    return '📊';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 rounded-xl border border-white/10 overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 p-3 hover:bg-white/5 transition-colors"
      >
        <Scroll className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-medium text-white/80 flex-1 text-left">Extrato de Jogos</span>
        {history.length > 0 && (
          <span className="text-xs text-white/40">{history.length} jogos</span>
        )}
        <ChevronDown className={`w-4 h-4 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {isLoading ? (
              <div className="p-4 text-center text-white/40 text-sm">Carregando...</div>
            ) : history.length === 0 ? (
              <div className="p-4 text-center text-white/40 text-sm">Nenhum jogo registrado</div>
            ) : (
              <div className="px-3 pb-3 space-y-2">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-sm font-bold text-green-400">{winRate}%</div>
                    <div className="text-[10px] text-white/40">Win Rate</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-sm font-bold text-yellow-400">
                      {totalPrizes > 0 ? `+${formatEnergy(totalPrizes)}` : 'k$ 0'}
                    </div>
                    <div className="text-[10px] text-white/40">Prêmios</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className={`text-sm font-bold ${(totalPrizes - totalBuyIns) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(totalPrizes - totalBuyIns) >= 0 ? '+' : ''}{formatEnergy(totalPrizes - totalBuyIns)}
                    </div>
                    <div className="text-[10px] text-white/40">P&L</div>
                  </div>
                </div>

                {/* Game list */}
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {history.map((game) => (
                    <div
                      key={game.id}
                      className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                        game.won ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/5 border border-white/5'
                      }`}
                    >
                      <span className="text-base">{getRankBadge(game.rank, game.won)}</span>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-white/70">{formatDate(game.created_at)}</span>
                          {game.rank && (
                            <span className={`font-bold ${isITM(game.rank) ? 'text-yellow-400' : 'text-white/50'}`}>
                              #{game.rank}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-white/40">
                          <span>{game.attempts} tent.</span>
                          <span>{game.score} pts</span>
                          {game.time_remaining && (
                            <span>{Math.floor(game.time_remaining / 60)}:{String(Math.round(game.time_remaining % 60)).padStart(2, '0')}</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        {game.prize_won > 0 ? (
                          <span className="font-bold text-yellow-400">+{formatEnergy(game.prize_won)}</span>
                        ) : game.arena_buy_in ? (
                          <span className="text-red-400/60">-{formatEnergy(game.arena_buy_in)}</span>
                        ) : (
                          <span className="text-white/30">-</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
