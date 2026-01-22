/**
 * RaceSummary - Demonstrativo da corrida após término
 * 
 * Mostra:
 * - Posição final do jogador
 * - Comparativo com outros participantes
 * - Estatísticas da partida
 */

import { motion } from 'framer-motion';
import { Trophy, Target, Clock, Star, Users, TrendingUp, Medal, Zap } from 'lucide-react';
import { Symbol } from '@/components/game/Symbol';
import type { TournamentPlayer, TournamentResult } from '@/hooks/useTournament';
import type { GameSymbol } from '@/hooks/useGame';

interface RaceSummaryProps {
  humanResult: TournamentResult;
  humanSecretCode: string[];
  players: TournamentPlayer[];
  results: Map<string, TournamentResult>;
  symbolsById: Map<string, GameSymbol>;
  prizeAmount: number;
  totalPlayers: number;
}

export function RaceSummary({
  humanResult,
  humanSecretCode,
  players,
  results,
  symbolsById,
  prizeAmount,
  totalPlayers,
}: RaceSummaryProps) {
  const didWin = humanResult.status === 'won';
  const rank = humanResult.rank;
  
  // Posição visual
  const getRankDisplay = () => {
    if (rank === 1) return { icon: '🏆', text: 'CAMPEÃO!', color: 'text-yellow-400' };
    if (rank === 2) return { icon: '🥈', text: 'Vice-Campeão', color: 'text-gray-300' };
    if (rank === 3) return { icon: '🥉', text: '3º Lugar', color: 'text-orange-400' };
    if (rank <= 4) return { icon: '🎖️', text: `${rank}º Lugar`, color: 'text-primary' };
    return { icon: '📊', text: `${rank}º de ${totalPlayers}`, color: 'text-muted-foreground' };
  };
  
  const rankDisplay = getRankDisplay();
  
  // Estatísticas comparativas
  const allResults = Array.from(results.values());
  const winners = allResults.filter(r => r.status === 'won');
  const avgAttempts = winners.length > 0 
    ? Math.round(winners.reduce((sum, r) => sum + r.attempts, 0) / winners.length)
    : 0;
  
  // Top 3 para mostrar
  const top3 = allResults
    .filter(r => r.rank <= 3)
    .sort((a, b) => a.rank - b.rank);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl p-4 space-y-4"
    >
      {/* Header - Posição */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring' }}
        className="text-center py-4"
      >
        <div className="text-6xl mb-2">{rankDisplay.icon}</div>
        <h2 className={`text-2xl font-bold ${rankDisplay.color}`}>
          {rankDisplay.text}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Posição {rank} de {totalPlayers} jogadores
        </p>
      </motion.div>

      {/* Seu código secreto */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white/5 rounded-xl p-3 border border-white/10"
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Target className="w-3 h-3" />
          <span>Seu código secreto</span>
        </div>
        <div className="flex gap-2 justify-center">
          {humanSecretCode.map((id, i) => {
            const symbol = symbolsById.get(id);
            return symbol ? (
              <motion.div
                key={i}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.3 + i * 0.1, type: 'spring' }}
                className="w-12 h-12 rounded-lg bg-muted/30 border border-primary/30 flex items-center justify-center"
              >
                <Symbol symbol={symbol} size="md" />
              </motion.div>
            ) : null;
          })}
        </div>
      </motion.div>

      {/* Estatísticas da partida */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-3 gap-2"
      >
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <Zap className={`w-5 h-5 mx-auto mb-1 ${didWin ? 'text-green-400' : 'text-red-400'}`} />
          <div className="text-lg font-bold">{didWin ? 'Vitória' : 'Derrota'}</div>
          <div className="text-xs text-muted-foreground">Resultado</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <Target className="w-5 h-5 mx-auto mb-1 text-blue-400" />
          <div className="text-lg font-bold">{humanResult.attempts}</div>
          <div className="text-xs text-muted-foreground">Tentativas</div>
        </div>
        <div className="bg-white/5 rounded-lg p-3 text-center">
          <Star className="w-5 h-5 mx-auto mb-1 text-yellow-400" />
          <div className="text-lg font-bold">{humanResult.score.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Pontos</div>
        </div>
      </motion.div>

      {/* Comparativo com média */}
      {winners.length > 1 && didWin && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white/5 rounded-lg p-3"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <TrendingUp className="w-3 h-3" />
            <span>Comparativo</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>Média dos vencedores:</span>
            <span className="font-bold">{avgAttempts} tentativas</span>
          </div>
          {humanResult.attempts < avgAttempts && (
            <div className="text-xs text-green-400 mt-1">
              ✨ Você foi {avgAttempts - humanResult.attempts} tentativa(s) melhor que a média!
            </div>
          )}
        </motion.div>
      )}

      {/* Prêmio */}
      {prizeAmount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, type: 'spring' }}
          className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl p-4 border border-yellow-500/30 text-center"
        >
          <div className="text-sm text-yellow-400/80 mb-1">Prêmio Conquistado</div>
          <div className="text-4xl font-black text-yellow-400">+{prizeAmount} K$</div>
        </motion.div>
      )}

      {/* Top 3 mini */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Medal className="w-3 h-3" />
          <span>Pódio</span>
        </div>
        <div className="space-y-1">
          {top3.map((result, i) => {
            const player = players.find(p => p.id === result.playerId);
            const isHuman = result.playerId === humanResult.playerId;
            const medals = ['🥇', '🥈', '🥉'];
            
            return (
              <motion.div
                key={result.playerId}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  isHuman ? 'bg-primary/20 border border-primary/30' : 'bg-white/5'
                }`}
              >
                <span className="text-lg">{medals[i]}</span>
                <span className="text-lg">{player?.avatar}</span>
                <span className={`flex-1 font-medium ${isHuman ? 'text-primary' : 'text-white'}`}>
                  {player?.name} {isHuman && '(Você)'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {result.attempts} tent. • {result.score} pts
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
