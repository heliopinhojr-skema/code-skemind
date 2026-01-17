import { useState, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// SKEMIND - FINITE STATE MACHINE ARCHITECTURE
// ═══════════════════════════════════════════════════════════════════════════
// 
// INVARIANTS:
// 1. Secret is created ONLY inside startNewRound()
// 2. No hook, effect, timer, or render can generate or modify secret
// 3. Secret is completely immutable during a round
// 4. Game always starts with status = "playing"
// 5. When status !== "playing", all input is locked, no state changes allowed
// 6. "New Round" button is the ONLY entry point to create a new secret
//
// ═══════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface GameSymbol {
  id: string;
  color: string;
  shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'hexagon';
}

export type GameStatus = 'playing' | 'victory' | 'timeout';

export type GuessSlot = GameSymbol | null;

export interface AttemptResult {
  guess: GameSymbol[];
  correctPosition: number; // Black pegs (exact match)
  correctSymbol: number;   // White pegs (wrong position)
}

/**
 * Core game round state - Finite State Machine
 * The secret lives ONLY here and is set ONLY by startNewRound()
 */
export interface GameRound {
  readonly id: string;
  readonly secret: readonly GameSymbol[];
  status: GameStatus;
  attempts: number;
  history: AttemptResult[];
  currentGuess: GuessSlot[];
  score: number;
  remainingSeconds: number;
  startTime: number;
}

