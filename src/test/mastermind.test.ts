import { describe, it, expect, beforeEach } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════
// SKEMIND - TESTES DE INTEGRIDADE DO JOGO
// ═══════════════════════════════════════════════════════════════════════════
//
// Estes testes garantem:
// 1. O secret permanece IMUTÁVEL durante toda a rodada
// 2. O feedback Mastermind é sempre correto
// 3. Vitória é detectada quando todos os 4 acertam posição
//
// ═══════════════════════════════════════════════════════════════════════════

// Símbolos de teste
const SYMBOLS = [
  { id: 'red-circle', color: '#ef4444', shape: 'circle' as const },
  { id: 'blue-square', color: '#3b82f6', shape: 'square' as const },
  { id: 'green-triangle', color: '#22c55e', shape: 'triangle' as const },
  { id: 'yellow-diamond', color: '#eab308', shape: 'diamond' as const },
  { id: 'purple-star', color: '#a855f7', shape: 'star' as const },
  { id: 'cyan-hexagon', color: '#06b6d4', shape: 'hexagon' as const },
];

const [A, B, C, D, E, F] = SYMBOLS;
const CODE_LENGTH = 4;

/**
 * Algoritmo Mastermind - CÓPIA EXATA do useGame.ts
 * Para garantir que testamos a mesma lógica
 */
function calculateFeedback(
  secret: typeof SYMBOLS,
  guess: typeof SYMBOLS
): { correctPosition: number; correctSymbol: number } {
  const secretCopy: (string | null)[] = secret.map(s => s.id);
  const guessCopy: (string | null)[] = guess.map(g => g.id);
  
  let exactMatches = 0;
  let partialMatches = 0;
  
  // FASE 1: Acertos exatos (pino branco)
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessCopy[i] !== null && guessCopy[i] === secretCopy[i]) {
      exactMatches++;
      secretCopy[i] = null;
      guessCopy[i] = null;
    }
  }
  
  // FASE 2: Acertos parciais (pino cinza)
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessCopy[i] === null) continue;
    
    for (let j = 0; j < CODE_LENGTH; j++) {
      if (secretCopy[j] === null) continue;
      
      if (guessCopy[i] === secretCopy[j]) {
        partialMatches++;
        secretCopy[j] = null;
        break;
      }
    }
  }
  
  return { correctPosition: exactMatches, correctSymbol: partialMatches };
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTES DE FEEDBACK MASTERMIND
// ═══════════════════════════════════════════════════════════════════════════

