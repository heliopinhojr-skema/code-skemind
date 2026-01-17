import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// SKEMIND - MASTERMIND CLÁSSICO (REENGENHEIRADO)
// ═══════════════════════════════════════════════════════════════════════════
//
// INVARIANTES ABSOLUTOS:
// 1. O secret é gerado APENAS em startNewRound() via useRef
// 2. O secretRef.current é IMUTÁVEL durante toda a rodada
// 3. Nenhum render, timer, submit ou effect pode alterar o secret
// 4. Apenas o botão "New Round" / "Start" pode criar novo secret
// 5. DUPLICATAS SÃO PERMITIDAS no secret
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

export type GameStatus = 'notStarted' | 'playing' | 'won' | 'lost' | 'timeup';

export type GuessSlot = GameSymbol | null;

export interface AttemptResult {
  guess: GameSymbol[];
  feedback: {
    exact: number;   // Pinos brancos (posição correta)
    present: number; // Pinos cinzas (posição errada)
  };
}

export interface GameState {
  currentGuess: GuessSlot[];
  history: AttemptResult[];
  status: GameStatus;
  timeLeft: number;
  attempts: number;
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
// DEBUG MODE
// ─────────────────────────────────────────────────────────────────────────────

function isDebugMode(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('debug') === '1';
}

// ─────────────────────────────────────────────────────────────────────────────
// PURE FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gera código secreto com 4 símbolos ÚNICOS (SEM DUPLICATAS).
 * Usa Fisher-Yates shuffle para selecionar aleatoriamente.
 * CHAMADO APENAS POR startNewRound()
 */
function generateSecret(): GameSymbol[] {
  const pool = [...SYMBOLS];
  
  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  
  // Retorna os primeiros 4 (todos únicos)
  return pool.slice(0, CODE_LENGTH);
}

/**
 * ALGORITMO MASTERMIND CLÁSSICO - 2 PASSES
 * 
 * PASSO 1 (exatos): Para cada posição i, se guess[i].id === secret[i].id, 
 *   conta exact++ e marca ambos como usados.
 * 
 * PASSO 2 (parciais): Para cada posição i do guess ainda não usada,
 *   procura um índice j ainda não usado do secret com o mesmo símbolo.
 *   Se achar, conta present++ e marca secret[j] como usado.
 * 
 * Retorna: { exact, present }
 * 
 * NUNCA conta um símbolo duas vezes.
 */
export function calculateFeedback(
  secret: GameSymbol[],
  guess: GameSymbol[]
): { exact: number; present: number } {
  // Arrays para marcar como "usado" sem mutar originais
  const secretUsed: boolean[] = Array(CODE_LENGTH).fill(false);
  const guessUsed: boolean[] = Array(CODE_LENGTH).fill(false);
  
  let exact = 0;   // Posição correta (branco)
  let present = 0; // Posição errada (cinza)
  
  // PASSO 1: Acertos EXATOS (mesma posição)
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guess[i].id === secret[i].id) {
      exact++;
      secretUsed[i] = true;
      guessUsed[i] = true;
    }
  }
  
  // PASSO 2: Acertos PARCIAIS (posição diferente)
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessUsed[i]) continue; // Já foi contado como exato
    
    for (let j = 0; j < CODE_LENGTH; j++) {
      if (secretUsed[j]) continue; // Já foi usado
      
      if (guess[i].id === secret[j].id) {
        present++;
        secretUsed[j] = true;
        break; // Importante: só conta uma vez por símbolo do guess
      }
    }
  }
  
  return { exact, present };
}

// ─────────────────────────────────────────────────────────────────────────────
// SELF-TESTS (executados apenas em modo debug)
// ─────────────────────────────────────────────────────────────────────────────

interface TestCase {
  name: string;
  secret: string[];
  guess: string[];
  expectedExact: number;
  expectedPresent: number;
}

