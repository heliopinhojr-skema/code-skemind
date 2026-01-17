import { motion } from 'framer-motion';
import { Symbol } from './Symbol';
import type { GameSymbol } from '@/hooks/useGame';
import type { EnvironmentalConfig } from '@/lib/seededRng';

interface TokenPickerProps {
  symbols: readonly GameSymbol[];
  onSelect: (symbol: GameSymbol) => void;
  disabled?: boolean;
  selectedIds?: string[];
  environmentalConfig?: EnvironmentalConfig;
}

/**
 * TokenPicker com suporte a RNG Ambiental
 * 
 * A ordem visual dos símbolos pode variar por rodada (via environmentalConfig),
 * mas os símbolos em si e sua lógica permanecem inalterados.
 */
export function TokenPicker({ 
  symbols, 
  onSelect, 
  disabled, 
  selectedIds = [],
  environmentalConfig 
}: TokenPickerProps) {
  // Display all symbols
  const displaySymbols: GameSymbol[] = [...symbols];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 justify-center max-w-xs sm:max-w-sm mx-auto">
      {displaySymbols.map((symbol, index) => {
        const isUsed = selectedIds.includes(symbol.id);
        
        return (
          <motion.button
            key={symbol.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.03, type: 'spring', stiffness: 300 }}
            whileHover={disabled || isUsed ? {} : { scale: 1.15 }}
            whileTap={disabled || isUsed ? {} : { scale: 0.9 }}
            onClick={() => !disabled && !isUsed && onSelect(symbol)}
            disabled={disabled || isUsed}
            className={`
              symbol-picker
              ${disabled || isUsed ? 'opacity-30 cursor-not-allowed' : 'active:scale-95'}
            `}
          >
            <Symbol symbol={symbol} size="lg" />
          </motion.button>
        );
      })}
    </div>
  );
}