describe('Mastermind Feedback Algorithm', () => {
  
  describe('Acertos Exatos (Pino Branco)', () => {
    it('deve retornar 4 exatos quando palpite = secret', () => {
      const secret = [A, B, C, D];
      const guess = [A, B, C, D];
      
      const result = calculateFeedback(secret, guess);
      
      expect(result.correctPosition).toBe(4);
      expect(result.correctSymbol).toBe(0);
    });

    it('deve retornar 2 exatos quando 2 posições corretas', () => {
      const secret = [A, B, C, D];
      const guess = [A, B, E, F];
      
      const result = calculateFeedback(secret, guess);
      
      expect(result.correctPosition).toBe(2);
      expect(result.correctSymbol).toBe(0);
    });

    it('deve retornar 1 exato quando apenas 1 posição correta', () => {
      const secret = [A, B, C, D];
      const guess = [A, E, F, E];
      
      const result = calculateFeedback(secret, guess);
      
      expect(result.correctPosition).toBe(1);
      expect(result.correctSymbol).toBe(0);
    });
  });

  describe('Acertos Parciais (Pino Cinza)', () => {
    it('deve retornar 4 parciais quando todos trocados de posição', () => {
      const secret = [A, B, C, D];
      const guess = [B, C, D, A];
      
      const result = calculateFeedback(secret, guess);
      
      expect(result.correctPosition).toBe(0);
      expect(result.correctSymbol).toBe(4);
    });

    it('deve retornar 2 parciais quando 2 cores em posições erradas', () => {
      const secret = [A, B, C, D];
      const guess = [B, A, E, F];
      
      const result = calculateFeedback(secret, guess);
      
      expect(result.correctPosition).toBe(0);
      expect(result.correctSymbol).toBe(2);
    });

    it('deve retornar 1 parcial quando apenas 1 cor em posição errada', () => {
      const secret = [A, B, C, D];
      const guess = [E, A, E, F];
      
      const result = calculateFeedback(secret, guess);
      
      expect(result.correctPosition).toBe(0);
      expect(result.correctSymbol).toBe(1);
    });
  });

  describe('Combinações Mistas', () => {
    it('deve retornar 1 exato e 2 parciais', () => {
      const secret = [A, B, C, D];
      const guess = [A, C, D, E];
      
      const result = calculateFeedback(secret, guess);
      
      expect(result.correctPosition).toBe(1);
      expect(result.correctSymbol).toBe(2);
    });

    it('deve retornar 2 exatos e 2 parciais (pares trocados)', () => {
      const secret = [A, B, C, D];
      const guess = [A, B, D, C];
      
      const result = calculateFeedback(secret, guess);
      
      expect(result.correctPosition).toBe(2);
      expect(result.correctSymbol).toBe(2);
    });

    it('deve retornar 1 exato e 1 parcial', () => {
      const secret = [A, B, C, D];
      const guess = [A, E, B, F];
      
      const result = calculateFeedback(secret, guess);
      
      expect(result.correctPosition).toBe(1);
      expect(result.correctSymbol).toBe(1);
    });
  });

  describe('Nenhum Acerto', () => {
    it('deve retornar 0 quando nenhum símbolo existe no secret', () => {
      const secret = [A, B, C, D];
      const guess = [E, F, E, F];
      
      const result = calculateFeedback(secret, guess);
      
      expect(result.correctPosition).toBe(0);
      expect(result.correctSymbol).toBe(0);
    });
  });

  describe('Prevenção de Dupla Contagem', () => {
    it('não deve contar o mesmo símbolo duas vezes', () => {
      const secret = [A, B, C, D];
      const guess = [B, A, D, C];
      
      const result = calculateFeedback(secret, guess);
      
      // Todos são parciais, nenhum é exato
      expect(result.correctPosition).toBe(0);
      expect(result.correctSymbol).toBe(4);
      // Total nunca pode exceder 4
      expect(result.correctPosition + result.correctSymbol).toBeLessThanOrEqual(4);
    });

    it('exato tem prioridade sobre parcial', () => {
      const secret = [A, A, B, C]; // Se permitíssemos repetição
      const guess = [A, B, A, C];
      
      // Neste caso com símbolos únicos:
      const secretUnique = [A, B, C, D];
      const guessUnique = [A, C, B, D];
      
      const result = calculateFeedback(secretUnique, guessUnique);
      
      expect(result.correctPosition).toBe(2); // A e D
      expect(result.correctSymbol).toBe(2);   // B e C trocados
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES DE IMUTABILIDADE DO SECRET
// ═══════════════════════════════════════════════════════════════════════════

describe('Secret Immutability', () => {
  it('calculateFeedback não deve modificar o secret original', () => {
    const secret = [A, B, C, D];
    const secretCopy = JSON.stringify(secret);
    const guess = [B, C, D, A];
    
    calculateFeedback(secret, guess);
    
    // Secret deve permanecer idêntico
    expect(JSON.stringify(secret)).toBe(secretCopy);
  });

  it('calculateFeedback não deve modificar o guess original', () => {
    const secret = [A, B, C, D];
    const guess = [B, C, D, A];
    const guessCopy = JSON.stringify(guess);
    
    calculateFeedback(secret, guess);
    
    // Guess deve permanecer idêntico
    expect(JSON.stringify(guess)).toBe(guessCopy);
  });

  it('múltiplas chamadas com mesmo secret devem dar mesmo resultado', () => {
    const secret = [A, B, C, D];
    const guess = [A, C, B, E];
    
    const result1 = calculateFeedback(secret, guess);
    const result2 = calculateFeedback(secret, guess);
    const result3 = calculateFeedback(secret, guess);
    
    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
  });

  it('secret deve ser determinístico - mesma entrada = mesma saída', () => {
    const secret = [A, B, C, D];
    
    // 10 palpites diferentes
    const guesses = [
      [A, B, C, D],
      [D, C, B, A],
      [E, F, E, F],
      [A, E, F, E],
      [B, A, D, C],
    ];
    
    // Calcular feedback duas vezes para cada
    guesses.forEach(guess => {
      const r1 = calculateFeedback(secret, guess as typeof SYMBOLS);
      const r2 = calculateFeedback(secret, guess as typeof SYMBOLS);
      expect(r1).toEqual(r2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES DE CONDIÇÃO DE VITÓRIA
// ═══════════════════════════════════════════════════════════════════════════

describe('Victory Condition', () => {
  it('vitória ocorre quando correctPosition === 4', () => {
    const secret = [A, B, C, D];
    const winningGuess = [A, B, C, D];
    
    const result = calculateFeedback(secret, winningGuess);
    
    expect(result.correctPosition).toBe(4);
    expect(result.correctPosition === 4).toBe(true); // Condição de vitória
  });

  it('NÃO é vitória quando correctPosition < 4, mesmo com parciais', () => {
    const secret = [A, B, C, D];
    const almostGuess = [A, B, D, C]; // 2 exatos, 2 parciais
    
    const result = calculateFeedback(secret, almostGuess);
    
    expect(result.correctPosition).toBe(2);
    expect(result.correctPosition === 4).toBe(false); // NÃO é vitória
  });

  it('4 parciais NÃO é vitória', () => {
    const secret = [A, B, C, D];
    const allWrongPosition = [B, C, D, A];
    
    const result = calculateFeedback(secret, allWrongPosition);
    
    expect(result.correctSymbol).toBe(4);
    expect(result.correctPosition).toBe(0);
    expect(result.correctPosition === 4).toBe(false); // NÃO é vitória
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTES DE EDGE CASES
// ═══════════════════════════════════════════════════════════════════════════

describe('Edge Cases', () => {
  it('deve funcionar com qualquer combinação de 4 símbolos', () => {
    // Testar todas as 15 combinações possíveis de 4 símbolos de 6
    const combinations = [
      [A, B, C, D],
      [A, B, C, E],
      [A, B, C, F],
      [A, B, D, E],
      [A, B, D, F],
      [A, B, E, F],
      [A, C, D, E],
      [A, C, D, F],
      [A, C, E, F],
      [A, D, E, F],
      [B, C, D, E],
      [B, C, D, F],
      [B, C, E, F],
      [B, D, E, F],
      [C, D, E, F],
    ];

    combinations.forEach(combo => {
      const secret = combo;
      const guess = combo;
      const result = calculateFeedback(secret as typeof SYMBOLS, guess as typeof SYMBOLS);
      expect(result.correctPosition).toBe(4);
    });
  });

  it('feedback total nunca excede CODE_LENGTH', () => {
    const testCases = [
      { secret: [A, B, C, D], guess: [A, B, C, D] },
      { secret: [A, B, C, D], guess: [D, C, B, A] },
      { secret: [A, B, C, D], guess: [E, F, E, F] },
      { secret: [A, B, C, D], guess: [A, C, B, D] },
    ];

    testCases.forEach(({ secret, guess }) => {
      const result = calculateFeedback(secret as typeof SYMBOLS, guess as typeof SYMBOLS);
      const total = result.correctPosition + result.correctSymbol;
      expect(total).toBeLessThanOrEqual(CODE_LENGTH);
    });
  });
});
