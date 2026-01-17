import { motion } from 'framer-motion';

interface TokenPickerProps {
  tokens: string[];
  onSelect: (token: string) => void;
  disabled?: boolean;
}

export function TokenPicker({ tokens, onSelect, disabled }: TokenPickerProps) {
  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {tokens.map((token, index) => (
        <motion.button
          key={token}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.05, type: 'spring', stiffness: 300 }}
          whileHover={disabled ? {} : { scale: 1.1 }}
          whileTap={disabled ? {} : { scale: 0.95 }}
          onClick={() => !disabled && onSelect(token)}
          disabled={disabled}
          className={`token-picker ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          {token}
        </motion.button>
      ))}
    </div>
  );
}
