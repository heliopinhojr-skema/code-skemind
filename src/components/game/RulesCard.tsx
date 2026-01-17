import { motion } from 'framer-motion';

export function RulesCard() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card rounded-2xl p-6 space-y-4"
    >
      <h2 className="text-lg font-bold flex items-center gap-2">
        <span className="text-primary">📜</span> Regras
      </h2>
      
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Descubra o código secreto de <span className="text-foreground font-medium">4 imagens</span> em até <span className="text-foreground font-medium">10 tentativas</span>.
        </p>
        
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="peg peg-black" />
            <span>Imagem certa na posição certa</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="peg peg-white" />
            <span>Imagem certa na posição errada</span>
          </div>
        </div>

        <p className="pt-2 border-t border-border/30">
          Quanto mais rápido e com menos tentativas você acertar, maior sua pontuação!
        </p>
      </div>

      <div className="pt-4 border-t border-border/30">
        <h3 className="text-sm font-medium mb-2 text-foreground">Imagens disponíveis:</h3>
        <div className="flex flex-wrap gap-2">
          {["🔥", "💎", "⚡", "🌙", "🧠", "🛡️", "👁️", "🌀"].map((token) => (
            <span key={token} className="text-2xl">{token}</span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
