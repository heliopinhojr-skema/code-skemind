import { motion } from 'framer-motion';
import type { GameSymbol } from '@/hooks/useGame';

interface SymbolProps {
  symbol: GameSymbol;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function Symbol({ symbol, size = 'md', className = '' }: SymbolProps) {
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  const renderShape = () => {
    const fill = symbol.color;
    const stroke = symbol.color;
    
    switch (symbol.shape) {
      case 'circle':
        return (
          <svg viewBox="0 0 24 24" className={sizeClasses[size]}>
            <circle cx="12" cy="12" r="10" fill={fill} />
          </svg>
        );
      case 'square':
        return (
          <svg viewBox="0 0 24 24" className={sizeClasses[size]}>
            <rect x="2" y="2" width="20" height="20" rx="2" fill={fill} />
          </svg>
        );
      case 'triangle':
        return (
          <svg viewBox="0 0 24 24" className={sizeClasses[size]}>
            <polygon points="12,2 22,22 2,22" fill={fill} />
          </svg>
        );
      case 'diamond':
        return (
          <svg viewBox="0 0 24 24" className={sizeClasses[size]}>
            <polygon points="12,2 22,12 12,22 2,12" fill={fill} />
          </svg>
        );
      case 'star':
        return (
          <svg viewBox="0 0 24 24" className={sizeClasses[size]}>
            <polygon 
              points="12,2 15,9 22,9 16.5,14 18.5,22 12,18 5.5,22 7.5,14 2,9 9,9" 
              fill={fill} 
            />
          </svg>
        );
      case 'hexagon':
        return (
          <svg viewBox="0 0 24 24" className={sizeClasses[size]}>
            <polygon 
              points="12,2 21,7 21,17 12,22 3,17 3,7" 
              fill={fill} 
            />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div 
      className={`flex items-center justify-center ${className}`}
      style={{ filter: `drop-shadow(0 0 8px ${symbol.color}50)` }}
    >
      {renderShape()}
    </motion.div>
  );
}
