import { describe, it, expect } from 'vitest';
import { calculateFeedback, GameSymbol, CODE_LENGTH } from '@/hooks/useGame';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Create test symbols
// ─────────────────────────────────────────────────────────────────────────────

function sym(id: string): GameSymbol {
  return { id, color: '#000', shape: 'circle' };
}

function makeArray(ids: string[]): GameSymbol[] {
  return ids.map(sym);
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTERMIND FEEDBACK ALGORITHM TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Mastermind Feedback Algorithm - 2 Passes', () => {
  
  // 1) secret [A,B,C,D], guess [A,B,C,D] => whites 4, grays 0
  it('Case 1: All correct positions', () => {
    const secret = makeArray(['A', 'B', 'C', 'D']);
    const guess = makeArray(['A', 'B', 'C', 'D']);
    
    const result = calculateFeedback(secret, guess);
    
    expect(result.correctPosition).toBe(4);
    expect(result.correctSymbol).toBe(0);
  });

  // 2) secret [A,B,C,D], guess [D,C,B,A] => whites 0, grays 4
  it('Case 2: All swapped (wrong positions)', () => {
    const secret = makeArray(['A', 'B', 'C', 'D']);
    const guess = makeArray(['D', 'C', 'B', 'A']);
    
    const result = calculateFeedback(secret, guess);
    
    expect(result.correctPosition).toBe(0);
    expect(result.correctSymbol).toBe(4);
  });

  // 3) secret [A,A,B,C], guess [A,B,A,A] => whites 1, grays 2
  it('Case 3: Duplicates - secret [A,A,B,C], guess [A,B,A,A]', () => {
    const secret = makeArray(['A', 'A', 'B', 'C']);
    const guess = makeArray(['A', 'B', 'A', 'A']);
    
    const result = calculateFeedback(secret, guess);
    
    // Explicação:
    // - A na pos 0: exato (white)
    // - B na pos 1 guess -> B na pos 2 secret: parcial (gray)
    // - A na pos 2 guess -> A na pos 1 secret: parcial (gray)
    // - A na pos 3 guess: não há mais A disponível no secret
    expect(result.correctPosition).toBe(1);
    expect(result.correctSymbol).toBe(2);
  });

  // 4) secret [A,B,B,B], guess [B,B,B,A] => whites 2, grays 2
  it('Case 4: Duplicates - secret [A,B,B,B], guess [B,B,B,A]', () => {
    const secret = makeArray(['A', 'B', 'B', 'B']);
    const guess = makeArray(['B', 'B', 'B', 'A']);
    
    const result = calculateFeedback(secret, guess);
    
    // Explicação:
    // - B na pos 1: exato (white)
    // - B na pos 2: exato (white)
    // - B na pos 0 guess -> B na pos 3 secret: parcial (gray)
    // - A na pos 3 guess -> A na pos 0 secret: parcial (gray)
    expect(result.correctPosition).toBe(2);
    expect(result.correctSymbol).toBe(2);
  });

  // 5) secret [A,B,C,D], guess [E,E,E,E] => whites 0, grays 0
  it('Case 5: No matches at all', () => {
    const secret = makeArray(['A', 'B', 'C', 'D']);
    const guess = makeArray(['E', 'E', 'E', 'E']);
    
    const result = calculateFeedback(secret, guess);
    
    expect(result.correctPosition).toBe(0);
    expect(result.correctSymbol).toBe(0);
  });

  // 6) secret [A,B,C,A], guess [A,A,B,C] => whites 1, grays 3
  it('Case 6: Mixed - secret [A,B,C,A], guess [A,A,B,C]', () => {
    const secret = makeArray(['A', 'B', 'C', 'A']);
    const guess = makeArray(['A', 'A', 'B', 'C']);
    
    const result = calculateFeedback(secret, guess);
    
    // Explicação:
    // - A na pos 0: exato (white)
    // - A na pos 1 guess -> A na pos 3 secret: parcial (gray)
    // - B na pos 2 guess -> B na pos 1 secret: parcial (gray)
    // - C na pos 3 guess -> C na pos 2 secret: parcial (gray)
    expect(result.correctPosition).toBe(1);
    expect(result.correctSymbol).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SECRET IMMUTABILITY TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Secret Immutability', () => {
  
  it('calculateFeedback does not modify the secret array', () => {
    const secret = makeArray(['A', 'B', 'C', 'D']);
    const guess = makeArray(['D', 'C', 'B', 'A']);
    
    const originalSecretIds = secret.map(s => s.id);
    
    calculateFeedback(secret, guess);
    
    const afterSecretIds = secret.map(s => s.id);
    expect(afterSecretIds).toEqual(originalSecretIds);
  });

  it('calculateFeedback does not modify the guess array', () => {
    const secret = makeArray(['A', 'B', 'C', 'D']);
    const guess = makeArray(['D', 'C', 'B', 'A']);
    
    const originalGuessIds = guess.map(s => s.id);
    
    calculateFeedback(secret, guess);
    
    const afterGuessIds = guess.map(s => s.id);
    expect(afterGuessIds).toEqual(originalGuessIds);
  });

  it('Multiple calls with same input produce identical results', () => {
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
// VICTORY CONDITION TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Victory Condition', () => {
  
  it('Victory is detected when all 4 positions are correct', () => {
    const secret = makeArray(['A', 'B', 'C', 'D']);
    const guess = makeArray(['A', 'B', 'C', 'D']);
    
    const result = calculateFeedback(secret, guess);
    
    expect(result.correctPosition).toBe(CODE_LENGTH);
    expect(result.correctPosition === CODE_LENGTH).toBe(true);
  });

  it('Victory is NOT detected with partial matches', () => {
    const secret = makeArray(['A', 'B', 'C', 'D']);
    const guess = makeArray(['D', 'C', 'B', 'A']);
    
    const result = calculateFeedback(secret, guess);
    
    expect(result.correctPosition).toBe(0);
    expect(result.correctPosition === CODE_LENGTH).toBe(false);
  });

  it('Victory is NOT detected with 3 correct positions', () => {
    const secret = makeArray(['A', 'B', 'C', 'D']);
    const guess = makeArray(['A', 'B', 'C', 'E']);
    
    const result = calculateFeedback(secret, guess);
    
    expect(result.correctPosition).toBe(3);
    expect(result.correctPosition === CODE_LENGTH).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// EDGE CASES
// ─────────────────────────────────────────────────────────────────────────────

describe('Edge Cases', () => {
  
  it('Total feedback never exceeds CODE_LENGTH', () => {
    const testCases = [
      { secret: ['A', 'B', 'C', 'D'], guess: ['A', 'B', 'C', 'D'] },
      { secret: ['A', 'B', 'C', 'D'], guess: ['D', 'C', 'B', 'A'] },
      { secret: ['A', 'A', 'B', 'C'], guess: ['A', 'B', 'A', 'A'] },
      { secret: ['A', 'B', 'B', 'B'], guess: ['B', 'B', 'B', 'A'] },
    ];

    for (const tc of testCases) {
      const secret = makeArray(tc.secret);
      const guess = makeArray(tc.guess);
      const result = calculateFeedback(secret, guess);
      
      const total = result.correctPosition + result.correctSymbol;
      expect(total).toBeLessThanOrEqual(CODE_LENGTH);
    }
  });

  it('Handles single match scenarios correctly', () => {
    // One exact match
    const secret1 = makeArray(['A', 'B', 'C', 'D']);
    const guess1 = makeArray(['A', 'E', 'E', 'E']);
    const result1 = calculateFeedback(secret1, guess1);
    expect(result1.correctPosition).toBe(1);
    expect(result1.correctSymbol).toBe(0);

    // One partial match
    const secret2 = makeArray(['A', 'B', 'C', 'D']);
    const guess2 = makeArray(['E', 'A', 'E', 'E']);
    const result2 = calculateFeedback(secret2, guess2);
    expect(result2.correctPosition).toBe(0);
    expect(result2.correctSymbol).toBe(1);
  });

  it('Correctly handles repeating symbols in secret', () => {
    // Secret has duplicate, guess has one of that symbol in wrong position
    const secret = makeArray(['A', 'A', 'B', 'C']);
    const guess = makeArray(['B', 'C', 'A', 'D']);
    
    const result = calculateFeedback(secret, guess);
    
    // A na pos 2 guess -> A na pos 0 ou 1 secret: 1 parcial
    // B na pos 0 guess -> B na pos 2 secret: 1 parcial
    // C na pos 1 guess -> C na pos 3 secret: 1 parcial
    expect(result.correctPosition).toBe(0);
    expect(result.correctSymbol).toBe(3);
  });
});
