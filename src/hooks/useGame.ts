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
 * Classic Mastermind feedback algorithm.
 * 
 * PHASE 1 - Exact matches (Black pegs):
 *   Same symbol AND same position.
 *   Remove matched symbols from both arrays immediately.
 * 
 * PHASE 2 - Partial matches (White pegs):
 *   Symbol exists in remaining secret but at different position.
 *   Remove each matched symbol to prevent double counting.
 * 
 * Rules:
 * - Each symbol can only generate ONE feedback point
 * - Originals are NEVER mutated (copies used)
 * - Different positions = different feedback
 */
function calculateFeedback(
  secret: readonly GameSymbol[],
  guess: readonly GameSymbol[]
): { correctPosition: number; correctSymbol: number } {
  // CRITICAL: Create mutable COPIES - never touch originals
  const secretCopy: (string | null)[] = secret.map(s => s.id);
  const guessCopy: (string | null)[] = guess.map(g => g.id);
  
  let exactMatches = 0;
  let partialMatches = 0;
  
  // ═══════════════════════════════════════════════════════════
  // PHASE 1: Exact matches (correct symbol + correct position)
  // ═══════════════════════════════════════════════════════════
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessCopy[i] !== null && guessCopy[i] === secretCopy[i]) {
      exactMatches++;
      // Remove from both arrays to prevent reuse
      secretCopy[i] = null;
      guessCopy[i] = null;
    }
  }
  
  // ═══════════════════════════════════════════════════════════
  // PHASE 2: Partial matches (correct symbol + wrong position)
  // ═══════════════════════════════════════════════════════════
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessCopy[i] === null) continue; // Already matched exactly
    
    // Search for this guess symbol in remaining secret positions
    for (let j = 0; j < CODE_LENGTH; j++) {
      if (secretCopy[j] === null) continue; // Already used
      
      if (guessCopy[i] === secretCopy[j]) {
        partialMatches++;
        // Remove from secret to prevent double counting
        secretCopy[j] = null;
        break; // This guess symbol is now accounted for
      }
    }
  }
  
  return { correctPosition: exactMatches, correctSymbol: partialMatches };
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERNAL TEST SUITE - Run once on module load in development
// ═══════════════════════════════════════════════════════════════════════════
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const testSymbols = SYMBOLS.slice(0, 6);
  const [A, B, C, D, E, F] = testSymbols;
  
  const runTest = (
    name: string,
    secret: GameSymbol[],
    guess: GameSymbol[],
    expectedExact: number,
    expectedPartial: number
  ) => {
    const result = calculateFeedback(secret, guess);
    const passed = result.correctPosition === expectedExact && result.correctSymbol === expectedPartial;
    if (!passed) {
      console.error(`❌ MASTERMIND TEST FAILED: ${name}`);
      console.error(`   Secret: [${secret.map(s => s.id).join(', ')}]`);
      console.error(`   Guess:  [${guess.map(s => s.id).join(', ')}]`);
      console.error(`   Expected: ${expectedExact} exact, ${expectedPartial} partial`);
      console.error(`   Got:      ${result.correctPosition} exact, ${result.correctSymbol} partial`);
    } else {
      console.log(`✓ ${name}`);
    }
    return passed;
  };
  
  console.log('═══ MASTERMIND FEEDBACK TESTS ═══');
  
  // Test 1: All correct positions
  runTest('All exact', [A, B, C, D], [A, B, C, D], 4, 0);
  
  // Test 2: All wrong positions but all symbols present
  runTest('All partial (rotated)', [A, B, C, D], [B, C, D, A], 0, 4);
  
  // Test 3: Completely wrong
  runTest('All wrong', [A, B, C, D], [E, F, E, F], 0, 0);
  
  // Test 4: One exact, rest partial
  runTest('1 exact, 2 partial', [A, B, C, D], [A, C, D, E], 1, 2);
  
  // Test 5: Two exact, two wrong
  runTest('2 exact, 0 partial', [A, B, C, D], [A, B, E, F], 2, 0);
  
  // Test 6: Same symbols swapped pairs
  runTest('Swapped pairs', [A, B, C, D], [B, A, D, C], 0, 4);
  
  // Test 7: One exact, one partial, two wrong  
  runTest('1 exact, 1 partial', [A, B, C, D], [A, E, B, F], 1, 1);
  
  // Test 8: Three partials
  runTest('0 exact, 3 partial', [A, B, C, D], [B, C, D, E], 0, 3);
  
  console.log('═════════════════════════════════');
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

/**
 * Creates initial game state with a FIXED secret code.
 * The secret is generated ONCE and stored - never regenerated during a round.
 */
