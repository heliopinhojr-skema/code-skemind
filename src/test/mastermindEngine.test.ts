import { describe, it, expect } from 'vitest';
import { evaluateGuess, generateSecret, SYMBOLS, CODE_LENGTH } from '@/lib/mastermindEngine';

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
      expect(new Set(secret).size).toBe(CODE_LENGTH);
    }
  });

  it('todos os símbolos são válidos', () => {
    const validIds = SYMBOLS.map(s => s.id);
    for (let i = 0; i < 100; i++) {
      const secret = generateSecret();
      for (const id of secret) {
        expect(validIds).toContain(id);
      }
    }
  });
});

describe('evaluateGuess', () => {
  it('4 brancos quando secret === guess (vitória)', () => {
    const secret = ['circle', 'square', 'triangle', 'diamond'];
    const guess = ['circle', 'square', 'triangle', 'diamond'];
    const result = evaluateGuess(secret, guess);
    expect(result.whites).toBe(4);
    expect(result.grays).toBe(0);
  });

  it('0 brancos, 0 cinzas quando nenhum símbolo coincide', () => {
    const secret = ['circle', 'square', 'triangle', 'diamond'];
    const guess = ['star', 'hexagon', 'star', 'hexagon'];
    const result = evaluateGuess(secret, guess);
    expect(result.whites).toBe(0);
    expect(result.grays).toBe(0);
  });

  it('1 branco na primeira posição', () => {
    const secret = ['circle', 'square', 'triangle', 'diamond'];
    const guess = ['circle', 'star', 'hexagon', 'star'];
    const result = evaluateGuess(secret, guess);
    expect(result.whites).toBe(1);
    expect(result.grays).toBe(0);
  });

  it('2 cinzas (símbolos trocados)', () => {
    const secret = ['circle', 'square', 'triangle', 'diamond'];
    const guess = ['square', 'circle', 'star', 'hexagon'];
    const result = evaluateGuess(secret, guess);
    expect(result.whites).toBe(0);
    expect(result.grays).toBe(2);
  });

  it('4 cinzas (todos trocados)', () => {
    const secret = ['circle', 'square', 'triangle', 'diamond'];
    const guess = ['diamond', 'triangle', 'square', 'circle'];
    const result = evaluateGuess(secret, guess);
    expect(result.whites).toBe(0);
    expect(result.grays).toBe(4);
  });

  it('exemplo obrigatório: secret=[circle,hexagon,square,star] guess=[circle,star,square,triangle]', () => {
    const secret = ['circle', 'hexagon', 'square', 'star'];
    const guess = ['circle', 'star', 'square', 'triangle'];
    const result = evaluateGuess(secret, guess);
    // circle@0: BRANCO
    // star@1 existe em secret@3: CINZA
    // square@2: BRANCO
    // triangle: não existe
    expect(result.whites).toBe(2);
    expect(result.grays).toBe(1);
  });

  it('não conta o mesmo símbolo duas vezes', () => {
    const secret = ['circle', 'square', 'triangle', 'diamond'];
    const guess = ['circle', 'circle', 'circle', 'circle'];
    const result = evaluateGuess(secret, guess);
    expect(result.whites).toBe(1);
    expect(result.grays).toBe(0);
  });

  it('símbolo presente conta só uma vez', () => {
    const secret = ['circle', 'square', 'triangle', 'diamond'];
    const guess = ['square', 'star', 'square', 'hexagon'];
    const result = evaluateGuess(secret, guess);
    expect(result.whites).toBe(0);
    expect(result.grays).toBe(1);
  });

  it('múltiplas chamadas produzem mesmo resultado', () => {
    const secret = ['circle', 'square', 'triangle', 'diamond'];
    const guess = ['circle', 'triangle', 'square', 'diamond'];
    const r1 = evaluateGuess(secret, guess);
    const r2 = evaluateGuess(secret, guess);
    const r3 = evaluateGuess(secret, guess);
    expect(r1.whites).toBe(r2.whites);
    expect(r1.grays).toBe(r2.grays);
    expect(r2.whites).toBe(r3.whites);
    expect(r2.grays).toBe(r3.grays);
  });
});
