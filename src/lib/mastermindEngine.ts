/**
 * SKEMIND (Mastermind) Engine — REGRAS OFICIAIS
 *
 * Regras:
 * - CODE_LENGTH = 4
 * - Sem repetição no secret
 * - Feedback em 2 passos (obrigatório):
 *   PASSO 1: brancos (símbolo certo, posição certa)
 *   PASSO 2: cinzas (símbolo certo, posição errada)
 */

export interface Symbol {
  readonly id: string;
  readonly label: string;
  readonly color: string;
}

export interface Feedback {
  /** Pino branco: símbolo correto na posição correta */
  readonly exact: number;
  /** Pino cinza: símbolo correto na posição errada */
  readonly present: number;
}

export interface EvaluationResult {
  readonly feedback: Feedback;
  readonly isVictory: boolean;
}

export const CODE_LENGTH = 4;

export const SYMBOLS: readonly Symbol[] = [
  { id: 'circle', label: '●', color: '#E53935' },
  { id: 'square', label: '■', color: '#1E88E5' },
  { id: 'triangle', label: '▲', color: '#43A047' },
  { id: 'diamond', label: '◆', color: '#FDD835' },
  { id: 'star', label: '★', color: '#8E24AA' },
  { id: 'hexagon', label: '⬡', color: '#00BCD4' },
] as const;

/**
 * Gera o secret SOMENTE quando chamado.
 * - Exatamente 4 símbolos
 * - Sem repetição
 */
export function generateSecret(): Symbol[] {
  const available = [...SYMBOLS];
  const out: Symbol[] = [];

  for (let i = 0; i < CODE_LENGTH; i++) {
    const idx = Math.floor(Math.random() * available.length);
    out.push(available[idx]);
    available.splice(idx, 1); // remove para evitar repetição
  }

  return out;
}

/**
 * Avalia guess contra secret.
 * 
 * ALGORITMO EM 2 PASSOS:
 * 
 * PASSO 1 — BRANCOS:
 * - Para cada posição i: se secret[i].id === guess[i].id
 *   - incrementa exact
 *   - marca ambas posições como "usadas"
 * 
 * PASSO 2 — CINZAS:
 * - Para cada símbolo restante em guess:
 *   - Se existir no secret restante (não usado)
 *     - incrementa present
 *     - marca como usado no secret
 * 
 * NUNCA muta os arrays originais — trabalha apenas com IDs.
 */
export function evaluateGuess(secret: Symbol[], guess: Symbol[]): EvaluationResult {
  if (secret.length !== CODE_LENGTH || guess.length !== CODE_LENGTH) {
    throw new Error(`Secret e guess devem ter exatamente ${CODE_LENGTH} símbolos`);
  }

  // Trabalha só com IDs (strings) para evitar qualquer problema de referência
  const secretIds = secret.map(s => s.id);
  const guessIds = guess.map(g => g.id);

  // Marca posições já usadas
  const secretUsed = [false, false, false, false];
  const guessUsed = [false, false, false, false];

  let exact = 0;
  let present = 0;

  // PASSO 1 — BRANCOS (posição correta)
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (secretIds[i] === guessIds[i]) {
      exact++;
      secretUsed[i] = true;
      guessUsed[i] = true;
    }
  }

  // PASSO 2 — CINZAS (símbolo correto, posição errada)
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessUsed[i]) continue; // já contou como branco

    // Procura esse símbolo no secret (que ainda não foi usado)
    for (let j = 0; j < CODE_LENGTH; j++) {
      if (secretUsed[j]) continue; // já foi usado
      
      if (guessIds[i] === secretIds[j]) {
        present++;
        secretUsed[j] = true; // marca como usado
        break; // só conta uma vez
      }
    }
  }

  return {
    feedback: { exact, present },
    isVictory: exact === CODE_LENGTH,
  };
}

/** Utilitário para testes */
export function createSymbol(id: string): Symbol {
  const found = SYMBOLS.find(s => s.id === id);
  if (found) return found;
  return { id, label: id.charAt(0).toUpperCase(), color: '#888888' };
}

/** Utilitário para testes */
export function createSymbolArray(ids: string[]): Symbol[] {
  return ids.map(createSymbol);
}
