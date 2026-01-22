import { motion } from 'framer-motion';

interface FeedbackPegsProps {
  correctPosition: number; // Exact matches (símbolo certo na posição certa)
  correctSymbol: number;   // Partial matches (símbolo certo na posição errada)
  total?: number;
  attemptId?: string;      // ID único da tentativa para keys estáveis
}

/**
 * Mastermind Feedback Pegs
 * 
 * REGRAS CLÁSSICAS:
 * - Peg BRANCO = Acerto EXATO (símbolo correto na posição correta)
 * - Peg CINZA = Acerto PARCIAL (símbolo correto na posição errada)
 * - Peg VAZIO = Nenhum match
 * 
 * A ORDEM dos pegs NÃO revela qual símbolo acertou (comportamento clássico)
 * O total de pegs nunca ultrapassa 4
 */
export function FeedbackPegs({ correctPosition, correctSymbol, total = 4, attemptId = '' }: FeedbackPegsProps) {
  // Garantir que nunca ultrapassamos o total
  const safeExact = Math.min(correctPosition, total);
  const safePartial = Math.min(correctSymbol, total - safeExact);
  const empty = Math.max(0, total - safeExact - safePartial);

  // Prefixo único para keys baseado no attemptId
  const keyPrefix = attemptId || crypto.randomUUID();
  
  return (
    <div className="flex gap-1.5 items-center bg-primary/20 px-2 py-1.5 rounded-lg border border-primary/30">
      {/* Acertos EXATOS primeiro (branco) */}
      {Array.from({ length: safeExact }).map((_, i) => (
        <motion.div
          key={`${keyPrefix}-exact-${i}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.08, type: 'spring', stiffness: 400 }}
          className="peg peg-exact"
          title="Símbolo correto na posição correta"
        />
      ))}
      {/* Acertos PARCIAIS depois (preto) */}
      {Array.from({ length: safePartial }).map((_, i) => (
        <motion.div
          key={`${keyPrefix}-partial-${i}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: (safeExact + i) * 0.08, type: 'spring', stiffness: 400 }}
          className="peg peg-partial"
          title="Símbolo correto na posição errada"
        />
      ))}
      {/* Vazios por último */}
      {Array.from({ length: empty }).map((_, i) => (
        <motion.div
          key={`${keyPrefix}-empty-${i}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: (safeExact + safePartial + i) * 0.08 }}
          className="peg peg-empty"
        />
      ))}
    </div>
  );
}
