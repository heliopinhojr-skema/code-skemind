import { motion } from 'framer-motion';

interface StatsBarProps {
  attempts: number;
  maxAttempts: number;
  elapsedSeconds: number;
  score: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function StatsBar({ attempts, maxAttempts, elapsedSeconds, score }: StatsBarProps) {
  return (
    <header className="sticky top-4 z-50 mx-auto max-w-4xl px-4">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="glass-card rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/20 flex items-center justify-center">
            <span className="text-xl">🧩</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-wide">SKEMIND</h1>
            <p className="text-xs text-muted-foreground">Mastermind por imagens</p>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <StatPill label="Tentativa" value={`${attempts}/${maxAttempts}`} />
          <StatPill label="Tempo" value={formatTime(elapsedSeconds)} />
          <StatPill label="Score" value={score.toString()} highlight={score > 0} />
        </div>
      </motion.div>
    </header>
  );
}

function StatPill({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`
      px-4 py-2 rounded-full text-sm font-medium
      border border-border/50 bg-muted/20
      ${highlight ? 'border-primary/50 glow-primary' : ''}
    `}>
      <span className="text-muted-foreground mr-1">{label}:</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
