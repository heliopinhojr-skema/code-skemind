/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TESTES DA ENGINE MASTERMIND
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Cobertura completa do algoritmo clássico:
 * 1. Posição correta (exatos)
 * 2. Símbolo correto posição errada (presentes)
 * 3. Nenhum match
 * 4. Múltiplos símbolos
 * 5. Nunca contar o mesmo símbolo duas vezes
 * 6. Geração de secret sem repetição
 */

import { describe, it, expect } from 'vitest';
import {
  generateSecret,
  evaluateGuess,
  createSymbolArray,
  CODE_LENGTH,
  Symbol,
} from '@/lib/mastermindEngine';

// ═══════════════════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════════════════

function make(ids: string[]): Symbol[] {
  return createSymbolArray(ids);
}

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 1: GERAÇÃO DO SECRET
// ═══════════════════════════════════════════════════════════════════════════

describe('generateSecret', () => {
  it('gera exatamente CODE_LENGTH símbolos', () => {
    for (let i = 0; i < 100; i++) {
      const secret = generateSecret();
      expect(secret).toHaveLength(CODE_LENGTH);
    }
  });

  it('NUNCA repete símbolos', () => {
    for (let i = 0; i < 200; i++) {
      const secret = generateSecret();
      const ids = secret.map(s => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(CODE_LENGTH);
    }
  });

  it('todos os símbolos são válidos', () => {
    for (let i = 0; i < 100; i++) {
      const secret = generateSecret();
      for (const sym of secret) {
        expect(sym.id).toBeDefined();
        expect(sym.label).toBeDefined();
        expect(sym.color).toBeDefined();
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 2: TODOS CORRETOS (VITÓRIA)
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateGuess - Vitória', () => {
  it('4 exatos quando secret === guess', () => {
    const secret = make(['A', 'B', 'C', 'D']);
    const guess = make(['A', 'B', 'C', 'D']);
    
    const result = evaluateGuess(secret, guess);
    
    expect(result.feedback.exact).toBe(4);
    expect(result.feedback.present).toBe(0);
    expect(result.isVictory).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 3: NENHUM MATCH
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateGuess - Nenhum match', () => {
  it('0 exatos, 0 presentes quando nenhum símbolo coincide', () => {
    const secret = make(['A', 'B', 'C', 'D']);
    const guess = make(['E', 'F', 'G', 'H']);
    
    const result = evaluateGuess(secret, guess);
    
    expect(result.feedback.exact).toBe(0);
    expect(result.feedback.present).toBe(0);
    expect(result.isVictory).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 4: APENAS EXATOS (POSIÇÃO CORRETA)
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateGuess - Apenas exatos', () => {
  it('1 exato na primeira posição', () => {
    const secret = make(['A', 'B', 'C', 'D']);
    const guess = make(['A', 'X', 'Y', 'Z']);
    
    const result = evaluateGuess(secret, guess);
    
    expect(result.feedback.exact).toBe(1);
    expect(result.feedback.present).toBe(0);
  });

  it('2 exatos em posições alternadas', () => {
    const secret = make(['A', 'B', 'C', 'D']);
    const guess = make(['A', 'X', 'C', 'Z']);
    
    const result = evaluateGuess(secret, guess);
    
    expect(result.feedback.exact).toBe(2);
    expect(result.feedback.present).toBe(0);
  });

  it('3 exatos', () => {
    const secret = make(['A', 'B', 'C', 'D']);
    const guess = make(['A', 'B', 'C', 'Z']);
    
    const result = evaluateGuess(secret, guess);
    
    expect(result.feedback.exact).toBe(3);
    expect(result.feedback.present).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 5: APENAS PRESENTES (POSIÇÃO ERRADA)
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateGuess - Apenas presentes', () => {
  it('1 presente', () => {
    const secret = make(['A', 'B', 'C', 'D']);
    const guess = make(['B', 'X', 'Y', 'Z']);
    
    const result = evaluateGuess(secret, guess);
    
    expect(result.feedback.exact).toBe(0);
    expect(result.feedback.present).toBe(1);
  });

  it('2 presentes', () => {
    const secret = make(['A', 'B', 'C', 'D']);
    const guess = make(['B', 'A', 'X', 'Y']);
    
    const result = evaluateGuess(secret, guess);
    
    expect(result.feedback.exact).toBe(0);
    expect(result.feedback.present).toBe(2);
  });

  it('4 presentes (todos trocados)', () => {
    const secret = make(['A', 'B', 'C', 'D']);
    const guess = make(['D', 'C', 'B', 'A']);
    
    const result = evaluateGuess(secret, guess);
    
    expect(result.feedback.exact).toBe(0);
    expect(result.feedback.present).toBe(4);
  });

  it('3 presentes - EXEMPLO DO USUÁRIO', () => {
    // Secret: 🔺 🔷 🟡 🔴 (triangle, square, circle, diamond)
    // Palpite: 🔷 🔺 🔴 🟣 (square, triangle, diamond, star)
    // Resultado: 0 brancos, 3 cinzas
    const secret = make(['triangle', 'square', 'circle', 'diamond']);
    const guess = make(['square', 'triangle', 'diamond', 'star']);
    
    const result = evaluateGuess(secret, guess);
    
    expect(result.feedback.exact).toBe(0);
    expect(result.feedback.present).toBe(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 6: MISTO (EXATOS + PRESENTES)
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateGuess - Misto', () => {
  it('1 exato + 1 presente', () => {
    const secret = make(['A', 'B', 'C', 'D']);
    const guess = make(['A', 'C', 'X', 'Y']);
    
    const result = evaluateGuess(secret, guess);
    
    expect(result.feedback.exact).toBe(1);
    expect(result.feedback.present).toBe(1);
  });

  it('2 exatos + 1 presente', () => {
    const secret = make(['A', 'B', 'C', 'D']);
    const guess = make(['A', 'B', 'D', 'X']);
    
    const result = evaluateGuess(secret, guess);
    
    expect(result.feedback.exact).toBe(2);
    expect(result.feedback.present).toBe(1);
  });

  it('1 exato + 3 presentes', () => {
    const secret = make(['A', 'B', 'C', 'D']);
    const guess = make(['A', 'D', 'B', 'C']);
    
    const result = evaluateGuess(secret, guess);
    
    expect(result.feedback.exact).toBe(1);
    expect(result.feedback.present).toBe(3);
  });

  it('2 exatos + 2 presentes', () => {
    const secret = make(['A', 'B', 'C', 'D']);
    const guess = make(['A', 'C', 'B', 'D']);
    
    const result = evaluateGuess(secret, guess);
    
    expect(result.feedback.exact).toBe(2);
    expect(result.feedback.present).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 7: NUNCA CONTAR SÍMBOLO DUAS VEZES
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateGuess - Contagem única', () => {
  it('símbolo exato não conta como presente', () => {
    // A está na posição 0 em ambos → 1 exato
    // O segundo A no guess não deve contar (A já foi usado)
    const secret = make(['A', 'B', 'C', 'D']);
    const guess = make(['A', 'A', 'X', 'Y']);
    
    const result = evaluateGuess(secret, guess);
    
    expect(result.feedback.exact).toBe(1);
    expect(result.feedback.present).toBe(0);
  });

  it('símbolo presente conta só uma vez', () => {
    // B existe no secret na posição 1
    // Guess tem B nas posições 0 e 2
    // Apenas UM deve ser contado como presente
    const secret = make(['A', 'B', 'C', 'D']);
    const guess = make(['B', 'X', 'B', 'Y']);
    
    const result = evaluateGuess(secret, guess);
    
    expect(result.feedback.exact).toBe(0);
    expect(result.feedback.present).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 8: IMUTABILIDADE
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateGuess - Imutabilidade', () => {
  it('não modifica arrays de entrada', () => {
    const secret = make(['A', 'B', 'C', 'D']);
    const guess = make(['D', 'C', 'B', 'A']);
    
    const secretCopy = JSON.stringify(secret);
    const guessCopy = JSON.stringify(guess);
    
    evaluateGuess(secret, guess);
    
    expect(JSON.stringify(secret)).toBe(secretCopy);
    expect(JSON.stringify(guess)).toBe(guessCopy);
  });

  it('múltiplas chamadas produzem mesmo resultado', () => {
    const secret = make(['A', 'B', 'C', 'D']);
    const guess = make(['A', 'C', 'B', 'D']);
    
    const result1 = evaluateGuess(secret, guess);
    const result2 = evaluateGuess(secret, guess);
    const result3 = evaluateGuess(secret, guess);
    
    expect(result1.feedback.exact).toBe(result2.feedback.exact);
    expect(result1.feedback.present).toBe(result2.feedback.present);
    expect(result2.feedback.exact).toBe(result3.feedback.exact);
    expect(result2.feedback.present).toBe(result3.feedback.present);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 9: GARANTIAS MATEMÁTICAS
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateGuess - Garantias matemáticas', () => {
  it('exact + present <= CODE_LENGTH sempre', () => {
    const testCases = [
      [['A', 'B', 'C', 'D'], ['A', 'B', 'C', 'D']],
      [['A', 'B', 'C', 'D'], ['D', 'C', 'B', 'A']],
      [['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'H']],
      [['A', 'B', 'C', 'D'], ['A', 'C', 'B', 'D']],
    ];

    for (const [secretIds, guessIds] of testCases) {
      const secret = make(secretIds);
      const guess = make(guessIds);
      const result = evaluateGuess(secret, guess);
      
      expect(result.feedback.exact + result.feedback.present).toBeLessThanOrEqual(CODE_LENGTH);
    }
  });

  it('exact e present são sempre >= 0', () => {
    for (let i = 0; i < 50; i++) {
      const secret = generateSecret();
      const guess = generateSecret();
      const result = evaluateGuess(secret, guess);
      
      expect(result.feedback.exact).toBeGreaterThanOrEqual(0);
      expect(result.feedback.present).toBeGreaterThanOrEqual(0);
    }
  });

  it('vitória apenas quando exact === CODE_LENGTH', () => {
    const secret = make(['A', 'B', 'C', 'D']);
    
    // Não é vitória
    expect(evaluateGuess(secret, make(['A', 'B', 'C', 'X'])).isVictory).toBe(false);
    expect(evaluateGuess(secret, make(['D', 'C', 'B', 'A'])).isVictory).toBe(false);
    
    // É vitória
    expect(evaluateGuess(secret, make(['A', 'B', 'C', 'D'])).isVictory).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TESTE 10: VALIDAÇÃO DE ENTRADA
// ═══════════════════════════════════════════════════════════════════════════

describe('evaluateGuess - Validação', () => {
  it('lança erro se secret não tem CODE_LENGTH símbolos', () => {
    const secret = make(['A', 'B', 'C']); // 3 símbolos
    const guess = make(['A', 'B', 'C', 'D']);
    
    expect(() => evaluateGuess(secret, guess)).toThrow();
  });

  it('lança erro se guess não tem CODE_LENGTH símbolos', () => {
    const secret = make(['A', 'B', 'C', 'D']);
    const guess = make(['A', 'B']); // 2 símbolos
    
    expect(() => evaluateGuess(secret, guess)).toThrow();
  });
});
