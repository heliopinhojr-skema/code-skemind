import { describe, it, expect } from 'vitest';
import { calculateFeedback, generateSecretForTest, GameSymbol, CODE_LENGTH } from '@/hooks/useGame';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function sym(id: string): GameSymbol {
  return { id, color: '#000', shape: 'circle' };
}

function makeArray(ids: string[]): GameSymbol[] {
  return ids.map(sym);
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 1: ALGORITMO DE FEEDBACK MASTERMIND (2 PASSES)
// ─────────────────────────────────────────────────────────────────────────────

describe('Mastermind Feedback Algorithm', () => {
  
  it('Caso 1: Todos corretos → 4 exact, 0 present', () => {
    const secret = makeArray(['A', 'B', 'C', 'D']);
    const guess = makeArray(['A', 'B', 'C', 'D']);
    
    const result = calculateFeedback(secret, guess);
    
    expect(result.exact).toBe(4);
    expect(result.present).toBe(0);
  });

  it('Caso 2: Todos trocados → 0 exact, 4 present', () => {
    const secret = makeArray(['A', 'B', 'C', 'D']);
    const guess = makeArray(['D', 'C', 'B', 'A']);
    
    const result = calculateFeedback(secret, guess);
    
    expect(result.exact).toBe(0);
    expect(result.present).toBe(4);
  });

  it('Caso 3: Nenhum acerto → 0 exact, 0 present', () => {
    const secret = makeArray(['A', 'B', 'C', 'D']);
    const guess = makeArray(['E', 'F', 'G', 'H']);
    
    const result = calculateFeedback(secret, guess);
    
    expect(result.exact).toBe(0);
    expect(result.present).toBe(0);
  });

  it('Caso 4: Misto simples → 2 exact, 2 present', () => {
    const secret = makeArray(['A', 'B', 'C', 'D']);
    const guess = makeArray(['A', 'B', 'D', 'C']);
    
    const result = calculateFeedback(secret, guess);
    
    expect(result.exact).toBe(2); // A e B
    expect(result.present).toBe(2); // C e D trocados
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 2: GERAÇÃO DO SECRET (SEM REPETIÇÃO)
// ─────────────────────────────────────────────────────────────────────────────

describe('Geração do Secret', () => {
  it('Nunca repete símbolos (4 únicos)', () => {
    for (let k = 0; k < 200; k++) {
      const secret = generateSecretForTest();
      const ids = secret.map(s => s.id);
      expect(ids).toHaveLength(CODE_LENGTH);
      expect(new Set(ids).size).toBe(CODE_LENGTH);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 3: DUPLICATAS NO FEEDBACK (CASOS CRÍTICOS)
// ─────────────────────────────────────────────────────────────────────────────

describe('Duplicatas no Feedback', () => {
  it('Secret [A,A,B,C] vs Guess [A,B,A,A] → 1 exact, 2 present', () => {
    const secret = makeArray(['A', 'A', 'B', 'C']);
    const guess = makeArray(['A', 'B', 'A', 'A']);
    
    const result = calculateFeedback(secret, guess);
    
    // Explicação:
    // Pos 0: A === A → exact (secretUsed[0]=true, guessUsed[0]=true)
    // Pos 1: A !== B
    // Pos 2: A !== B
    // Pos 3: A !== C
    // 
    // Passo 2:
    // Pos 1 (B): procura B não usado no secret → secret[2]=B → present
    // Pos 2 (A): procura A não usado no secret → secret[1]=A → present
    // Pos 3 (A): procura A não usado no secret → nenhum → nada
    
    expect(result.exact).toBe(1);
    expect(result.present).toBe(2);
  });

  it('Secret [A,B,B,B] vs Guess [B,B,B,A] → 2 exact, 2 present', () => {
    const secret = makeArray(['A', 'B', 'B', 'B']);
    const guess = makeArray(['B', 'B', 'B', 'A']);
    
    const result = calculateFeedback(secret, guess);
    
    // Explicação:
    // Pos 0: B !== A
    // Pos 1: B === B → exact
    // Pos 2: B === B → exact
    // Pos 3: A !== B
    // 
    // Passo 2:
    // Pos 0 (B): procura B não usado → secret[3]=B → present
    // Pos 3 (A): procura A não usado → secret[0]=A → present
    
    expect(result.exact).toBe(2);
    expect(result.present).toBe(2);
  });

  it('Secret [A,A,A,A] vs Guess [A,A,A,A] → 4 exact, 0 present', () => {
    const secret = makeArray(['A', 'A', 'A', 'A']);
    const guess = makeArray(['A', 'A', 'A', 'A']);
    
    const result = calculateFeedback(secret, guess);
    
    expect(result.exact).toBe(4);
    expect(result.present).toBe(0);
  });

  it('Secret [A,A,A,A] vs Guess [B,B,B,B] → 0 exact, 0 present', () => {
    const secret = makeArray(['A', 'A', 'A', 'A']);
    const guess = makeArray(['B', 'B', 'B', 'B']);
    
    const result = calculateFeedback(secret, guess);
    
    expect(result.exact).toBe(0);
    expect(result.present).toBe(0);
  });

  it('Secret [A,B,C,A] vs Guess [A,A,B,C] → 1 exact, 3 present', () => {
    const secret = makeArray(['A', 'B', 'C', 'A']);
    const guess = makeArray(['A', 'A', 'B', 'C']);
    
    const result = calculateFeedback(secret, guess);
    
    // Explicação:
    // Pos 0: A === A → exact
    // Pos 1: A !== B
    // Pos 2: B !== C
    // Pos 3: C !== A
    // 
    // Passo 2:
    // Pos 1 (A): procura A não usado → secret[3]=A → present
    // Pos 2 (B): procura B não usado → secret[1]=B → present
    // Pos 3 (C): procura C não usado → secret[2]=C → present
    
    expect(result.exact).toBe(1);
    expect(result.present).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 3: IMUTABILIDADE DOS ARRAYS
// ─────────────────────────────────────────────────────────────────────────────

describe('Imutabilidade', () => {
  
  it('calculateFeedback NÃO modifica o array secret', () => {
    const secret = makeArray(['A', 'B', 'C', 'D']);
    const guess = makeArray(['D', 'C', 'B', 'A']);
    
    const originalIds = secret.map(s => s.id);
    
    calculateFeedback(secret, guess);
    
    expect(secret.map(s => s.id)).toEqual(originalIds);
  });

  it('calculateFeedback NÃO modifica o array guess', () => {
    const secret = makeArray(['A', 'B', 'C', 'D']);
    const guess = makeArray(['D', 'C', 'B', 'A']);
    
    const originalIds = guess.map(s => s.id);
    
    calculateFeedback(secret, guess);
    
    expect(guess.map(s => s.id)).toEqual(originalIds);
  });

  it('Múltiplas chamadas produzem resultado idêntico', () => {
    const secret = makeArray(['A', 'B', 'C', 'D']);
    const guess = makeArray(['A', 'C', 'B', 'D']);
    
    const result1 = calculateFeedback(secret, guess);
    const result2 = calculateFeedback(secret, guess);
    const result3 = calculateFeedback(secret, guess);
    
    expect(result1).toEqual(result2);
    expect(result2).toEqual(result3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 4: CONDIÇÃO DE VITÓRIA
// ─────────────────────────────────────────────────────────────────────────────

describe('Condição de Vitória', () => {
  
  it('Vitória: exact === CODE_LENGTH', () => {
    const secret = makeArray(['A', 'B', 'C', 'D']);
    const guess = makeArray(['A', 'B', 'C', 'D']);
    
    const result = calculateFeedback(secret, guess);
    
    expect(result.exact).toBe(CODE_LENGTH);
    expect(result.exact === CODE_LENGTH).toBe(true);
  });

  it('NÃO vitória: present === CODE_LENGTH', () => {
    const secret = makeArray(['A', 'B', 'C', 'D']);
    const guess = makeArray(['D', 'C', 'B', 'A']);
    
    const result = calculateFeedback(secret, guess);
    
    expect(result.exact).toBe(0);
    expect(result.exact === CODE_LENGTH).toBe(false);
  });

  it('NÃO vitória: exact < CODE_LENGTH', () => {
    const secret = makeArray(['A', 'B', 'C', 'D']);
    const guess = makeArray(['A', 'B', 'C', 'E']);
    
    const result = calculateFeedback(secret, guess);
    
    expect(result.exact).toBe(3);
    expect(result.exact === CODE_LENGTH).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTE 5: GARANTIAS MATEMÁTICAS
// ─────────────────────────────────────────────────────────────────────────────

describe('Garantias Matemáticas', () => {
  
  it('exact + present <= CODE_LENGTH (sempre)', () => {
    const testCases = [
      { secret: ['A', 'B', 'C', 'D'], guess: ['A', 'B', 'C', 'D'] },
      { secret: ['A', 'B', 'C', 'D'], guess: ['D', 'C', 'B', 'A'] },
      { secret: ['A', 'A', 'B', 'C'], guess: ['A', 'B', 'A', 'A'] },
      { secret: ['A', 'B', 'B', 'B'], guess: ['B', 'B', 'B', 'A'] },
      { secret: ['A', 'A', 'A', 'A'], guess: ['A', 'A', 'B', 'B'] },
    ];

    for (const tc of testCases) {
      const secret = makeArray(tc.secret);
      const guess = makeArray(tc.guess);
      const result = calculateFeedback(secret, guess);
      
      expect(result.exact + result.present).toBeLessThanOrEqual(CODE_LENGTH);
    }
  });

  it('exact >= 0 e present >= 0 (sempre)', () => {
    const secret = makeArray(['A', 'B', 'C', 'D']);
    const guess = makeArray(['E', 'F', 'G', 'H']);
    
    const result = calculateFeedback(secret, guess);
    
    expect(result.exact).toBeGreaterThanOrEqual(0);
    expect(result.present).toBeGreaterThanOrEqual(0);
  });
});
