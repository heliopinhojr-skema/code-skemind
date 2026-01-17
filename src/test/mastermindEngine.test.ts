import { describe, it, expect } from 'vitest';
import { evaluateGuess, generateSecret, SYMBOLS, CODE_LENGTH } from '@/lib/mastermindEngine';

describe('generateSecret', () => {
  it('gera exatamente CODE_LENGTH símbolos', () => {
    const pool = SYMBOLS.map(s => s.id);
    for (let i = 0; i < 100; i++) {
      const secret = generateSecret(pool);
      expect(secret).toHaveLength(CODE_LENGTH);
    }
  });

  it('NUNCA repete símbolos', () => {
    const pool = SYMBOLS.map(s => s.id);
    for (let i = 0; i < 200; i++) {
      const secret = generateSecret(pool);
      expect(new Set(secret).size).toBe(CODE_LENGTH);
    }
  });

  it('todos os símbolos são válidos', () => {
    const validIds = SYMBOLS.map(s => s.id);
    for (let i = 0; i < 100; i++) {
      const secret = generateSecret(validIds);
      for (const id of secret) {
        expect(validIds).toContain(id);
      }
    }
  });
});

describe('evaluateGuess', () => {
  it('4 exact quando secret === guess (vitória)', () => {
    const secret = ['circle', 'square', 'triangle', 'diamond'];
    const guess = ['circle', 'square', 'triangle', 'diamond'];
    const result = evaluateGuess(secret, guess);
    expect(result.exact).toBe(4);
    expect(result.present).toBe(0);
  });

  it('0 exact, 0 present quando nenhum símbolo coincide', () => {
    const secret = ['circle', 'square', 'triangle', 'diamond'];
    const guess = ['star', 'hexagon', 'star', 'hexagon'];
    const result = evaluateGuess(secret, guess);
    expect(result.exact).toBe(0);
    expect(result.present).toBe(0);
  });

  it('1 exact na primeira posição', () => {
    const secret = ['circle', 'square', 'triangle', 'diamond'];
    const guess = ['circle', 'star', 'hexagon', 'star'];
    const result = evaluateGuess(secret, guess);
    expect(result.exact).toBe(1);
    expect(result.present).toBe(0);
  });

  it('2 present (símbolos trocados)', () => {
    const secret = ['circle', 'square', 'triangle', 'diamond'];
    const guess = ['square', 'circle', 'star', 'hexagon'];
    const result = evaluateGuess(secret, guess);
    expect(result.exact).toBe(0);
    expect(result.present).toBe(2);
  });

  it('4 present (todos trocados)', () => {
    const secret = ['circle', 'square', 'triangle', 'diamond'];
    const guess = ['diamond', 'triangle', 'square', 'circle'];
    const result = evaluateGuess(secret, guess);
    expect(result.exact).toBe(0);
    expect(result.present).toBe(4);
  });

  it('exemplo obrigatório: secret=[circle,hexagon,square,star] guess=[circle,star,square,triangle]', () => {
    const secret = ['circle', 'hexagon', 'square', 'star'];
    const guess = ['circle', 'star', 'square', 'triangle'];
    const result = evaluateGuess(secret, guess);
    // circle@0: EXACT
    // star@1 existe em secret@3: PRESENT
    // square@2: EXACT
    // triangle: não existe
    expect(result.exact).toBe(2);
    expect(result.present).toBe(1);
  });

  it('não conta o mesmo símbolo duas vezes', () => {
    const secret = ['circle', 'square', 'triangle', 'diamond'];
    const guess = ['circle', 'circle', 'circle', 'circle'];
    const result = evaluateGuess(secret, guess);
    expect(result.exact).toBe(1);
    expect(result.present).toBe(0);
  });

  it('símbolo presente conta só uma vez', () => {
    const secret = ['circle', 'square', 'triangle', 'diamond'];
    const guess = ['square', 'star', 'square', 'hexagon'];
    const result = evaluateGuess(secret, guess);
    expect(result.exact).toBe(0);
    expect(result.present).toBe(1);
  });

  it('múltiplas chamadas produzem mesmo resultado', () => {
    const secret = ['circle', 'square', 'triangle', 'diamond'];
    const guess = ['circle', 'triangle', 'square', 'diamond'];
    const r1 = evaluateGuess(secret, guess);
    const r2 = evaluateGuess(secret, guess);
    const r3 = evaluateGuess(secret, guess);
    expect(r1.exact).toBe(r2.exact);
    expect(r1.present).toBe(r2.present);
    expect(r2.exact).toBe(r3.exact);
    expect(r2.present).toBe(r3.present);
  });
});
