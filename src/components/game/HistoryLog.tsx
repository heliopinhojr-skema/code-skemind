import { motion, AnimatePresence } from 'framer-motion';
import { FeedbackPegs } from './FeedbackPegs';
import type { AttemptResult } from '@/hooks/useGame';

interface HistoryLogProps {
  history: AttemptResult[];
}

export function HistoryLog({ history }: HistoryLogProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhuma tentativa ainda...
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
      <AnimatePresence>
        {history.map((attempt, index) => (
          <motion.div
            key={history.length - index}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="flex items-center justify-between gap-4 p-3 rounded-xl bg-muted/10 border border-border/30"
          >
            <div className="flex gap-2">
              {attempt.guess.map((token, i) => (
                <div key={i} className="log-mini">
                  {token}
                </div>
              ))}
            </div>
            <FeedbackPegs black={attempt.black} white={attempt.white} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
