import { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// SKEMIND - CLEAN MASTERMIND IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════
//
// INVARIANTES ABSOLUTOS:
// 1. O secret é gerado APENAS em startNewRound()
// 2. O secret é IMUTÁVEL durante toda a rodada
// 3. Nenhum render, timer, submit ou effect pode alterar o secret
// 4. Apenas o botão "New Round" pode criar novo secret
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

export type GameStatus = 'playing' | 'victory' | 'defeat';

export type GuessSlot = GameSymbol | null;

export interface AttemptResult {
  guess: GameSymbol[];
  correctPosition: number; // Pino branco (exato)
  correctSymbol: number;   // Pino cinza (parcial)
}

/**
 * Estado central do jogo - Máquina de Estados Finitos
 */
export interface GameRound {
  id: string;
  secret: GameSymbol[];
  status: GameStatus;
  attempts: number;
  history: AttemptResult[];
  currentGuess: GuessSlot[];
  remainingSeconds: number;
  startTime: number;
}

// Alias para compatibilidade com componentes existentes
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
// PURE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function generateRoundId(): string {
  return `round_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Gera código secreto com 4 símbolos diferentes.
 * CHAMADO APENAS POR startNewRound()
 */
function generateSecret(): GameSymbol[] {
  const pool = [...SYMBOLS];
  
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  
  return pool.slice(0, CODE_LENGTH);
}

/**
 * Algoritmo clássico Mastermind para feedback.
 * 
 * FASE 1 - Acertos exatos (pino branco):
 *   Mesmo símbolo E mesma posição.
 * 
 * FASE 2 - Acertos parciais (pino cinza):
 *   Símbolo existe mas em posição diferente.
 * 
 * Cada símbolo gera NO MÁXIMO um feedback.
 */
function calculateFeedback(
  secret: GameSymbol[],
  guess: GameSymbol[]
): { correctPosition: number; correctSymbol: number } {
  const secretCopy: (string | null)[] = secret.map(s => s.id);
  const guessCopy: (string | null)[] = guess.map(g => g.id);
  
  let exactMatches = 0;
  let partialMatches = 0;
  
  // FASE 1: Acertos exatos
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessCopy[i] !== null && guessCopy[i] === secretCopy[i]) {
      exactMatches++;
      secretCopy[i] = null;
      guessCopy[i] = null;
    }
  }
  
  // FASE 2: Acertos parciais
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

/**
 * Cria uma nova rodada com secret fresco.
 * Esta é a ÚNICA função que gera um secret.
 */
function createNewRound(): GameRound {
  return {
    id: generateRoundId(),
    secret: generateSecret(),
    status: 'playing',
    attempts: 0,
    history: [],
    currentGuess: [null, null, null, null],
    remainingSeconds: ROUND_DURATION_SECONDS,
    startTime: Date.now(),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useGame() {
  // Estado central - o secret vive aqui e é IMUTÁVEL durante a rodada
  const [round, setRound] = useState<GameRound>(() => createNewRound());
  
  // Timer reference
  const timerRef = useRef<number | null>(null);
  const currentRoundIdRef = useRef<string>(round.id);

  // ───────────────────────────────────────────────────────────────────────────
  // TIMER EFFECT
  // ───────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Limpa timer anterior
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Só inicia timer se estiver jogando
    if (round.status !== 'playing') return;

    currentRoundIdRef.current = round.id;

    timerRef.current = window.setInterval(() => {
      setRound(prev => {
        // Guard: verifica se ainda é a mesma rodada
        if (prev.id !== currentRoundIdRef.current) return prev;
        if (prev.status !== 'playing') return prev;

        if (prev.remainingSeconds <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return { ...prev, remainingSeconds: 0, status: 'defeat' };
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
  }, [round.id, round.status]);

  // ───────────────────────────────────────────────────────────────────────────
  // ACTION: Start New Round
  // ÚNICO ponto onde um novo secret é criado
  // ───────────────────────────────────────────────────────────────────────────
  const startNewRound = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    const newRound = createNewRound();
    currentRoundIdRef.current = newRound.id;
    setRound(newRound);
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // ACTION: Select Symbol
  // ───────────────────────────────────────────────────────────────────────────
  const selectSymbol = useCallback((symbol: GameSymbol) => {
    setRound(prev => {
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
  // Compara contra o secret IMUTÁVEL da rodada
  // ───────────────────────────────────────────────────────────────────────────
  const submitGuess = useCallback(() => {
    setRound(prev => {
      if (prev.status !== 'playing') return prev;
      if (prev.currentGuess.includes(null)) return prev;
      
      const guess = prev.currentGuess as GameSymbol[];
      const feedback = calculateFeedback(prev.secret, guess);
      
      const newAttempts = prev.attempts + 1;
      const newHistory: AttemptResult[] = [
        {
          guess: [...guess],
          correctPosition: feedback.correctPosition,
          correctSymbol: feedback.correctSymbol,
        },
        ...prev.history,
      ];
      
      // Vitória: todos os 4 corretos
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
          status: 'victory' as GameStatus,
        };
      }
      
      // Derrota: 8 tentativas esgotadas
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
          status: 'defeat' as GameStatus,
        };
      }
      
      // Continua jogando
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
    round,
    
    // Estado derivado para UI
    state: {
      roundId: round.id,
      guess: round.currentGuess,
      attempts: round.attempts,
      history: round.history,
      score: round.status === 'victory' ? 1000 : 0,
      remainingSeconds: round.remainingSeconds,
      gameStatus: round.status,
    },
    
    // Secret para reveal no fim
    secretCode: round.secret,
    
    actions: {
      newGame: startNewRound,
      selectSymbol,
      clearSlot,
      submit: submitGuess,
    },
    
    constants: {
      SYMBOLS,
      MAX_ATTEMPTS,
      CODE_LENGTH,
      ROUND_DURATION_SECONDS,
    },
  };
}
