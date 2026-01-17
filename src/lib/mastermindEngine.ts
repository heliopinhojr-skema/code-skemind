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
 * ALGORITMO MASTERMIND CLÁSSICO (2 passes):
 * 1) Conta EXACT (símbolo e posição corretos)
 * 2) Marca slots usados
 * 3) Conta PRESENT (símbolo correto em posição errada) apenas nos restantes
 *
 * IMPORTANTE: não muta os inputs.
 */
export function evaluateGuess(
  secret: string[],
  guess: string[],
): { exact: number; present: number } {
  const secretCopy = [...secret];
  const guessCopy = [...guess];

  let exact = 0;
  let present = 0;

  const secretUsed = [false, false, false, false];
  const guessUsed = [false, false, false, false];

  // PASSO 1: EXACT (posição exata)
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessCopy[i] === secretCopy[i]) {
      exact++;
      secretUsed[i] = true;
      guessUsed[i] = true;
    }
  }

  // PASSO 2: PRESENT (símbolo certo, posição errada)
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessUsed[i]) continue;

    for (let j = 0; j < CODE_LENGTH; j++) {
      if (secretUsed[j]) continue;

      if (guessCopy[i] === secretCopy[j]) {
        present++;
        secretUsed[j] = true;
        guessUsed[i] = true;
        break;
      }
    }
  }

  return { exact, present };
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
