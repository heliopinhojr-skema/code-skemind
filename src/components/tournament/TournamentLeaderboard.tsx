/**
 * TournamentLeaderboard - Placar do torneio em tempo real
 * 
 * Mostra ranking atualizado conforme bots terminam.
 * Após o término, revela o código secreto de cada jogador.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, Target, Loader2, Crown, Eye, DollarSign } from 'lucide-react';
import { TournamentPlayer, TournamentResult } from '@/hooks/useTournament';
import { Symbol } from '@/components/game/Symbol';
import type { GameSymbol } from '@/hooks/useGame';
import { isITM, getScaledArenaPrize, getITMCount } from '@/lib/arenaPayouts';

interface TournamentLeaderboardProps {
  players: TournamentPlayer[];
  results: Map<string, TournamentResult>;
  humanPlayerId: string;
  isFinished: boolean;
  symbolsById?: Map<string, GameSymbol>;
  arenaPool?: number;
}

export function TournamentLeaderboard({
  players,
  results,
  humanPlayerId,
  isFinished,
  symbolsById,
  arenaPool = 50,
}: TournamentLeaderboardProps) {
  // Ordena jogadores por resultado
  const sortedPlayers = [...players].sort((a, b) => {
    const resultA = results.get(a.id);
    const resultB = results.get(b.id);
    
    if (!resultA || resultA.status === 'waiting' || resultA.status === 'playing') {
      if (!resultB || resultB.status === 'waiting' || resultB.status === 'playing') {
        return 0;
      }
      return 1;
    }
    if (!resultB || resultB.status === 'waiting' || resultB.status === 'playing') {
      return -1;
    }
    
    // Vencedores primeiro
    if (resultA.status === 'won' && resultB.status !== 'won') return -1;
    if (resultB.status === 'won' && resultA.status !== 'won') return 1;
    
    // Se ambos venceram: menos tentativas = melhor
    if (resultA.status === 'won' && resultB.status === 'won') {
      if (resultA.attempts !== resultB.attempts) return resultA.attempts - resultB.attempts;
    }
    
    // Por score
    if (resultA.score !== resultB.score) return resultB.score - resultA.score;
    
    // Por tempo
    return (resultB.finishTime || 0) - (resultA.finishTime || 0);
  });
  
  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="bg-muted/50 px-4 py-3 border-b flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <span className="font-bold">Ranking</span>
        <span className="text-xs text-muted-foreground ml-1">ITM: top {getITMCount(players.length)}</span>
        {!isFinished && (
          <Loader2 className="w-4 h-4 ml-auto animate-spin text-muted-foreground" />
        )}
      </div>
      
      <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {sortedPlayers.map((player, index) => {
            const result = results.get(player.id);
            const isHuman = player.id === humanPlayerId;
            const isWaiting = !result || result.status === 'waiting';
            const isPlaying = result?.status === 'playing';
            const rank = isFinished && result?.rank ? result.rank : (isWaiting || isPlaying ? '-' : index + 1);
            const itmPosition = typeof rank === 'number' && isITM(rank, players.length);
            const prize = typeof rank === 'number' ? getScaledArenaPrize(rank, arenaPool, players.length) : 0;
            return (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`
                  px-4 py-3
                  ${isHuman ? 'bg-primary/10' : ''}
                  ${result?.status === 'won' && isFinished && itmPosition ? 'bg-green-500/10' : ''}
                  ${isFinished && typeof rank === 'number' && rank === getITMCount(players.length) ? 'border-b-2 border-dashed border-yellow-500/30' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className="w-8 text-center flex-shrink-0">
                    {rank === 1 && isFinished ? (
                      <Crown className="w-6 h-6 text-yellow-500 mx-auto" />
                    ) : rank === 2 && isFinished ? (
                      <span className="text-lg font-bold text-gray-400">🥈</span>
                    ) : rank === 3 && isFinished ? (
                      <span className="text-lg font-bold text-orange-400">🥉</span>
                    ) : isPlaying ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                    ) : isWaiting ? (
                      <Clock className="w-5 h-5 text-muted-foreground mx-auto" />
                    ) : (
                      <span className="text-lg font-bold text-muted-foreground">{rank}</span>
                    )}
                  </div>
                  
                  {/* Avatar e nome */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xl">{player.avatar}</span>
                    <span className={`font-medium truncate ${isHuman ? 'text-primary' : ''}`}>
                      {player.name}
                    </span>
                  </div>
                  
                  {/* Status/Score */}
                  <div className="text-right flex-shrink-0">
                    {isWaiting ? (
                      <span className="text-sm text-muted-foreground">Aguardando...</span>
                    ) : isPlaying ? (
                      <span className="text-sm text-primary">Jogando...</span>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className={`font-bold ${result?.status === 'won' ? 'text-green-500' : 'text-foreground'}`}>
                          {result?.score.toLocaleString()} pts
                        </span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Target className="w-3 h-3" />
                          {result?.attempts} tent.
                          {result?.status === 'won' && result.finishTime !== undefined && (
                            <span className="ml-1">
                              ({Math.floor(result.finishTime)}s)
                            </span>
                          )}
                        </div>
                        {isFinished && prize > 0 && (
                          <span className="text-xs font-bold text-yellow-400 mt-0.5">
                            +k${prize.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Código secreto (mostra apenas após o fim) */}
                {isFinished && result?.secretCode && symbolsById && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-2 pt-2 border-t border-border/50"
                  >
                    <div className="flex items-center gap-2">
                      <Eye className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Código:</span>
                      <div className="flex gap-1">
                        {result.secretCode.map((id, i) => {
                          const symbol = symbolsById.get(id);
                          return symbol ? (
                            <div key={i} className="w-6 h-6 rounded bg-background border flex items-center justify-center">
                              <Symbol symbol={symbol} size="xs" />
                            </div>
                          ) : (
                            <div key={i} className="w-6 h-6 rounded bg-muted text-xs flex items-center justify-center">
                              ?
                            </div>
                          );
                        })}
                      </div>
                      {result.status === 'won' && (
                        <span className="text-xs text-green-500 ml-auto">✓ Decifrado</span>
                      )}
                      {result.status === 'lost' && (
                        <span className="text-xs text-red-500 ml-auto">✗ Falhou</span>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
