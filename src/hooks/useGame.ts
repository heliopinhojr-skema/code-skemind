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

/**
 * Generate secret code with exactly 4 DIFFERENT symbols.
 * Uses Fisher-Yates shuffle for unbiased randomization.
 * Returns immutable array - never mutate.
 */
function generateSecret(): GameSymbol[] {
  // Create a fresh copy to avoid mutating SYMBOLS
  const pool = [...SYMBOLS];
  
  // Fisher-Yates shuffle for unbiased randomization
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  
  // Take first CODE_LENGTH symbols (all different guaranteed)
  const secret = pool.slice(0, CODE_LENGTH);
  
  // Verify no duplicates (defensive check)
  const ids = new Set(secret.map(s => s.id));
  if (ids.size !== CODE_LENGTH) {
    throw new Error('Secret generation failed: duplicates detected');
  }
  
  return Object.freeze(secret) as GameSymbol[];
}

/**
 * Calculate Mastermind feedback using strict immutable logic.
 * 
 * Step 1: Count exact matches (correct position)
 * Step 2: Count partial matches (correct symbol, wrong position)
 * 
 * Rules:
 * - Each symbol counted only once
 * - No double counting
 * - Original arrays never mutated
 */
function calculateFeedback(
  secret: readonly GameSymbol[],
  guess: readonly GameSymbol[]
): { correctPosition: number; correctSymbol: number } {
  // Create immutable copies of IDs for evaluation
  const secretIds: string[] = secret.map(s => s.id);
  const guessIds: string[] = guess.map(g => g.id);
  
  // Track which positions have been matched
  const secretMatched: boolean[] = new Array(CODE_LENGTH).fill(false);
  const guessMatched: boolean[] = new Array(CODE_LENGTH).fill(false);
  
  let correctPosition = 0;
  let correctSymbol = 0;
  
  // Step 1: Find exact matches (correct position)
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessIds[i] === secretIds[i]) {
      correctPosition++;
      secretMatched[i] = true;
      guessMatched[i] = true;
    }
  }
  
  // Step 2: Find partial matches (correct symbol, wrong position)
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessMatched[i]) continue; // Skip already matched
    
    for (let j = 0; j < CODE_LENGTH; j++) {
      if (secretMatched[j]) continue; // Skip already matched
      
      if (guessIds[i] === secretIds[j]) {
        correctSymbol++;
        secretMatched[j] = true; // Mark as used
        break; // Each guess symbol counts once
      }
    }
  }
  
  return Object.freeze({ correctPosition, correctSymbol });
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

      // Create deep immutable copy of guess for evaluation
      const validGuess: GameSymbol[] = s.guess.map(g => ({ ...g! }));
      
      // Calculate feedback once - this result is final and immutable
      const feedback = calculateFeedback(s.secret, validGuess);
      
      // Create immutable history entry with frozen data
      const historyEntry: AttemptResult = Object.freeze({
        guess: Object.freeze(validGuess.map(g => ({ ...g }))),
        correctPosition: feedback.correctPosition,
        correctSymbol: feedback.correctSymbol,
      }) as AttemptResult;
      
      const newAttempts = s.attempts + 1;
      const newHistory = [historyEntry, ...s.history];
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
          gameStatus: 'won' as const,
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
          gameStatus: 'lost' as const,
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
