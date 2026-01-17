import { motion } from 'framer-motion';
import { TokenPicker } from './TokenPicker';
import { GuessSlots } from './GuessSlots';
import { HistoryLog } from './HistoryLog';
import { Button } from '@/components/ui/button';
import type { GameState } from '@/hooks/useGame';

interface GameBoardProps {
  state: GameState;
  tokens: string[];
  onSelectToken: (token: string) => void;
  onClearSlot: (index: number) => void;
  onSubmit: () => void;
  onNewGame: () => void;
  onReveal: () => void;
}

export function GameBoard({
  state,
  tokens,
  onSelectToken,
  onClearSlot,
  onSubmit,
  onNewGame,
  onReveal,
}: GameBoardProps) {
  const isPlaying = state.gameStatus === 'playing';
  const canSubmit = isPlaying && !state.guess.includes(null);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card rounded-2xl p-6 space-y-6"
    >
      {/* Controls */}
      <div className="flex gap-3 flex-wrap">
        <Button onClick={onNewGame} variant="primary" size="lg">
          Novo código
        </Button>
        <Button onClick={onReveal} variant="danger" size="lg" disabled={!isPlaying}>
          Revelar
        </Button>
      </div>

      {/* Game Status Messages */}
      {state.gameStatus === 'won' && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-4 rounded-xl bg-success/20 border border-success/50 text-center"
        >
          <p className="text-xl font-bold text-success">🎉 Você venceu!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Score final: {state.score} pontos
          </p>
        </motion.div>
      )}

      {state.gameStatus === 'lost' && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-4 rounded-xl bg-destructive/20 border border-destructive/50 text-center"
        >
          <p className="text-xl font-bold text-destructive">😔 Fim de jogo!</p>
          <p className="text-sm text-muted-foreground mt-1">
            O código era: {state.secret.join(' ')}
          </p>
        </motion.div>
      )}

      {state.gameStatus === 'revealed' && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-4 rounded-xl bg-secondary/20 border border-secondary/50 text-center"
        >
          <p className="text-xl font-bold text-secondary">👁️ Código revelado</p>
          <p className="text-2xl mt-2">{state.secret.join(' ')}</p>
        </motion.div>
      )}

      {/* Guess Slots */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground text-center">Sua tentativa:</p>
        <GuessSlots 
          guess={state.guess} 
          onClear={onClearSlot} 
          disabled={!isPlaying}
        />
      </div>

      {/* Token Picker */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground text-center">Escolha as imagens:</p>
        <TokenPicker 
          tokens={tokens} 
          onSelect={onSelectToken} 
          disabled={!isPlaying}
        />
      </div>

      {/* Submit Button */}
      <Button 
        onClick={onSubmit} 
        variant="primary" 
        size="lg" 
        className="w-full"
        disabled={!canSubmit}
      >
        Enviar tentativa
      </Button>

      {/* History */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Histórico:</p>
        <HistoryLog history={state.history} />
      </div>
    </motion.div>
  );
}
