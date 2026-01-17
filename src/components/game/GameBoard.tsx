import { motion } from 'framer-motion';
import { TokenPicker } from './TokenPicker';
import { GuessSlots } from './GuessSlots';
import { HistoryLog } from './HistoryLog';
import { Symbol } from './Symbol';
import { Button } from '@/components/ui/button';
import type { GameState, GameSymbol } from '@/hooks/useGame';

interface GameBoardProps {
  state: GameState;
  secretCode: GameSymbol[];
  symbols: readonly GameSymbol[];
  onSelectSymbol: (symbol: GameSymbol) => void;
  onClearSlot: (index: number) => void;
  onSubmit: () => void;
  onNewGame: () => void;
  onStartGame: () => void;
}

export function GameBoard({
  state,
  secretCode,
  symbols,
  onSelectSymbol,
  onClearSlot,
  onSubmit,
  onNewGame,
  onStartGame,
}: GameBoardProps) {
  const isPlaying = state.status === 'playing';
  const isNotStarted = state.status === 'notStarted';
  const isGameOver = state.status === 'won' || state.status === 'lost';
  const canSubmit = isPlaying && !state.currentGuess.includes(null);

  // IDs selecionados (para highlight e bloqueio de duplicação no picker)
  const selectedIds = state.currentGuess.filter(Boolean).map(s => s!.id);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card rounded-2xl p-4 space-y-4 flex flex-col"
    >
      {/* Not Started */}
      {isNotStarted && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-6 text-center space-y-4"
        >
          <h2 className="text-2xl font-bold text-foreground">SKEMIND</h2>
          <p className="text-muted-foreground">Descubra o código secreto de 4 símbolos em até 8 tentativas.</p>
          <Button onClick={onStartGame} variant="primary" size="lg" className="w-full h-14 text-lg font-bold">
            Iniciar Jogo
          </Button>
        </motion.div>
      )}

      {/* Victory */}
      {state.status === 'won' && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-4 rounded-xl bg-success/20 border border-success/50 text-center"
        >
          <p className="text-xl font-bold text-success">Vitória!</p>
          <p className="text-sm text-muted-foreground mt-1">Você descobriu o código em {state.attempts} tentativa(s).</p>
        </motion.div>
      )}

      {/* Defeat */}
      {state.status === 'lost' && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-4 rounded-xl bg-destructive/20 border border-destructive/50 text-center"
        >
          <p className="text-xl font-bold text-destructive">Derrota!</p>
          <p className="text-xs text-muted-foreground mt-2">O código era:</p>
          <div className="flex justify-center gap-2 mt-2">
            {secretCode.map((symbol, i) => (
              <div key={i} className="w-10 h-10 flex items-center justify-center bg-muted/30 rounded-lg">
                <Symbol symbol={symbol} size="md" />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Playing */}
      {isPlaying && (
        <>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">Seu palpite:</p>
            <GuessSlots guess={state.currentGuess} onClear={onClearSlot} disabled={!isPlaying} />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">Escolha os símbolos:</p>
            <TokenPicker symbols={symbols} onSelect={onSelectSymbol} disabled={!isPlaying} selectedIds={selectedIds} />
          </div>

          <Button
            onClick={onSubmit}
            variant="primary"
            size="lg"
            className="w-full h-14 text-lg font-bold"
            disabled={!canSubmit}
          >
            Enviar Palpite
          </Button>
        </>
      )}

      {/* New Game */}
      {isGameOver && (
        <Button onClick={onNewGame} variant="primary" size="lg" className="w-full h-14 text-lg font-bold">
          Novo Jogo
        </Button>
      )}

      {/* History */}
      {state.history.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Histórico:</p>
          <HistoryLog history={state.history} />
        </div>
      )}
    </motion.div>
  );
}
