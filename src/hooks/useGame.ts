import { useState, useEffect, useCallback, useRef } from 'react';

export const TOKENS = ["🔥", "💎", "⚡", "🌙", "🧠", "🛡️", "👁️", "🌀"];
const MAX_ATTEMPTS = 10;
const CODE_LENGTH = 4;

export type GuessSlot = string | null;

export interface AttemptResult {
  guess: string[];
  black: number;
  white: number;
}

export interface GameState {
  secret: string[];
  guess: GuessSlot[];
  attempts: number;
  history: AttemptResult[];
  score: number;
  elapsedSeconds: number;
  gameStatus: 'playing' | 'won' | 'lost' | 'revealed';
}

function generateSecret(): string[] {
  return Array.from({ length: CODE_LENGTH }, () => 
    TOKENS[Math.floor(Math.random() * TOKENS.length)]
  );
}

function calculateFeedback(code: string[], guess: string[]): { black: number; white: number } {
  let black = 0;
  let white = 0;
  const codeRemaining: string[] = [];
  const guessRemaining: string[] = [];

  for (let i = 0; i < CODE_LENGTH; i++) {
    if (code[i] === guess[i]) {
      black++;
    } else {
      codeRemaining.push(code[i]);
      guessRemaining.push(guess[i]);
    }
  }

  guessRemaining.forEach(token => {
    const idx = codeRemaining.indexOf(token);
    if (idx > -1) {
      white++;
      codeRemaining.splice(idx, 1);
    }
  });

  return { black, white };
}

function calculateScore(attempts: number, elapsedSeconds: number): number {
  const attemptBonus = Math.max(0, (MAX_ATTEMPTS - attempts) * 100);
  const timeBonus = Math.max(0, 500 - elapsedSeconds);
  return attemptBonus + timeBonus;
}

export function useGame() {
  const [state, setState] = useState<GameState>(() => ({
    secret: generateSecret(),
    guess: [null, null, null, null],
    attempts: 0,
    history: [],
    score: 0,
    elapsedSeconds: 0,
    gameStatus: 'playing',
  }));

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (state.gameStatus === 'playing') {
      timerRef.current = window.setInterval(() => {
        setState(s => ({ ...s, elapsedSeconds: s.elapsedSeconds + 1 }));
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.gameStatus]);

  const newGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState({
      secret: generateSecret(),
      guess: [null, null, null, null],
      attempts: 0,
      history: [],
      score: 0,
      elapsedSeconds: 0,
      gameStatus: 'playing',
    });
  }, []);

  const selectToken = useCallback((token: string) => {
    setState(s => {
      if (s.gameStatus !== 'playing') return s;
      const newGuess = [...s.guess];
      const emptyIdx = newGuess.findIndex(slot => slot === null);
      if (emptyIdx !== -1) {
        newGuess[emptyIdx] = token;
      }
      return { ...s, guess: newGuess };
    });
  }, []);

  const clearSlot = useCallback((index: number) => {
    setState(s => {
      if (s.gameStatus !== 'playing') return s;
      const newGuess = [...s.guess];
      newGuess[index] = null;
      return { ...s, guess: newGuess };
    });
  }, []);

  const submit = useCallback(() => {
    setState(s => {
      if (s.gameStatus !== 'playing') return s;
      if (s.guess.includes(null)) return s;

      const validGuess = s.guess as string[];
      const feedback = calculateFeedback(s.secret, validGuess);
      const newAttempts = s.attempts + 1;
      const newHistory = [{ guess: validGuess, ...feedback }, ...s.history];

      if (feedback.black === CODE_LENGTH) {
        if (timerRef.current) clearInterval(timerRef.current);
        return {
          ...s,
          attempts: newAttempts,
          history: newHistory,
          guess: [null, null, null, null],
          score: calculateScore(newAttempts, s.elapsedSeconds),
          gameStatus: 'won',
        };
      }

      if (newAttempts >= MAX_ATTEMPTS) {
        if (timerRef.current) clearInterval(timerRef.current);
        return {
          ...s,
          attempts: newAttempts,
          history: newHistory,
          guess: [null, null, null, null],
          gameStatus: 'lost',
        };
      }

      return {
        ...s,
        attempts: newAttempts,
        history: newHistory,
        guess: [null, null, null, null],
      };
    });
  }, []);

  const reveal = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setState(s => ({ ...s, gameStatus: 'revealed' }));
  }, []);

  return {
    state,
    actions: {
      newGame,
      selectToken,
      clearSlot,
      submit,
      reveal,
    },
    constants: {
      TOKENS,
      MAX_ATTEMPTS,
      CODE_LENGTH,
    },
  };
}
