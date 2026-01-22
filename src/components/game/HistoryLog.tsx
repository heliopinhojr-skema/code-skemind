import { motion, AnimatePresence } from 'framer-motion';
import { Symbol } from './Symbol';
import { FeedbackPegs } from './FeedbackPegs';
import { UI_SYMBOLS, type AttemptResult } from '@/hooks/useGame';

interface HistoryLogProps {
  history: AttemptResult[];
}

/**
 * HistoryLog - Histórico de tentativas
 * 
 * Cada entrada mostra:
 * - Os 4 símbolos do palpite
 * - Feedback (brancos = posição certa, cinzas = posição errada)
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
          const guessIds = Array.isArray(attempt.guessSnapshot) ? attempt.guessSnapshot : [];
          const whites = Number.isFinite(attempt.feedbackSnapshot?.whites) ? attempt.feedbackSnapshot.whites : 0;
          const grays = Number.isFinite(attempt.feedbackSnapshot?.grays) ? attempt.feedbackSnapshot.grays : 0;

          return (
            <motion.div
              key={attempt.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex items-center justify-between gap-3 p-2 rounded-xl bg-muted/20"
            >
              <div className="flex gap-1.5">
                {guessIds.map((id, i) => {
                  const symbol = UI_SYMBOLS.find(s => s.id === id);

                  return (
                    <div key={`${id}-${i}`} className="history-symbol">
                      {symbol ? <Symbol symbol={symbol} size="sm" /> : null}
                    </div>
                  );
                })}
              </div>

              <FeedbackPegs correctPosition={whites} correctSymbol={grays} attemptId={attempt.id} />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
