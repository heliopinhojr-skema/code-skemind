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
 * Usa Fisher-Yates para embaralhar e pega os 4 primeiros
 */
export function generateSecret(): string[] {
  const ids = SYMBOLS.map(s => s.id);
  
  // Fisher-Yates shuffle
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  
  // Retorna cópia dos 4 primeiros (todos únicos)
  return ids.slice(0, CODE_LENGTH);
}

/**
 * Avalia palpite contra código secreto
 * 
 * ALGORITMO MASTERMIND CLÁSSICO:
 * 1. Primeiro conta TODOS os brancos (posição exata)
 * 2. Marca esses símbolos como usados
 * 3. Depois conta cinzas (símbolo certo, posição errada)
 * 4. Nunca conta o mesmo símbolo duas vezes
 * 
 * @param secret - Array de IDs do código secreto
 * @param guess - Array de IDs do palpite
 * @returns { whites, grays } - Contagem de pinos
 */
export function evaluateGuess(secret: string[], guess: string[]): { whites: number; grays: number } {
  // Trabalha com cópias para não mutar os originais
  const secretCopy = [...secret];
  const guessCopy = [...guess];
  
  let whites = 0;
  let grays = 0;
  
  const secretUsed = [false, false, false, false];
  const guessUsed = [false, false, false, false];
  
  // PASSO 1: Contar brancos (posição exata)
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessCopy[i] === secretCopy[i]) {
      whites++;
      secretUsed[i] = true;
      guessUsed[i] = true;
    }
  }
  
  // PASSO 2: Contar cinzas (símbolo certo, posição errada)
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessUsed[i]) continue; // Já contou como branco
    
    for (let j = 0; j < CODE_LENGTH; j++) {
      if (secretUsed[j]) continue; // Já usado
      
      if (guessCopy[i] === secretCopy[j]) {
        grays++;
        secretUsed[j] = true;
        guessUsed[i] = true;
        break;
      }
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
