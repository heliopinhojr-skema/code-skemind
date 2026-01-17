import { motion } from 'framer-motion';

interface FeedbackPegsProps {
  correctPosition: number;
  correctSymbol: number;
  total?: number;
}

export function FeedbackPegs({ correctPosition, correctSymbol, total = 4 }: FeedbackPegsProps) {
  const empty = total - correctPosition - correctSymbol;
  
  return (
    <div className="flex gap-1.5 items-center">
      {Array.from({ length: correctPosition }).map((_, i) => (
        <motion.div
          key={`black-${i}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.08, type: 'spring', stiffness: 400 }}
          className="peg peg-black"
        />
      ))}
      {Array.from({ length: correctSymbol }).map((_, i) => (
        <motion.div
          key={`white-${i}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: (correctPosition + i) * 0.08, type: 'spring', stiffness: 400 }}
          className="peg peg-white"
        />
      ))}
      {Array.from({ length: empty }).map((_, i) => (
        <motion.div
          key={`empty-${i}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: (correctPosition + correctSymbol + i) * 0.08 }}
          className="peg peg-empty"
        />
      ))}
    </div>
  );
}
