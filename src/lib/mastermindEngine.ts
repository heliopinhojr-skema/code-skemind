/**
 * SKEMIND (Mastermind) Engine — REGRAS OFICIAIS
 *
 * Regras:
 * - CODE_LENGTH = 4
 * - Sem repetição no secret
 * - Feedback em 2 passos (obrigatório):
 *   PASSO 1: brancos (símbolo certo, posição certa) e marcar como null
 *   PASSO 2: cinzas (símbolo certo, posição errada) removendo só 1 ocorrência
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
 * Gera o secret SOMENTE quando chamado (ex.: ao clicar "Iniciar Jogo").
 * - Exatamente 4 símbolos
 * - Sem repetição
 */
export function generateSecret(): Symbol[] {
  const used = new Set<string>();
  const out: Symbol[] = [];

  while (out.length < CODE_LENGTH) {
    const idx = Math.floor(Math.random() * SYMBOLS.length);
    const candidate = SYMBOLS[idx];
    if (used.has(candidate.id)) continue;
    used.add(candidate.id);
    out.push(candidate);
  }

  return out;
}

/**
 * Avalia guess contra secret seguindo ESTRITAMENTE o algoritmo exigido:
 *
 * PASSO 1:
 * - comparar secret[i] === guess[i]
 * - contar branco
 * - marcar secret[i] = null e guess[i] = null
 *
 * PASSO 2:
 * - para cada símbolo restante em guess
 *   - se existir em secret
 *     - contar cinza
 *     - remover UMA ocorrência do símbolo no secret (marcar como null)
 */
export function evaluateGuess(secret: Symbol[], guess: Symbol[]): EvaluationResult {
  if (secret.length !== CODE_LENGTH || guess.length !== CODE_LENGTH) {
    throw new Error(`Secret e guess devem ter exatamente ${CODE_LENGTH} símbolos`);
  }

  // REGRA: nunca mutar o secret/guess originais.
  // Usar SEMPRE cópias locais que podem ser marcadas como null.
  const secretCopy: Array<Symbol | null> = [...secret];
  const guessCopy: Array<Symbol | null> = [...guess];

  let exact = 0;
  let present = 0;

  // PASSO 1 — BRANCOS (símbolo correto na posição correta)
  for (let i = 0; i < CODE_LENGTH; i++) {
    const s = secretCopy?.[i] ?? null;
    const g = guessCopy?.[i] ?? null;

    if (s && g && s.id === g.id) {
      exact++;
      secretCopy[i] = null;
      guessCopy[i] = null;
    }
  }

  // PASSO 2 — CINZAS (símbolo correto na posição errada)
  for (let i = 0; i < CODE_LENGTH; i++) {
    const g = guessCopy?.[i] ?? null;
    if (!g) continue;

    const j = secretCopy.findIndex(s => s !== null && s.id === g.id);
    if (j !== -1) {
      present++;
      secretCopy[j] = null; // remove UMA ocorrência
      guessCopy[i] = null;
    }
  }

  const feedback: Feedback = { exact, present };
  const isVictory = exact === CODE_LENGTH;
  return { feedback, isVictory };
}

/** Utilitário (testes) */
export function createSymbol(id: string): Symbol {
  const found = SYMBOLS.find(s => s.id === id);
  if (found) return found;
  return { id, label: id.charAt(0).toUpperCase(), color: '#888888' };
}

/** Utilitário (testes) */
export function createSymbolArray(ids: string[]): Symbol[] {
  return ids.map(createSymbol);
}
