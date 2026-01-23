/**
 * PartyCollect - Tela de coleta de resultados do Modo Festa
 * 
 * Anfitrião digita os resultados de cada jogador (verbal/screenshot)
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardList, Check, X, Trophy, Clock, Target,
  AlertCircle, ChevronRight, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PartyTournament, PartyResult } from '@/hooks/usePartyTournament';

interface PartyCollectProps {
  tournament: PartyTournament;
  onAddResult: (
    playerId: string,
    won: boolean,
    attempts: number,
    timeRemaining: number,
    score: number
  ) => { success: boolean; error?: string };
  onFinish: () => PartyResult[];
  onCancel: () => void;
}

export function PartyCollect({
  tournament,
  onAddResult,
  onFinish,
  onCancel,
}: PartyCollectProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [won, setWon] = useState(true);
  const [attempts, setAttempts] = useState('');
  const [timeMinutes, setTimeMinutes] = useState('');
  const [timeSeconds, setTimeSeconds] = useState('');
  const [score, setScore] = useState('');
  const [error, setError] = useState<string | null>(null);

  const playersWithoutResult = tournament.players.filter(
    p => !tournament.results.some(r => r.playerId === p.id)
  );

  const handleSubmitResult = () => {
    if (!selectedPlayerId) {
      setError('Selecione um jogador');
      return;
    }
    
    const attemptsNum = parseInt(attempts) || 0;
    if (attemptsNum < 1 || attemptsNum > 8) {
      setError('Tentativas deve ser entre 1 e 8');
      return;
    }
    
    const mins = parseInt(timeMinutes) || 0;
    const secs = parseInt(timeSeconds) || 0;
    const timeRemaining = mins * 60 + secs;
    
    if (timeRemaining < 0 || timeRemaining > 180) {
      setError('Tempo restante inválido (0:00 a 3:00)');
      return;
    }
    
    const scoreNum = parseInt(score) || 0;
    
    const result = onAddResult(selectedPlayerId, won, attemptsNum, timeRemaining, scoreNum);
    
    if (result.success) {
      // Reset form
      setSelectedPlayerId(null);
      setWon(true);
      setAttempts('');
      setTimeMinutes('');
      setTimeSeconds('');
      setScore('');
      setError(null);
    } else {
      setError(result.error || 'Erro ao registrar');
    }
  };

  const handleFinish = () => {
    if (tournament.results.length < tournament.players.length) {
      setError(`Faltam ${tournament.players.length - tournament.results.length} resultados`);
      return;
    }
    onFinish();
  };

  const allResultsCollected = tournament.results.length === tournament.players.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900/20 to-black p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 px-4 py-2 rounded-full border border-blue-500/30 mb-3">
            <ClipboardList className="w-5 h-5 text-blue-400" />
            <span className="text-blue-300 font-medium">Coletando Resultados</span>
          </div>
          
          <h1 className="text-xl font-bold text-white mb-1">
            {tournament.results.length}/{tournament.players.length} resultados
          </h1>
          <p className="text-sm text-white/60">
            Digite os resultados de cada jogador
          </p>
        </motion.div>

        {/* Resultados já coletados */}
        {tournament.results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4"
          >
            <div className="text-xs text-white/50 mb-2">Resultados registrados:</div>
            <div className="space-y-2">
              {tournament.results.map((result, index) => (
                <div
                  key={result.playerId}
                  className={`
                    flex items-center justify-between p-2 rounded-lg
                    ${result.won ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{result.playerEmoji}</span>
                    <span className="text-sm text-white">{result.playerName}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={result.won ? 'text-green-400' : 'text-red-400'}>
                      {result.won ? '✅ Venceu' : '❌ Perdeu'}
                    </span>
                    <span className="text-white/50">{result.attempts} tent.</span>
                    <span className="text-white/50">
                      {Math.floor(result.timeRemaining / 60)}:{String(result.timeRemaining % 60).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Formulário de entrada */}
        {!allResultsCollected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4"
          >
            {/* Selecionar jogador */}
            <div className="mb-4">
              <label className="text-xs text-white/50 mb-2 block">Selecione o jogador:</label>
              <div className="grid grid-cols-2 gap-2">
                {playersWithoutResult.map(player => (
                  <button
                    key={player.id}
                    onClick={() => setSelectedPlayerId(player.id)}
                    className={`
                      flex items-center gap-2 p-3 rounded-lg text-left transition-all
                      ${selectedPlayerId === player.id
                        ? 'bg-primary/20 ring-2 ring-primary'
                        : 'bg-black/30 hover:bg-black/50'
                      }
                    `}
                  >
                    <span className="text-xl">{player.emoji}</span>
                    <span className="text-sm text-white truncate">{player.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedPlayerId && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {/* Vitória ou Derrota */}
                <div>
                  <label className="text-xs text-white/50 mb-2 block">Resultado:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setWon(true)}
                      className={`
                        flex items-center justify-center gap-2 p-3 rounded-lg transition-all
                        ${won
                          ? 'bg-green-500/30 ring-2 ring-green-500 text-green-300'
                          : 'bg-black/30 hover:bg-black/50 text-white/50'
                        }
                      `}
                    >
                      <Check className="w-5 h-5" />
                      <span>Venceu</span>
                    </button>
                    <button
                      onClick={() => setWon(false)}
                      className={`
                        flex items-center justify-center gap-2 p-3 rounded-lg transition-all
                        ${!won
                          ? 'bg-red-500/30 ring-2 ring-red-500 text-red-300'
                          : 'bg-black/30 hover:bg-black/50 text-white/50'
                        }
                      `}
                    >
                      <X className="w-5 h-5" />
                      <span>Perdeu</span>
                    </button>
                  </div>
                </div>

                {/* Tentativas */}
                <div>
                  <label className="text-xs text-white/50 mb-2 block flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Tentativas (1-8):
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="8"
                    value={attempts}
                    onChange={(e) => setAttempts(e.target.value)}
                    placeholder="Ex: 5"
                    className="bg-black/30 border-white/20"
                  />
                </div>

                {/* Tempo restante */}
                <div>
                  <label className="text-xs text-white/50 mb-2 block flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Tempo restante (min:seg):
                  </label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="number"
                      min="0"
                      max="3"
                      value={timeMinutes}
                      onChange={(e) => setTimeMinutes(e.target.value)}
                      placeholder="0"
                      className="w-20 bg-black/30 border-white/20 text-center"
                    />
                    <span className="text-white/50">:</span>
                    <Input
                      type="number"
                      min="0"
                      max="59"
                      value={timeSeconds}
                      onChange={(e) => setTimeSeconds(e.target.value)}
                      placeholder="00"
                      className="w-20 bg-black/30 border-white/20 text-center"
                    />
                  </div>
                </div>

                {/* Score (opcional) */}
                <div>
                  <label className="text-xs text-white/50 mb-2 block flex items-center gap-1">
                    <Trophy className="w-3 h-3" />
                    Pontuação (opcional):
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    placeholder="Ex: 2450"
                    className="bg-black/30 border-white/20"
                  />
                </div>

                <Button
                  onClick={handleSubmitResult}
                  className="w-full gap-2"
                >
                  <Check className="w-4 h-4" />
                  Registrar Resultado
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Erro */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-red-300">{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Botões */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 border-white/20 text-white hover:bg-white/10"
          >
            Voltar
          </Button>
          
          <Button
            onClick={handleFinish}
            disabled={!allResultsCollected}
            className="flex-1 gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
          >
            <Sparkles className="w-4 h-4" />
            Calcular Ranking
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {!allResultsCollected && (
          <p className="text-xs text-center text-white/40 mt-4">
            Colete todos os {tournament.players.length} resultados para finalizar
          </p>
        )}
      </div>
    </div>
  );
}
