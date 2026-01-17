import { motion } from 'framer-motion';
import type { GameStatus } from '@/hooks/useGame';

interface StatsBarProps {
  attempts: number;
  maxAttempts: number;
  gameStatus: GameStatus;
}

export function StatsBar({ attempts, maxAttempts, gameStatus }: StatsBarProps) {
  return (
    <header className="w-full px-3 pt-3">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-card rounded-2xl p-3 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/40 to-secondary/30 flex items-center justify-center">
            <span className="text-lg">🧠</span>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-wide">SKEMIND</h1>
            <p className="text-[10px] text-muted-foreground hidden sm:block">
              Status: <span className="text-foreground">{gameStatus}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          <StatPill label="🎯" value={`${attempts}/${maxAttempts}`} />
        </div>
      </motion.div>
    </header>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 border border-border/50 bg-muted/30">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
