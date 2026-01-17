import { describe, it, expect } from 'vitest';
import { createSymbolArray, evaluateGuess } from '@/lib/mastermindEngine';

describe('SKEMIND spec — exemplo obrigatório', () => {
  it('Secret [circle, hexagon, square, star] + Guess [circle, star, square, triangle] => brancos=2, cinzas=1', () => {
    const secret = createSymbolArray(['circle', 'hexagon', 'square', 'star']);
    const guess = createSymbolArray(['circle', 'star', 'square', 'triangle']);

    const result = evaluateGuess(secret, guess);

    expect(result.feedback.exact).toBe(2);
    expect(result.feedback.present).toBe(1);
    expect(result.isVictory).toBe(false);
  });
});
