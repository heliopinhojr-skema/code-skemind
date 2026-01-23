/**
 * PartyResults - Tela de resultados finais do Modo Festa
 * 
 * Mostra ranking, prêmios e celebração
 */

import { motion } from 'framer-motion';
import { 
  Trophy, Medal, PartyPopper, Zap, Clock, Target, Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PartyTournament, PartyResult } from '@/hooks/usePartyTournament';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/hooks/useWindowSize';

interface PartyResultsProps {
  tournament: PartyTournament;
  hostPlayerId: string;
  onClose: () => void;
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
    case 4: return '4️⃣';
    default: return `${rank}º`;
  }
}

function getRankGradient(rank: number) {
  switch (rank) {
    case 1: return 'from-yellow-500/30 to-amber-600/30 border-yellow-500/50';
    case 2: return 'from-gray-300/30 to-gray-500/30 border-gray-400/50';
    case 3: return 'from-orange-500/30 to-orange-700/30 border-orange-500/50';
    default: return 'from-white/5 to-white/10 border-white/20';
  }
}

export function PartyResults({
  tournament,
  hostPlayerId,
  onClose,
}: PartyResultsProps) {
  const { width, height } = useWindowSize();
  
  const sortedResults = [...tournament.results].sort((a, b) => (a.rank || 99) - (b.rank || 99));
  const hostResult = sortedResults.find(r => r.playerId === hostPlayerId);
  const winner = sortedResults[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900/20 to-black p-4 relative overflow-hidden">
      {/* Confetti para o vencedor */}
      <Confetti
        width={width}
        height={height}
        recycle={false}
        numberOfPieces={200}
        gravity={0.1}
      />

      <div className="max-w-lg mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-6"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 0.5, repeat: 3 }}
            className="inline-block mb-3"
          >
            <PartyPopper className="w-16 h-16 text-yellow-400" />
          </motion.div>
          
          <h1 className="text-3xl font-bold text-white mb-2">🎉 Fim da Festa!</h1>
          <p className="text-white/60">{tournament.name}</p>
        </motion.div>

        {/* Vencedor destaque */}
        {winner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-yellow-500/20 to-amber-600/20 border-2 border-yellow-500/50 rounded-2xl p-6 mb-6 text-center"
          >
            <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
            <div className="text-4xl mb-2">{winner.playerEmoji}</div>
            <h2 className="text-2xl font-bold text-white mb-1">{winner.playerName}</h2>
            <p className="text-yellow-400 text-lg font-medium">CAMPEÃO!</p>
            
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="text-center">
                <Target className="w-4 h-4 text-white/50 mx-auto mb-1" />
                <div className="text-white font-medium">{winner.attempts} tent.</div>
              </div>
              <div className="text-center">
                <Clock className="w-4 h-4 text-white/50 mx-auto mb-1" />
                <div className="text-white font-medium">
                  {Math.floor(winner.timeRemaining / 60)}:{String(winner.timeRemaining % 60).padStart(2, '0')}
                </div>
              </div>
              <div className="text-center">
                <Zap className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                <div className="text-yellow-400 font-medium">+k${winner.prize?.toFixed(2)}</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Ranking completo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Medal className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-white">Ranking Final</span>
          </div>
          
          <div className="space-y-2">
            {sortedResults.map((result, index) => (
              <motion.div
                key={result.playerId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
                className={`
                  flex items-center justify-between p-3 rounded-xl border bg-gradient-to-r
                  ${getRankGradient(result.rank || index + 1)}
                  ${result.playerId === hostPlayerId ? 'ring-2 ring-primary' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl w-8 text-center">{getRankIcon(result.rank || index + 1)}</span>
                  <span className="text-xl">{result.playerEmoji}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{result.playerName}</span>
                      {result.playerId === hostPlayerId && (
                        <span className="text-xs bg-primary/30 text-primary px-2 py-0.5 rounded-full">você</span>
                      )}
                    </div>
                    <div className="text-xs text-white/50">
                      {result.won ? '✅' : '❌'} {result.attempts} tent. • {Math.floor(result.timeRemaining / 60)}:{String(result.timeRemaining % 60).padStart(2, '0')}
                    </div>
                  </div>
                </div>
                
                {result.prize && result.prize > 0 && (
                  <div className="text-right">
                    <div className="text-sm font-bold text-yellow-400">+k${result.prize.toFixed(2)}</div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Resumo do host */}
        {hostResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-6 text-center"
          >
            <p className="text-white/80 text-sm">
              Você ficou em <span className="font-bold text-primary">{hostResult.rank}º lugar</span>
              {hostResult.prize && hostResult.prize > 0 && (
                <> e ganhou <span className="font-bold text-yellow-400">k${hostResult.prize.toFixed(2)}</span>!</>
              )}
            </p>
          </motion.div>
        )}

        {/* Botão voltar */}
        <Button
          onClick={onClose}
          className="w-full gap-2"
          size="lg"
        >
          <Home className="w-5 h-5" />
          Voltar ao Lobby
        </Button>
      </div>
    </div>
  );
}