function createSymbol(id: string): GameSymbol {
  return { id, color: '#000', shape: 'circle' };
}

function runSelfTests(): void {
  const testCases: TestCase[] = [
    {
      name: 'All correct',
      secret: ['A', 'B', 'C', 'D'],
      guess: ['A', 'B', 'C', 'D'],
      expectedExact: 4,
      expectedPresent: 0,
    },
    {
      name: 'All swapped',
      secret: ['A', 'B', 'C', 'D'],
      guess: ['D', 'C', 'B', 'A'],
      expectedExact: 0,
      expectedPresent: 4,
    },
    {
      name: 'Duplicates: [A,A,B,C] vs [A,B,A,A]',
      secret: ['A', 'A', 'B', 'C'],
      guess: ['A', 'B', 'A', 'A'],
      expectedExact: 1,
      expectedPresent: 2,
    },
    {
      name: 'Duplicates: [A,B,B,B] vs [B,B,B,A]',
      secret: ['A', 'B', 'B', 'B'],
      guess: ['B', 'B', 'B', 'A'],
      expectedExact: 2,
      expectedPresent: 2,
    },
    {
      name: 'No matches',
      secret: ['A', 'B', 'C', 'D'],
      guess: ['E', 'E', 'E', 'E'],
      expectedExact: 0,
      expectedPresent: 0,
    },
    {
      name: 'Mixed: [A,B,C,A] vs [A,A,B,C]',
      secret: ['A', 'B', 'C', 'A'],
      guess: ['A', 'A', 'B', 'C'],
      expectedExact: 1,
      expectedPresent: 3,
    },
  ];

  console.log('🧪 Running Mastermind Self-Tests...');
  console.log('─'.repeat(50));

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const secret = tc.secret.map(createSymbol);
    const guess = tc.guess.map(createSymbol);
    const result = calculateFeedback(secret, guess);
    
    const ok = result.exact === tc.expectedExact && 
               result.present === tc.expectedPresent;
    
    if (ok) {
      console.log(`✅ PASS: ${tc.name}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${tc.name}`);
      console.log(`   Secret: [${tc.secret.join(',')}], Guess: [${tc.guess.join(',')}]`);
      console.log(`   Expected: exact=${tc.expectedExact}, present=${tc.expectedPresent}`);
      console.log(`   Got:      exact=${result.exact}, present=${result.present}`);
      failed++;
    }
  }

  console.log('─'.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! Mastermind logic is correct.');
  } else {
    console.error('⚠️ Some tests failed! Check the algorithm.');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GAME HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useGame() {
  // ═══════════════════════════════════════════════════════════════════════════
  // SECRET TRAVADO COM useRef
  // O secret é armazenado em ref para NUNCA ser regenerado durante a rodada
  // Inicializa como NULL - será gerado apenas em startNewRound()
  // ═══════════════════════════════════════════════════════════════════════════
  const secretRef = useRef<GameSymbol[] | null>(null);
  
  // Estado do jogo
  const [status, setStatus] = useState<GameStatus>('notStarted');
  const [history, setHistory] = useState<AttemptResult[]>([]);
  const [currentGuess, setCurrentGuess] = useState<GuessSlot[]>([null, null, null, null]);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  
  // Timer reference
  const timerRef = useRef<number | null>(null);
  
  // Debug mode (memoizado para não recalcular)
  const debugMode = useMemo(() => isDebugMode(), []);

  // Executa self-tests em modo debug (apenas uma vez)
  useEffect(() => {
    if (debugMode) {
      runSelfTests();
    }
  }, [debugMode]);

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
    if (status !== 'playing') return;

    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setStatus('timeup');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  // ───────────────────────────────────────────────────────────────────────────
  // DERIVED: Attempts count
  // ───────────────────────────────────────────────────────────────────────────
  const attempts = history.length;

  // ───────────────────────────────────────────────────────────────────────────
  // ACTION: Start New Round
  // ÚNICO ponto onde um novo secret é criado
  // ───────────────────────────────────────────────────────────────────────────
  const startNewRound = useCallback(() => {
    // Limpa timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Gera NOVO secret (COM DUPLICATAS PERMITIDAS)
    secretRef.current = generateSecret();
    
    // Reset de todo o estado
    setStatus('playing');
    setHistory([]);
    setCurrentGuess([null, null, null, null]);
    setTimeLeft(ROUND_DURATION_SECONDS);
    
    // Log debug
    if (isDebugMode()) {
      console.log('🔄 New Round Started');
      console.log('🔐 New Secret:', secretRef.current.map(s => s.id));
    }
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // ACTION: Select Symbol
  // ───────────────────────────────────────────────────────────────────────────
  const selectSymbol = useCallback((symbol: GameSymbol) => {
    if (status !== 'playing') return;
    
    setCurrentGuess(prev => {
      const newGuess = [...prev];
      const emptyIdx = newGuess.findIndex(slot => slot === null);
      if (emptyIdx !== -1) {
        newGuess[emptyIdx] = symbol;
      }
      return newGuess;
    });
  }, [status]);

  // ───────────────────────────────────────────────────────────────────────────
  // ACTION: Clear Slot
  // ───────────────────────────────────────────────────────────────────────────
  const clearSlot = useCallback((index: number) => {
    if (status !== 'playing') return;
    
    setCurrentGuess(prev => {
      const newGuess = [...prev];
      newGuess[index] = null;
      return newGuess;
    });
  }, [status]);

  // ───────────────────────────────────────────────────────────────────────────
  // ACTION: Submit Guess
  // Compara contra o secret IMUTÁVEL armazenado em secretRef
  // O feedback é calculado UMA VEZ e armazenado no histórico (congelado)
  // ───────────────────────────────────────────────────────────────────────────
  const submitGuess = useCallback(() => {
    // Validações
    if (status !== 'playing') return;
    if (currentGuess.includes(null)) return;
    if (!secretRef.current) return;
    if (history.length >= MAX_ATTEMPTS) return;
    if (timeLeft <= 0) return;
    
    const guess = currentGuess as GameSymbol[];
    const secret = secretRef.current; // Usa o secret do ref (IMUTÁVEL)
    
    // Calcula feedback UMA VEZ e congela
    const feedback = calculateFeedback(secret, guess);
    
    // Log debug
    if (isDebugMode()) {
      console.log('📝 Guess:', guess.map(s => s.id));
      console.log('🔐 Secret:', secret.map(s => s.id));
      console.log('📊 Feedback:', `exact=${feedback.exact}, present=${feedback.present}`);
    }
    
    // Cria entry do histórico com feedback CONGELADO
    const newHistoryEntry: AttemptResult = {
      guess: [...guess], // Clone para segurança
      feedback: { ...feedback }, // Clone do feedback
    };
    
    // Adiciona ao histórico (mais recente primeiro)
    const newHistory = [newHistoryEntry, ...history];
    setHistory(newHistory);
    setCurrentGuess([null, null, null, null]);
    
    // Verifica vitória: todos os 4 corretos
    if (feedback.exact === CODE_LENGTH) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStatus('won');
      return;
    }
    
    // Verifica derrota: 8 tentativas esgotadas
    if (newHistory.length >= MAX_ATTEMPTS) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStatus('lost');
      return;
    }
  }, [status, currentGuess, history, timeLeft]);

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ───────────────────────────────────────────────────────────────────────────
  return {
    state: {
      currentGuess,
      history,
      status,
      timeLeft,
      attempts,
    } as GameState,
    
    // Secret para reveal no fim (ou debug) - pode ser null se não iniciado
    secretCode: secretRef.current ?? [],
    
    // Debug mode flag
    debugMode,
    
    actions: {
      startGame: startNewRound,
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
