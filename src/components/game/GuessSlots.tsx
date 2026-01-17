import { motion, AnimatePresence } from 'framer-motion';
import { Symbol } from './Symbol';
import type { GuessSlot } from '@/hooks/useGame';

interface GuessSlotsProps {
  guess: GuessSlot[];
  onClear: (index: number) => void;
  disabled?: boolean;
}

export function GuessSlots({ guess, onClear, disabled }: GuessSlotsProps) {
  return (
    <div className="flex gap-2 sm:gap-3 justify-center">
      {guess.map((symbol, index) => (
        <motion.button
          key={index}
          whileHover={!disabled && symbol ? { scale: 1.08 } : {}}
          whileTap={!disabled && symbol ? { scale: 0.92 } : {}}
          onClick={() => !disabled && symbol && onClear(index)}
          disabled={disabled}
          className={`
            guess-slot
            ${symbol ? 'filled' : ''} 
            ${disabled ? 'cursor-not-allowed opacity-60' : ''}
          `}
        >
          <AnimatePresence mode="wait">
            {symbol && (
              <motion.div
                key={symbol.id}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                <Symbol symbol={symbol} size="lg" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      ))}
    </div>
  );
}
