import { useState, useEffect, useCallback, useRef } from 'react';

// Colored shapes as symbols
export interface GameSymbol {
  id: string;
  color: string;
  shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'hexagon';
}

export const SYMBOLS: GameSymbol[] = [
  { id: 'red-circle', color: '#ef4444', shape: 'circle' },
  { id: 'blue-square', color: '#3b82f6', shape: 'square' },
  { id: 'green-triangle', color: '#22c55e', shape: 'triangle' },
  { id: 'yellow-diamond', color: '#eab308', shape: 'diamond' },
  { id: 'purple-star', color: '#a855f7', shape: 'star' },
  { id: 'cyan-hexagon', color: '#06b6d4', shape: 'hexagon' },
];

const MAX_ATTEMPTS = 8;
const CODE_LENGTH = 4;
const ROUND_DURATION_SECONDS = 180; // 3 minutes

export type GuessSlot = GameSymbol | null;

export interface AttemptResult {
  guess: GameSymbol[];
  correctPosition: number;
  correctSymbol: number;
}

export interface RoundLog {
  round_id: string;
  start_time: string;
  end_time: string;
  attempts_used: number;
  solved: boolean;
  total_time_ms: number;
  final_score: number;
}

export interface GameState {
  roundId: string;
  secret: GameSymbol[];
  guess: GuessSlot[];
  attempts: number;
  history: AttemptResult[];
  score: number;
  remainingSeconds: number;
  startTime: number;
  gameStatus: 'playing' | 'won' | 'lost' | 'timeout';
}

function generateRoundId(): string {
  return `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate secret with NO REPETITION
function generateSecret(): GameSymbol[] {
  const shuffled = [...SYMBOLS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, CODE_LENGTH);
}

function calculateFeedback(secret: GameSymbol[], guess: GameSymbol[]): { correctPosition: number; correctSymbol: number } {
  // Step 1: Find exact matches (correct position)
  let correctPosition = 0;
  const secretRemaining: string[] = [];
  const guessRemaining: string[] = [];

  for (let i = 0; i < CODE_LENGTH; i++) {
    if (secret[i].id === guess[i].id) {
      correctPosition++;
    } else {
      // Only add non-matched symbols to remaining pools
      secretRemaining.push(secret[i].id);
      guessRemaining.push(guess[i].id);
    }
  }

  // Step 2: Find partial matches (correct symbol, wrong position)
  // Each symbol can only generate one feedback point
  let correctSymbol = 0;
  const usedSecretIndices: Set<number> = new Set();

  for (const guessId of guessRemaining) {
    const secretIdx = secretRemaining.findIndex(
      (secretId, idx) => secretId === guessId && !usedSecretIndices.has(idx)
    );
    if (secretIdx !== -1) {
      correctSymbol++;
      usedSecretIndices.add(secretIdx);
    }
  }

  return { correctPosition, correctSymbol };
}

function calculateScore(attempts: number, elapsedMs: number, solved: boolean): number {
  if (!solved) return 0;
  
  // Base score for solving
  const baseScore = 1000;
  
  // Fewer attempts = higher bonus (max 700 for 1 attempt)
  const attemptBonus = Math.max(0, (MAX_ATTEMPTS - attempts) * 100);
  
  // Faster = higher bonus (max 180 bonus for instant solve, decreases linearly)
  const elapsedSeconds = elapsedMs / 1000;
  const timeBonus = Math.max(0, Math.floor(ROUND_DURATION_SECONDS - elapsedSeconds));
  
  return baseScore + attemptBonus + timeBonus;
}

function logRound(state: GameState, endTime: number): RoundLog {
  const log: RoundLog = {
    round_id: state.roundId,
    start_time: new Date(state.startTime).toISOString(),
    end_time: new Date(endTime).toISOString(),
    attempts_used: state.attempts,
    solved: state.gameStatus === 'won',
    total_time_ms: endTime - state.startTime,
    final_score: state.score,
  };
  
  console.log('=== SKEMIND ROUND LOG ===');
  console.log(JSON.stringify(log, null, 2));
  console.log('=========================');
  
  return log;
}

export function useGame() {
  const [state, setState] = useState<GameState>(() => {
    const now = Date.now();
    return {
      roundId: generateRoundId(),
      secret: generateSecret(),
      guess: [null, null, null, null],
      attempts: 0,
      history: [],
      score: 0,
      remainingSeconds: ROUND_DURATION_SECONDS,
      startTime: now,
      gameStatus: 'playing',
    };
  });

  const timerRef = useRef<number | null>(null);
  const hasLoggedRef = useRef(false);

  // Countdown timer
  useEffect(() => {
    if (state.gameStatus === 'playing') {
      hasLoggedRef.current = false;
      timerRef.current = window.setInterval(() => {
        setState(s => {
          if (s.remainingSeconds <= 1) {
            // Time's up!
            if (timerRef.current) clearInterval(timerRef.current);
            return { ...s, remainingSeconds: 0, gameStatus: 'timeout', score: 0 };
          }
          return { ...s, remainingSeconds: s.remainingSeconds - 1 };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.gameStatus, state.roundId]);

  // Log when game ends
  useEffect(() => {
    if (state.gameStatus !== 'playing' && !hasLoggedRef.current) {
      hasLoggedRef.current = true;
      logRound(state, Date.now());
    }
  }, [state.gameStatus, state]);

  const newGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const now = Date.now();
    setState({
      roundId: generateRoundId(),
      secret: generateSecret(),
      guess: [null, null, null, null],
      attempts: 0,
      history: [],
      score: 0,
      remainingSeconds: ROUND_DURATION_SECONDS,
      startTime: now,
      gameStatus: 'playing',
    });
  }, []);

  const selectSymbol = useCallback((symbol: GameSymbol) => {
    setState(s => {
      if (s.gameStatus !== 'playing') return s;
      const newGuess = [...s.guess];
      const emptyIdx = newGuess.findIndex(slot => slot === null);
      if (emptyIdx !== -1) {
        newGuess[emptyIdx] = symbol;
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

      const validGuess = s.guess as GameSymbol[];
      const feedback = calculateFeedback(s.secret, validGuess);
      const newAttempts = s.attempts + 1;
      const newHistory = [{ guess: validGuess, ...feedback }, ...s.history];
      const elapsedMs = Date.now() - s.startTime;

      if (feedback.correctPosition === CODE_LENGTH) {
        if (timerRef.current) clearInterval(timerRef.current);
        const finalScore = calculateScore(newAttempts, elapsedMs, true);
        return {
          ...s,
          attempts: newAttempts,
          history: newHistory,
          guess: [null, null, null, null],
          score: finalScore,
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
          score: 0,
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

  return {
    state,
    actions: {
      newGame,
      selectSymbol,
      clearSlot,
      submit,
    },
    constants: {
      SYMBOLS,
      MAX_ATTEMPTS,
      CODE_LENGTH,
      ROUND_DURATION_SECONDS,
    },
  };
}
