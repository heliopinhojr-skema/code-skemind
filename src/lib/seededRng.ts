/**
 * RNG AMBIENTAL SKEMIND v1
 * 
 * "O ambiente muda. A regra permanece."
 * 
 * Este módulo implementa RNG determinístico baseado em seed.
 * 
 * REGRAS:
 * - O RNG afeta APENAS elementos visuais/ambientais
 * - NUNCA interfere na lógica do jogo, feedback, pontuação ou resultado
 * - Todos os jogadores da mesma sala vêem o MESMO ambiente (via roomSeed)
 * - Cada nova rodada gera um novo ambiente
 * - Após início da rodada, o mapa fica TRAVADO
 */

/**
 * Mulberry32 - Fast seeded PRNG
 * Retorna função que gera números entre 0 e 1
 */
export function createSeededRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Gera seed numérico a partir de string (roomId ou roundId)
 */
export function stringToSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Fisher-Yates shuffle usando RNG seeded
 * Retorna nova array embaralhada (não muta original)
 */
export function seededShuffle<T>(array: readonly T[], rng: () => number): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Configuração ambiental gerada por RNG
 * Afeta APENAS o visual, NUNCA a lógica
 */
export interface EnvironmentalConfig {
  // Ordem visual dos símbolos no picker (não muda seus IDs/valores)
  symbolPickerOrder: number[];
  
  // Rotação sutil do grid (em graus, -3 a +3)
  gridRotation: number;
  
  // Variação de espaçamento (0.9 a 1.1)
  spacingMultiplier: number;
  
  // Padrão de fundo (0-5)
  backgroundPattern: number;
  
  // Offset visual dos elementos (não afeta posição lógica)
  visualOffsets: { x: number; y: number }[];
  
  // Seed usado (para debug/verificação)
  seed: number;
  
  // Timestamp de quando foi gerado (para confirmar travamento)
  generatedAt: number;
}

/**
 * Gera configuração ambiental baseada em seed
 * Esta configuração é IMUTÁVEL após geração
 */
export function generateEnvironmentalConfig(roundId: string, symbolCount: number = 6): EnvironmentalConfig {
  const seed = stringToSeed(roundId);
  const rng = createSeededRng(seed);
  
  // Ordem visual dos símbolos (apenas visual, não lógico)
  const indices = Array.from({ length: symbolCount }, (_, i) => i);
  const symbolPickerOrder = seededShuffle(indices, rng);
  
  // Rotação sutil (-3 a +3 graus)
  const gridRotation = (rng() - 0.5) * 6;
  
  // Variação de espaçamento (0.95 a 1.05)
  const spacingMultiplier = 0.95 + rng() * 0.1;
  
  // Padrão de fundo
  const backgroundPattern = Math.floor(rng() * 6);
  
  // Offsets visuais sutis para cada símbolo
  const visualOffsets = Array.from({ length: symbolCount }, () => ({
    x: (rng() - 0.5) * 4, // -2px a +2px
    y: (rng() - 0.5) * 4,
  }));
  
  return Object.freeze({
    symbolPickerOrder,
    gridRotation,
    spacingMultiplier,
    backgroundPattern,
    visualOffsets,
    seed,
    generatedAt: Date.now(),
  }) as EnvironmentalConfig;
}

// Padrões de fundo disponíveis
export const BACKGROUND_PATTERNS = [
  'radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.05) 0%, transparent 50%)',
  'radial-gradient(circle at 80% 70%, hsl(var(--accent) / 0.05) 0%, transparent 50%)',
  'linear-gradient(135deg, hsl(var(--primary) / 0.03) 0%, transparent 100%)',
  'linear-gradient(45deg, hsl(var(--accent) / 0.03) 0%, transparent 100%)',
  'radial-gradient(circle at 50% 50%, hsl(var(--muted) / 0.05) 0%, transparent 70%)',
  'conic-gradient(from 0deg at 50% 50%, hsl(var(--primary) / 0.02) 0%, transparent 25%, hsl(var(--accent) / 0.02) 50%, transparent 75%, hsl(var(--primary) / 0.02) 100%)',
] as const;
