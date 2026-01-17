/**
 * SKEMIND Engine - Lógica pura do Mastermind
 * 
 * REGRAS:
 * - Código secreto: 4 símbolos únicos (sem repetição)
 * - Palpite: 4 símbolos únicos (sem repetição)
 * - Feedback: brancos (posição correta) + cinzas (símbolo correto, posição errada)
 * - Vitória: 4 brancos
 * - Derrota: 8 tentativas sem acertar
 */

export interface Symbol {
  readonly id: string;
  readonly label: string;
  readonly color: string;
}

export const CODE_LENGTH = 4;
export const MAX_ATTEMPTS = 8;

export const SYMBOLS: readonly Symbol[] = [
  { id: 'circle', label: '●', color: '#E53935' },
  { id: 'square', label: '■', color: '#1E88E5' },
  { id: 'triangle', label: '▲', color: '#43A047' },
  { id: 'diamond', label: '◆', color: '#FDD835' },
  { id: 'star', label: '★', color: '#8E24AA' },
  { id: 'hexagon', label: '⬡', color: '#00BCD4' },
] as const;

/**
 * Gera código secreto com 4 símbolos ÚNICOS
 * - Recebe a lista de IDs disponíveis (ex.: os 6 símbolos da UI)
 * - Embaralha e pega os 4 primeiros
 */
export function generateSecret(symbolIds: string[]): string[] {
  const uniqueIds = Array.from(new Set(symbolIds));
  if (uniqueIds.length < CODE_LENGTH) {
    throw new Error(`generateSecret: precisa de pelo menos ${CODE_LENGTH} símbolos únicos`);
  }

  // Fisher-Yates shuffle (em cópia)
  const ids = [...uniqueIds];
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }

  return ids.slice(0, CODE_LENGTH);
}

/**
 * Avalia palpite contra código secreto
 *
 * ALGORITMO MASTERMIND CLÁSSICO (2 passos):
 * PASSO 1 — BRANCOS (posição correta)
 *   - Conta guess[i] === secret[i]
 *   - Remove essas posições da comparação
 * PASSO 2 — CINZAS (símbolo correto, posição errada)
 *   - Compara apenas os restantes
 *   - Cada símbolo pode ser contado apenas uma vez
 *
 * IMPORTANTE: usa apenas cópias locais; não muta os inputs por referência.
 */
export function evaluateGuess(
  secret: string[],
  guess: string[],
): { whites: number; grays: number } {
  // Cópias locais (imutabilidade dos inputs)
  const secretCopy = [...secret];
  const guessCopy = [...guess];

  let whites = 0;

  // Resto após remover brancos
  const secretRemainder: string[] = [];
  const guessRemainder: string[] = [];

  // PASSO 1 — BRANCOS (somente quando ambos são strings válidas)
  for (let i = 0; i < CODE_LENGTH; i++) {
    const s = secretCopy[i];
    const g = guessCopy[i];

    if (typeof s === 'string' && typeof g === 'string' && g === s) {
      whites++;
      continue;
    }

    // remove da comparação: só entra nos 'restantes'
    if (typeof s === 'string') secretRemainder.push(s);
    if (typeof g === 'string') guessRemainder.push(g);
  }

  // PASSO 2 — CINZAS
  // Para cada símbolo restante no guess, procura 1 ocorrência no secret restante
  // e remove para garantir que nunca conta duas vezes.
  let grays = 0;
  const secretBag = [...secretRemainder];
  for (const g of guessRemainder) {
    const idx = secretBag.indexOf(g);
    if (idx !== -1) {
      grays++;
      secretBag.splice(idx, 1);
    }
  }

  return { whites, grays };
}

/**
 * Busca símbolo por ID
 */
export function getSymbolById(id: string): Symbol | undefined {
  return SYMBOLS.find(s => s.id === id);
}

/**
 * Verifica se palpite é válido (4 símbolos únicos)
 */
export function isValidGuess(guess: string[]): boolean {
  if (guess.length !== CODE_LENGTH) return false;
  if (new Set(guess).size !== CODE_LENGTH) return false;
  return guess.every(id => SYMBOLS.some(s => s.id === id));
}
