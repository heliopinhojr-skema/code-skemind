import { motion, AnimatePresence } from 'framer-motion';
import type { GuessSlot } from '@/hooks/useGame';

interface GuessSlotsProps {
  guess: GuessSlot[];
  onClear: (index: number) => void;
  disabled?: boolean;
}

export function GuessSlots({ guess, onClear, disabled }: GuessSlotsProps) {
  return (
    <div className="flex gap-3 justify-center">
      {guess.map((token, index) => (
        <motion.button
          key={index}
          whileHover={!disabled && token ? { scale: 1.05 } : {}}
          whileTap={!disabled && token ? { scale: 0.95 } : {}}
          onClick={() => !disabled && token && onClear(index)}
          disabled={disabled}
          className={`token-slot ${token ? 'filled' : ''} ${disabled ? 'cursor-not-allowed' : ''}`}
        >
          <AnimatePresence mode="wait">
            {token && (
              <motion.span
                key={token}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                {token}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      ))}
    </div>
  );
}
