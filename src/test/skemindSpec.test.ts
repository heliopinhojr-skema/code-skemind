import { describe, it, expect } from 'vitest';
import { evaluateGuess } from '@/lib/mastermindEngine';

describe('SKEMIND spec — exemplo obrigatório', () => {
  it('Secret [circle, hexagon, square, star] + Guess [circle, star, square, triangle] => brancos=2, cinzas=1', () => {
    const secret = ['circle', 'hexagon', 'square', 'star'];
    const guess = ['circle', 'star', 'square', 'triangle'];

    const result = evaluateGuess(secret, guess);

    expect(result.whites).toBe(2);
    expect(result.grays).toBe(1);
  });
});
