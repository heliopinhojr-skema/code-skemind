/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MASTERMIND ENGINE - IMPLEMENTAÇÃO PURA E DETERMINÍSTICA
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * REGRAS MATEMÁTICAS:
 * 1. Secret tem exatamente 4 símbolos SEM REPETIÇÃO
 * 2. Secret é gerado UMA VEZ e NUNCA muda durante a rodada
 * 3. Feedback segue algoritmo clássico de 2 passes
 * 4. Nenhum símbolo é contado mais de uma vez
 * 
 * ALGORITMO DE FEEDBACK:
 * - Pass 1: Contar EXATOS (mesmo símbolo, mesma posição)
 * - Pass 2: Contar PRESENTES (símbolo existe, posição errada)
 * 
 * Esta engine é:
 * - Pura (sem side effects)
 * - Determinística (mesma entrada = mesma saída)
 * - Testável (funções isoladas)
 * - Sem acesso a estado global
 */

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface Symbol {
  readonly id: string;
  readonly label: string;
  readonly color: string;
}

export interface Feedback {
  /** Símbolos na posição CORRETA (pino branco) */
  readonly exact: number;
  /** Símbolos PRESENTES mas na posição ERRADA (pino cinza) */
  readonly present: number;
}

export interface EvaluationResult {
  readonly feedback: Feedback;
  readonly isVictory: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════════════════

export const CODE_LENGTH = 4;

export const SYMBOLS: readonly Symbol[] = [
  { id: 'circle', label: '●', color: '#E53935' },     // círculo vermelho
  { id: 'square', label: '■', color: '#1E88E5' },     // quadrado azul
  { id: 'triangle', label: '▲', color: '#43A047' },   // triângulo verde
  { id: 'diamond', label: '◆', color: '#FDD835' },    // losango amarelo
  { id: 'star', label: '★', color: '#8E24AA' },       // estrela roxa
  { id: 'hexagon', label: '⬡', color: '#00BCD4' },    // hexágono ciano
] as const;

// ═══════════════════════════════════════════════════════════════════════════
// GERAÇÃO DO SECRET
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gera um código secreto com exatamente CODE_LENGTH símbolos únicos.
 * 
 * REGRAS:
 * - NÃO usa shuffle/Fisher-Yates
 * - Sorteia aleatoriamente e re-sorteia se repetir
 * - Cada símbolo aparece NO MÁXIMO uma vez
 * 
 * @returns Array imutável de símbolos únicos
 */
export function generateSecret(): Symbol[] {
  const usedIds = new Set<string>();
  const secret: Symbol[] = [];

  while (secret.length < CODE_LENGTH) {
    const randomIndex = Math.floor(Math.random() * SYMBOLS.length);
    const candidate = SYMBOLS[randomIndex];
    
    // Se já usou, sorteia de novo
    if (usedIds.has(candidate.id)) {
      continue;
    }
    
    usedIds.add(candidate.id);
    secret.push(candidate);
  }

  return secret;
}

// ═══════════════════════════════════════════════════════════════════════════
// AVALIAÇÃO DO PALPITE - ALGORITMO MASTERMIND CLÁSSICO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Avalia um palpite contra o código secreto.
 * 
 * ALGORITMO DE 2 PASSES:
 * 
 * PASS 1 - EXATOS (pino branco):
 * - Percorre cada posição
 * - Se secret[i].id === guess[i].id → marca como EXATO
 * - Marca posição como USADA em ambos os arrays
 * 
 * PASS 2 - PRESENTES (pino cinza):
 * - Para cada posição NÃO USADA no guess
 * - Procura o símbolo em posições NÃO USADAS do secret
 * - Se encontrar → marca como PRESENTE, marca ambas posições como USADAS
 * 
 * GARANTIAS:
 * - exact + present <= CODE_LENGTH
 * - Nenhum símbolo contado mais de uma vez
 * - Função é PURA (não modifica inputs)
 * 
 * @param secret - Código secreto (4 símbolos únicos)
 * @param guess - Palpite do jogador (4 símbolos)
 * @returns Feedback com contagem de exatos e presentes
 */
export function evaluateGuess(secret: Symbol[], guess: Symbol[]): EvaluationResult {
  // Validação
  if (secret.length !== CODE_LENGTH || guess.length !== CODE_LENGTH) {
    throw new Error(`Secret e guess devem ter exatamente ${CODE_LENGTH} símbolos`);
  }

  // Arrays para marcar posições já usadas
  const secretUsed: boolean[] = [false, false, false, false];
  const guessUsed: boolean[] = [false, false, false, false];

  let exact = 0;
  let present = 0;

  // ─────────────────────────────────────────────────────────────────────────
  // PASS 1: EXATOS (mesmo símbolo, mesma posição)
  // ─────────────────────────────────────────────────────────────────────────
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (secret[i].id === guess[i].id) {
      exact++;
      secretUsed[i] = true;
      guessUsed[i] = true;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PASS 2: PRESENTES (símbolo existe, posição errada)
  // ─────────────────────────────────────────────────────────────────────────
  for (let i = 0; i < CODE_LENGTH; i++) {
    // Pula posições já usadas (exatos)
    if (guessUsed[i]) continue;

    // Procura esse símbolo em posições não usadas do secret
    for (let j = 0; j < CODE_LENGTH; j++) {
      if (secretUsed[j]) continue;
      
      if (guess[i].id === secret[j].id) {
        present++;
        secretUsed[j] = true;
        guessUsed[i] = true;
        break; // Cada símbolo conta só UMA vez
      }
    }
  }

  const feedback: Feedback = { exact, present };
  const isVictory = exact === CODE_LENGTH;

  return { feedback, isVictory };
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cria um símbolo a partir do ID (para testes).
 */
export function createSymbol(id: string): Symbol {
  const found = SYMBOLS.find(s => s.id === id);
  if (found) return found;
  
  // Símbolo de teste customizado
  return { id, label: id.charAt(0).toUpperCase(), color: '#888888' };
}

/**
 * Cria um array de símbolos a partir de IDs (para testes).
 */
export function createSymbolArray(ids: string[]): Symbol[] {
  return ids.map(createSymbol);
}
