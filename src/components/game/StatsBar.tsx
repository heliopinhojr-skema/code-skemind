import { motion } from 'framer-motion';
import type { GameStatus } from '@/hooks/useGame';

interface StatsBarProps {
  attempts: number;
  maxAttempts: number;
  remainingSeconds: number;
  score: number;
  gameStatus: GameStatus;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function StatsBar({ attempts, maxAttempts, remainingSeconds, score, gameStatus }: StatsBarProps) {
  const isLowTime = remainingSeconds <= 30;
  const isPlaying = gameStatus === 'playing';
  
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
            <p className="text-[10px] text-muted-foreground hidden sm:block">Logic Game</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          <StatPill label="⏱" value={formatTime(remainingSeconds)} warning={isLowTime && isPlaying} />
          <StatPill label="🎯" value={`${attempts}/${maxAttempts}`} />
          <StatPill label="⭐" value={score.toString()} highlight={score > 0} />
        </div>
      </motion.div>
    </header>
  );
}

function StatPill({ 
  label, 
  value, 
  highlight, 
  warning 
}: { 
  label: string; 
  value: string; 
  highlight?: boolean;
  warning?: boolean;
}) {
  return (
    <motion.div 
      animate={warning ? { scale: [1, 1.05, 1] } : {}}
      transition={warning ? { repeat: Infinity, duration: 1 } : {}}
      className={`
        px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5
        border border-border/50 bg-muted/30
        ${highlight ? 'border-primary/60 glow-primary text-primary' : ''}
        ${warning ? 'border-destructive/60 text-destructive animate-pulse' : ''}
      `}
    >
      <span>{label}</span>
      <span>{value}</span>
    </motion.div>
  );
}
