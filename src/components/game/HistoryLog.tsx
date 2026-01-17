import { motion, AnimatePresence } from 'framer-motion';
import { Symbol } from './Symbol';
import { FeedbackPegs } from './FeedbackPegs';
import { SYMBOLS, type AttemptResult } from '@/hooks/useGame';

interface HistoryLogProps {
  history: AttemptResult[];
}

/**
 * HistoryLog
 *
 * Blindagem:
 * - Nunca faz .map em algo potencialmente null/undefined
 * - Cada item do histórico segue { guess: string[], whites, blacks }
 */
export function HistoryLog({ history }: HistoryLogProps) {
  const safeHistory = Array.isArray(history) ? history : [];

  if (safeHistory.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Nenhuma tentativa ainda
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-32 overflow-y-auto">
      <AnimatePresence>
        {safeHistory.map((attempt, index) => {
          const guessIds = Array.isArray(attempt.guess) ? attempt.guess : [];
          const whites = Number.isFinite(attempt.whites) ? attempt.whites : 0;
          const blacks = Number.isFinite(attempt.blacks) ? attempt.blacks : 0;

          return (
            <motion.div
              key={`${safeHistory.length - index}`}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex items-center justify-between gap-3 p-2 rounded-xl bg-muted/20"
            >
              <div className="flex gap-1.5">
                {guessIds.map((id, i) => {
                  const symbol = SYMBOLS.find(s => s.id === id);

                  return (
                    <div key={`${id}-${i}`} className="history-symbol">
                      {symbol ? <Symbol symbol={symbol} size="sm" /> : null}
                    </div>
                  );
                })}
              </div>

              <FeedbackPegs correctPosition={whites} correctSymbol={blacks} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

