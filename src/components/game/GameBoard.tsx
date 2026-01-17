import { motion } from 'framer-motion';
import { TokenPicker } from './TokenPicker';
import { GuessSlots } from './GuessSlots';
import { HistoryLog } from './HistoryLog';
import { Symbol } from './Symbol';
import { Button } from '@/components/ui/button';
import type { GameState, GameSymbol } from '@/hooks/useGame';
import type { EnvironmentalConfig } from '@/lib/seededRng';
import { BACKGROUND_PATTERNS } from '@/lib/seededRng';

interface GameBoardProps {
  state: GameState;
  secretCode: GameSymbol[];
  symbols: GameSymbol[];
  onSelectSymbol: (symbol: GameSymbol) => void;
  onClearSlot: (index: number) => void;
  onSubmit: () => void;
  onNewGame: () => void;
  environmentalConfig?: EnvironmentalConfig;
}

export function GameBoard({
  state,
  secretCode,
  symbols,
  onSelectSymbol,
  onClearSlot,
  onSubmit,
  onNewGame,
  environmentalConfig,
}: GameBoardProps) {
  const isPlaying = state.gameStatus === 'playing';
  const isLocked = !isPlaying;
  const canSubmit = isPlaying && !state.guess.includes(null);
  
  // Get currently selected symbol IDs to prevent duplicate selection
  const selectedIds = state.guess.filter(Boolean).map(s => s!.id);

  // Padrão de fundo ambiental
  const backgroundStyle = environmentalConfig
    ? { backgroundImage: BACKGROUND_PATTERNS[environmentalConfig.backgroundPattern] }
    : undefined;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card rounded-2xl p-4 space-y-4 flex flex-col relative overflow-hidden"
      style={backgroundStyle}
    >
      {/* Game Status Messages */}
      {state.gameStatus === 'victory' && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-4 rounded-xl bg-success/20 border border-success/50 text-center"
        >
          <p className="text-xl font-bold text-success">🎉 Victory!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Score: <span className="text-success font-bold">{state.score}</span> points
          </p>
        </motion.div>
      )}

      {state.gameStatus === 'defeat' && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-4 rounded-xl bg-destructive/20 border border-destructive/50 text-center"
        >
          <p className="text-xl font-bold text-destructive">💔 Game Over!</p>
          <p className="text-xs text-muted-foreground mt-2">The code was:</p>
          <div className="flex justify-center gap-2 mt-2">
            {secretCode.map((symbol, i) => (
              <div key={i} className="w-10 h-10 flex items-center justify-center bg-muted/30 rounded-lg">
                <Symbol symbol={symbol} size="md" />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {state.gameStatus === 'timeout' && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-4 rounded-xl bg-destructive/20 border border-destructive/50 text-center"
        >
          <p className="text-xl font-bold text-destructive">⏰ Time's Up!</p>
          <p className="text-xs text-muted-foreground mt-2">The code was:</p>
          <div className="flex justify-center gap-2 mt-2">
            {secretCode.map((symbol, i) => (
              <div key={i} className="w-10 h-10 flex items-center justify-center bg-muted/30 rounded-lg">
                <Symbol symbol={symbol} size="md" />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Current Guess */}
      {isPlaying && (
        <>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">Your guess:</p>
            <GuessSlots 
              guess={state.guess} 
              onClear={onClearSlot} 
              disabled={isLocked}
            />
          </div>

          {/* Symbol Picker */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">Pick symbols:</p>
            <TokenPicker 
              symbols={symbols} 
              onSelect={onSelectSymbol} 
              disabled={isLocked}
              selectedIds={selectedIds}
              environmentalConfig={environmentalConfig}
            />
          </div>

          {/* Submit Button */}
          <Button 
            onClick={onSubmit} 
            variant="primary" 
            size="lg" 
            className="w-full h-14 text-lg font-bold"
            disabled={!canSubmit}
          >
            Submit Guess
          </Button>
        </>
      )}

      {/* New Game Button */}
      {isLocked && (
        <Button 
          onClick={onNewGame} 
          variant="primary" 
          size="lg" 
          className="w-full h-14 text-lg font-bold"
        >
          🔄 New Round
        </Button>
      )}

      {/* History */}
      {state.history.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">History:</p>
          <HistoryLog history={state.history} />
        </div>
      )}
    </motion.div>
  );
}
