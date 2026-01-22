import { motion } from 'framer-motion';
import type { GameStatus } from '@/hooks/useGame';

interface StatsBarProps {
  attempts: number;
  maxAttempts: number;
  gameStatus: GameStatus;
  score: number;
  timeRemaining: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function StatsBar({ attempts, gameStatus, score, timeRemaining }: StatsBarProps) {
  const isPlaying = gameStatus === 'playing';
  const isLowTime = timeRemaining <= 30 && isPlaying;

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
            {gameStatus !== 'notStarted' && (
              <p className="text-[10px] text-muted-foreground hidden sm:block">
                Tentativas: <span className="text-foreground">{attempts}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
          {gameStatus !== 'notStarted' && (
            <>
              <StatPill label="⭐" value={score.toString()} />
              <StatPill 
                label="⏱️" 
                value={formatTime(timeRemaining)} 
                variant={isLowTime ? 'danger' : 'default'}
              />
            </>
          )}
        </div>
      </motion.div>
    </header>
  );
}

function StatPill({ 
  label, 
  value, 
  variant = 'default' 
}: { 
  label: string; 
  value: string; 
  variant?: 'default' | 'danger';
}) {
  return (
    <motion.div 
      className={`px-3 py-1.5 rounded-full text-sm font-bold flex items-center gap-1.5 border ${
        variant === 'danger' 
          ? 'border-destructive/50 bg-destructive/20 text-destructive animate-pulse' 
          : 'border-border/50 bg-muted/30'
      }`}
      animate={variant === 'danger' ? { scale: [1, 1.05, 1] } : {}}
      transition={{ repeat: Infinity, duration: 1 }}
    >
      <span>{label}</span>
      <span>{value}</span>
    </motion.div>
  );
}
