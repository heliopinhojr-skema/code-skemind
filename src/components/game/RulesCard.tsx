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
        <span className="text-primary">📋</span> Regras Oficiais
      </h2>

      <div className="space-y-2 text-xs text-muted-foreground">
        <p>
          Descubra a sequência secreta de <span className="text-foreground font-medium">4 símbolos distintos</span> em{' '}
          <span className="text-foreground font-medium">até 8 tentativas</span>.
        </p>
        <p>
          O secret <span className="text-foreground font-medium">não permite repetição</span> e <span className="text-foreground font-medium">não muda</span>{' '}
          durante a partida.
        </p>

        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2">
            <div className="peg peg-exact" />
            <span>Branco: símbolo correto na posição correta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="peg peg-partial" />
            <span>Cinza: símbolo correto na posição errada</span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-border/30">
        <h3 className="text-xs font-medium mb-2 text-foreground">Símbolos:</h3>
        <div className="flex flex-wrap gap-2 justify-center">
          {SYMBOLS.map(symbol => (
            <div key={symbol.id} className="w-8 h-8 flex items-center justify-center">
              <Symbol symbol={symbol} size="md" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
