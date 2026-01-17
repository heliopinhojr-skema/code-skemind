import { motion, AnimatePresence } from 'framer-motion';
import { Symbol } from './Symbol';
import { FeedbackPegs } from './FeedbackPegs';
import type { AttemptResult } from '@/hooks/useGame';

interface HistoryLogProps {
  history: AttemptResult[];
}

/**
 * HistoryLog
 * 
 * Exibe o histórico de tentativas com feedback CONGELADO.
 * O feedback foi calculado no momento do submit e armazenado no history.
 * NÃO recalcula o feedback ao renderizar.
 */
export function HistoryLog({ history }: HistoryLogProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        Nenhuma tentativa ainda
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-32 overflow-y-auto">
      <AnimatePresence>
        {history.map((attempt, index) => (
          <motion.div
            key={history.length - index}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex items-center justify-between gap-3 p-2 rounded-xl bg-muted/20"
          >
            <div className="flex gap-1.5">
              {attempt.guess.map((symbol, i) => (
                <div key={i} className="history-symbol">
                  <Symbol symbol={symbol} size="sm" />
                </div>
              ))}
            </div>
            {/* Usa feedback CONGELADO do histórico */}
            <FeedbackPegs 
              correctPosition={attempt.feedback.exact} 
              correctSymbol={attempt.feedback.present} 
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
