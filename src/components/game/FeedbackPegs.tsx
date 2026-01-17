import { motion } from 'framer-motion';

interface FeedbackPegsProps {
  black: number;
  white: number;
  total?: number;
}

export function FeedbackPegs({ black, white, total = 4 }: FeedbackPegsProps) {
  const empty = total - black - white;
  
  return (
    <div className="flex gap-1.5 items-center">
      {Array.from({ length: black }).map((_, i) => (
        <motion.div
          key={`black-${i}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.1 }}
          className="peg peg-black"
        />
      ))}
      {Array.from({ length: white }).map((_, i) => (
        <motion.div
          key={`white-${i}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: (black + i) * 0.1 }}
          className="peg peg-white"
        />
      ))}
      {Array.from({ length: empty }).map((_, i) => (
        <motion.div
          key={`empty-${i}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: (black + white + i) * 0.1 }}
          className="peg peg-empty"
        />
      ))}
    </div>
  );
}