// Legacy type alias for backward compatibility
export interface GameState {
  roundId: string;
  guess: GuessSlot[];
  attempts: number;
  history: AttemptResult[];
  score: number;
  remainingSeconds: number;
  gameStatus: GameStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const SYMBOLS: GameSymbol[] = [
  { id: 'red-circle', color: '#ef4444', shape: 'circle' },
  { id: 'blue-square', color: '#3b82f6', shape: 'square' },
  { id: 'green-triangle', color: '#22c55e', shape: 'triangle' },
  { id: 'yellow-diamond', color: '#eab308', shape: 'diamond' },
  { id: 'purple-star', color: '#a855f7', shape: 'star' },
  { id: 'cyan-hexagon', color: '#06b6d4', shape: 'hexagon' },
];

export const MAX_ATTEMPTS = 8;
export const CODE_LENGTH = 4;
export const ROUND_DURATION_SECONDS = 180;

// ─────────────────────────────────────────────────────────────────────────────
// PURE FUNCTIONS (No side effects, deterministic)
// ─────────────────────────────────────────────────────────────────────────────

function generateRoundId(): string {
  return `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate secret code with exactly CODE_LENGTH DIFFERENT symbols.
 * Uses Fisher-Yates shuffle for unbiased randomization.
 * 
 * IMPORTANT: This function is called ONLY by startNewRound()
 */
function generateSecret(): GameSymbol[] {
  const pool = [...SYMBOLS];
  
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  
  return Object.freeze(pool.slice(0, CODE_LENGTH)) as GameSymbol[];
}

/**
 * Classic Mastermind feedback algorithm.
 * 
 * PHASE 1 - Exact matches (correctPosition):
 *   Same symbol AND same position.
 * 
 * PHASE 2 - Partial matches (correctSymbol):
 *   Symbol exists but at different position.
 * 
 * Each symbol generates at most ONE feedback point.
 */
function calculateFeedback(
  secret: readonly GameSymbol[],
  guess: readonly GameSymbol[]
): { correctPosition: number; correctSymbol: number } {
  // Create mutable copies - never touch originals
  const secretCopy: (string | null)[] = secret.map(s => s.id);
  const guessCopy: (string | null)[] = guess.map(g => g.id);
  
  let exactMatches = 0;
  let partialMatches = 0;
  
  // PHASE 1: Exact matches
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessCopy[i] !== null && guessCopy[i] === secretCopy[i]) {
      exactMatches++;
      secretCopy[i] = null;
      guessCopy[i] = null;
    }
  }
  
  // PHASE 2: Partial matches
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessCopy[i] === null) continue;
    
    for (let j = 0; j < CODE_LENGTH; j++) {
      if (secretCopy[j] === null) continue;
      
      if (guessCopy[i] === secretCopy[j]) {
        partialMatches++;
        secretCopy[j] = null;
        break;
      }
    }
  }
  
  return { correctPosition: exactMatches, correctSymbol: partialMatches };
}

function calculateScore(attempts: number, elapsedMs: number, solved: boolean): number {
  if (!solved) return 0;
  
  const baseScore = 1000;
  const attemptBonus = Math.max(0, (MAX_ATTEMPTS - attempts) * 100);
  const elapsedSeconds = elapsedMs / 1000;
  const timeBonus = Math.max(0, Math.floor(ROUND_DURATION_SECONDS - elapsedSeconds));
  
  return baseScore + attemptBonus + timeBonus;
}

/**
 * Create a fresh game round.
 * This is the ONLY place where a secret is generated.
 */
function createNewRound(): GameRound {
  const secret = generateSecret();
  
  return Object.freeze({
    id: generateRoundId(),
    secret: secret,
    status: 'playing' as GameStatus,
    attempts: 0,
    history: [],
    currentGuess: [null, null, null, null],
    score: 0,
    remainingSeconds: ROUND_DURATION_SECONDS,
    startTime: Date.now(),
  }) as GameRound;
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME HOOK - Finite State Machine Controller
// ─────────────────────────────────────────────────────────────────────────────

export function useGame() {
  // The round state is the single source of truth.
  // Secret lives inside round and is NEVER regenerated except by startNewRound().
  const [round, setRound] = useState<GameRound>(() => createNewRound());
  
  // Timer reference (does NOT affect secret or game logic)
  const timerRef = useRef<number | null>(null);
  const roundIdRef = useRef<string>(round.id);

  // ───────────────────────────────────────────────────────────────────────────
  // ACTION: Start New Round
  // This is the ONLY function that creates a new secret.
  // ───────────────────────────────────────────────────────────────────────────
  const startNewRound = useCallback(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Create completely fresh round with new secret
    const newRound = createNewRound();
    roundIdRef.current = newRound.id;
    setRound(newRound);
    
    // Start countdown timer
    timerRef.current = window.setInterval(() => {
      setRound(prev => {
        // Guard: Only tick if this is the current round and still playing
        if (prev.id !== roundIdRef.current) return prev;
        if (prev.status !== 'playing') {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return prev;
        }
        
        if (prev.remainingSeconds <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return {
            ...prev,
            remainingSeconds: 0,
            status: 'timeout' as GameStatus,
            score: 0,
          };
        }
        
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
  }, []);

  // Start timer on initial mount (using useEffect, not useState)
  useEffect(() => {
    roundIdRef.current = round.id;
    timerRef.current = window.setInterval(() => {
      setRound(prev => {
        if (prev.id !== roundIdRef.current) return prev;
        if (prev.status !== 'playing') {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return prev;
        }
        
        if (prev.remainingSeconds <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return {
            ...prev,
            remainingSeconds: 0,
            status: 'timeout' as GameStatus,
            score: 0,
          };
        }
        
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ───────────────────────────────────────────────────────────────────────────
  // ACTION: Select Symbol
  // Only works when status === "playing"
  // ───────────────────────────────────────────────────────────────────────────
  const selectSymbol = useCallback((symbol: GameSymbol) => {
    setRound(prev => {
      // Guard: Only allow when playing
      if (prev.status !== 'playing') return prev;
      
      const newGuess = [...prev.currentGuess];
      const emptyIdx = newGuess.findIndex(slot => slot === null);
      if (emptyIdx !== -1) {
        newGuess[emptyIdx] = symbol;
      }
      return { ...prev, currentGuess: newGuess };
    });
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // ACTION: Clear Slot
  // Only works when status === "playing"
  // ───────────────────────────────────────────────────────────────────────────
  const clearSlot = useCallback((index: number) => {
    setRound(prev => {
      if (prev.status !== 'playing') return prev;
      
      const newGuess = [...prev.currentGuess];
      newGuess[index] = null;
      return { ...prev, currentGuess: newGuess };
    });
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // ACTION: Submit Guess
  // Only works when status === "playing"
  // Compares guess against the IMMUTABLE secret from round state
  // ───────────────────────────────────────────────────────────────────────────
  const submitGuess = useCallback(() => {
    setRound(prev => {
      // Guard: Only allow when playing
      if (prev.status !== 'playing') return prev;
      
      // Guard: All slots must be filled
      if (prev.currentGuess.includes(null)) return prev;
      
      // The secret is read directly from the round state - it cannot change
      const secret = prev.secret;
      const guess = prev.currentGuess as GameSymbol[];
      
      // Calculate feedback using classic Mastermind algorithm
      const feedback = calculateFeedback(secret, guess);
      
      const newAttempts = prev.attempts + 1;
      const newHistory: AttemptResult[] = [
        {
          guess: [...guess],
          correctPosition: feedback.correctPosition,
          correctSymbol: feedback.correctSymbol,
        },
        ...prev.history,
      ];
      
      const elapsedMs = Date.now() - prev.startTime;
      
      // Check for victory (all correct positions)
      if (feedback.correctPosition === CODE_LENGTH) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        return {
          ...prev,
          attempts: newAttempts,
          history: newHistory,
          currentGuess: [null, null, null, null],
          score: calculateScore(newAttempts, elapsedMs, true),
          status: 'victory' as GameStatus,
        };
      }
      
      // Check for max attempts reached
      if (newAttempts >= MAX_ATTEMPTS) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        return {
          ...prev,
          attempts: newAttempts,
          history: newHistory,
          currentGuess: [null, null, null, null],
          score: 0,
          status: 'timeout' as GameStatus,
        };
      }
      
      // Continue playing
      return {
        ...prev,
        attempts: newAttempts,
        history: newHistory,
        currentGuess: [null, null, null, null],
      };
    });
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ───────────────────────────────────────────────────────────────────────────
  return {
    // Current round state (includes secret for end-game reveal)
    round,
    
    // Derived state for UI convenience
    state: {
      roundId: round.id,
      guess: round.currentGuess,
      attempts: round.attempts,
      history: round.history,
      score: round.score,
      remainingSeconds: round.remainingSeconds,
      gameStatus: round.status,
    },
    
    // Secret code (for reveal at game end)
    secretCode: round.secret,
    
    // Actions
    actions: {
      newGame: startNewRound,
      selectSymbol,
      clearSlot,
      submit: submitGuess,
    },
    
    // Constants for UI
    constants: {
      SYMBOLS,
      MAX_ATTEMPTS,
      CODE_LENGTH,
      ROUND_DURATION_SECONDS,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DEVELOPMENT TESTS - Run on module load
// ═══════════════════════════════════════════════════════════════════════════

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const [A, B, C, D, E, F] = SYMBOLS;
  
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
      console.error(`❌ TEST FAILED: ${name}`);
      console.error(`   Expected: ${expectedExact} exact, ${expectedPartial} partial`);
      console.error(`   Got:      ${result.correctPosition} exact, ${result.correctSymbol} partial`);
    }
    return passed;
  };
  
  console.log('═══ MASTERMIND FEEDBACK TESTS ═══');
  runTest('All exact', [A, B, C, D], [A, B, C, D], 4, 0);
  runTest('All partial', [A, B, C, D], [B, C, D, A], 0, 4);
  runTest('All wrong', [A, B, C, D], [E, F, E, F], 0, 0);
  runTest('1 exact, 2 partial', [A, B, C, D], [A, C, D, E], 1, 2);
  runTest('2 exact, 0 partial', [A, B, C, D], [A, B, E, F], 2, 0);
  runTest('Swapped pairs', [A, B, C, D], [B, A, D, C], 0, 4);
  console.log('═════════════════════════════════');
}
