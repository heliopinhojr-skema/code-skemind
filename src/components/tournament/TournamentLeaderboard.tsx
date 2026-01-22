/**
 * TournamentLeaderboard - Placar do torneio em tempo real
 * 
 * Mostra ranking atualizado conforme bots terminam
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Clock, Target, Loader2, Crown } from 'lucide-react';
import { TournamentPlayer, TournamentResult } from '@/hooks/useTournament';

interface TournamentLeaderboardProps {
  players: TournamentPlayer[];
  results: Map<string, TournamentResult>;
  humanPlayerId: string;
  isFinished: boolean;
}

export function TournamentLeaderboard({
  players,
  results,
  humanPlayerId,
  isFinished,
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
        {!isFinished && (
          <Loader2 className="w-4 h-4 ml-auto animate-spin text-muted-foreground" />
        )}
      </div>
      
      <div className="divide-y divide-border">
        <AnimatePresence mode="popLayout">
          {sortedPlayers.map((player, index) => {
            const result = results.get(player.id);
            const isHuman = player.id === humanPlayerId;
            const isWaiting = !result || result.status === 'waiting';
            const isPlaying = result?.status === 'playing';
            const rank = isFinished && result?.rank ? result.rank : (isWaiting || isPlaying ? '-' : index + 1);
            
            return (
              <motion.div
                key={player.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`
                  flex items-center gap-3 px-4 py-3
                  ${isHuman ? 'bg-primary/10' : ''}
                  ${result?.status === 'won' ? 'bg-green-500/10' : ''}
                `}
              >
                {/* Rank */}
                <div className="w-8 text-center">
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
                <div className="text-right">
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
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
