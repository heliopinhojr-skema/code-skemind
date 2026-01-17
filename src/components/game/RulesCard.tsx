import { motion } from 'framer-motion';
import { SYMBOLS } from '@/hooks/useGame';
import { Symbol } from './Symbol';

export function RulesCard() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-2xl p-4 space-y-3"
    >
      <h2 className="text-base font-bold flex items-center gap-2">
        <span className="text-primary">📋</span> Rules
      </h2>
      
      <div className="space-y-2 text-xs text-muted-foreground">
        <p>
          Find the hidden <span className="text-foreground font-medium">4-symbol</span> sequence in <span className="text-foreground font-medium">8 attempts</span>.
        </p>
        <p>
          <span className="text-foreground font-medium">No repetition</span> in the secret code.
        </p>
        <p>
          Time limit: <span className="text-foreground font-medium">3 minutes</span>.
        </p>
        
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2">
            <div className="peg peg-black" />
            <span>Correct symbol, correct position</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="peg peg-white" />
            <span>Correct symbol, wrong position</span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-border/30">
        <h3 className="text-xs font-medium mb-2 text-foreground">Symbols:</h3>
        <div className="flex flex-wrap gap-2 justify-center">
          {SYMBOLS.map((symbol) => (
            <div key={symbol.id} className="w-8 h-8 flex items-center justify-center">
              <Symbol symbol={symbol} size="md" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
