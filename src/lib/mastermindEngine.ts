/**
 * SKEMIND (Mastermind) Engine
 */

export interface Symbol {
  readonly id: string;
  readonly label: string;
  readonly color: string;
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

export function generateSecret(): string[] {
  const available = SYMBOLS.map(s => s.id);
  const out: string[] = [];

  for (let i = 0; i < CODE_LENGTH; i++) {
    const idx = Math.floor(Math.random() * available.length);
    out.push(available[idx]);
    available.splice(idx, 1);
  }

  return out;
}

export function evaluateGuess(secret: string[], guess: string[]) {
  let exact = 0;
  let present = 0;

  const secretUsed = [false, false, false, false];
  const guessUsed = [false, false, false, false];

  // PASSO 1 — brancos
  for (let i = 0; i < 4; i++) {
    if (guess[i] === secret[i]) {
      exact++;
      secretUsed[i] = true;
      guessUsed[i] = true;
    }
  }

  // PASSO 2 — cinzas
  for (let i = 0; i < 4; i++) {
    if (guessUsed[i]) continue;
    for (let j = 0; j < 4; j++) {
      if (secretUsed[j]) continue;
      if (guess[i] === secret[j]) {
        present++;
        secretUsed[j] = true;
        guessUsed[i] = true;
        break;
      }
    }
  }

  return { exact, present };
}

export function getSymbolById(id: string): Symbol | undefined {
  return SYMBOLS.find(s => s.id === id);
}