function createInitialState(): GameState {
  const now = Date.now();
  const roundId = generateRoundId();
  const secret = generateSecret();
  
  // Debug log - verify secret is generated only at round start
  if (process.env.NODE_ENV === 'development') {
    console.log('🎯 NEW ROUND STARTED');
    console.log(`   Round ID: ${roundId}`);
    console.log(`   Secret Code: [${secret.map(s => s.id).join(', ')}]`);
    console.log('   ⚠️ This secret must remain FIXED until round ends');
  }
  
  return {
    roundId,
    secret, // FIXED for entire round - never regenerate
    guess: [null, null, null, null],
    attempts: 0,
    history: [],
    score: 0,
    remainingSeconds: ROUND_DURATION_SECONDS,
    startTime: now,
    gameStatus: 'playing',
  };
}

export function useGame() {
  // State initialized ONCE per mount with fixed secret
  const [state, setState] = useState<GameState>(createInitialState);

  const timerRef = useRef<number | null>(null);
  const hasLoggedRef = useRef(false);
  
  // Track current roundId to detect when timer should restart
  const currentRoundIdRef = useRef(state.roundId);

  // Countdown timer - only depends on gameStatus, NOT roundId in dependencies
  // We use ref to track roundId changes instead
  useEffect(() => {
    // Clear any existing timer first
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (state.gameStatus === 'playing') {
      hasLoggedRef.current = false;
      currentRoundIdRef.current = state.roundId;
      
      timerRef.current = window.setInterval(() => {
        setState(s => {
          // Safety check - don't update if round changed
          if (s.roundId !== currentRoundIdRef.current) {
            return s;
          }
          
          if (s.remainingSeconds <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return { ...s, remainingSeconds: 0, gameStatus: 'timeout', score: 0 };
          }
          return { ...s, remainingSeconds: s.remainingSeconds - 1 };
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.gameStatus, state.roundId]);

  // Log when game ends
  useEffect(() => {
    if (state.gameStatus !== 'playing' && !hasLoggedRef.current) {
      hasLoggedRef.current = true;
      logRound(state, Date.now());
    }
  }, [state.gameStatus, state]);

  // newGame creates a completely fresh state with NEW secret
  const newGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    // Create new state with fresh secret - only place secret changes
    setState(createInitialState());
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

      // CRITICAL: Use the SAME secret from state - never regenerate
      // s.secret is the fixed code for this round
      const currentSecret = s.secret;
      
      // Create deep immutable copy of guess for evaluation
      const validGuess: GameSymbol[] = s.guess.map(g => ({ ...g! }));
      
      // Debug log to verify same secret is used
      if (process.env.NODE_ENV === 'development') {
        console.log(`📝 GUESS #${s.attempts + 1}`);
        console.log(`   Guess:  [${validGuess.map(g => g.id).join(', ')}]`);
        console.log(`   Secret: [${currentSecret.map(s => s.id).join(', ')}]`);
      }
      
      // Calculate feedback using the FIXED secret
      const feedback = calculateFeedback(currentSecret, validGuess);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`   Result: ${feedback.correctPosition} exact, ${feedback.correctSymbol} partial`);
      }
      
      // Create immutable history entry with frozen data
      const historyEntry: AttemptResult = Object.freeze({
        guess: Object.freeze(validGuess.map(g => ({ ...g }))),
        correctPosition: feedback.correctPosition,
        correctSymbol: feedback.correctSymbol,
      }) as AttemptResult;
      
      const newAttempts = s.attempts + 1;
      const newHistory = [historyEntry, ...s.history];
      const elapsedMs = Date.now() - s.startTime;

      // Win condition: all 4 positions correct
      if (feedback.correctPosition === CODE_LENGTH) {
        if (timerRef.current) clearInterval(timerRef.current);
        const finalScore = calculateScore(newAttempts, elapsedMs, true);
        console.log('🏆 ROUND WON!');
        return {
          ...s,
          // Keep the SAME secret - it doesn't change
          attempts: newAttempts,
          history: newHistory,
          guess: [null, null, null, null],
          score: finalScore,
          gameStatus: 'won' as const,
        };
      }

      // Lose condition: max attempts reached
      if (newAttempts >= MAX_ATTEMPTS) {
        if (timerRef.current) clearInterval(timerRef.current);
        console.log('💀 ROUND LOST - Max attempts reached');
        return {
          ...s,
          // Keep the SAME secret - it doesn't change
          attempts: newAttempts,
          history: newHistory,
          guess: [null, null, null, null],
          score: 0,
          gameStatus: 'lost' as const,
        };
      }

      // Continue playing with SAME secret
      return {
        ...s,
        // IMPORTANT: secret remains unchanged
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
