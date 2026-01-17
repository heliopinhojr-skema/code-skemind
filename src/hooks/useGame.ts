import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// SKEMIND - MASTERMIND CLÁSSICO
// ═══════════════════════════════════════════════════════════════════════════
//
// INVARIANTES ABSOLUTOS:
// 1. O secret é gerado APENAS em startNewRound() via useRef
// 2. O secretRef.current é IMUTÁVEL durante toda a rodada
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
 * ALGORITMO MASTERMIND CLÁSSICO - 2 PASSES
 * 
 * PASSO 1 (exatos): Para cada posição i, se guess[i] === secret[i], 
 *   conta WHITE++ e marca ambos como usados.
 * 
 * PASSO 2 (parciais): Para cada posição i do guess ainda não usada,
 *   procura um índice j ainda não usado do secret com o mesmo símbolo.
 *   Se achar, conta GRAY++ e marca secret[j] como usado.
 * 
 * Retorna: { correctPosition: whites, correctSymbol: grays }
 * 
 * NUNCA conta um símbolo duas vezes.
 */
export function calculateFeedback(
  secret: GameSymbol[],
  guess: GameSymbol[]
): { correctPosition: number; correctSymbol: number } {
  // Cria cópias para marcar como "usado" sem mutar originais
  const secretUsed: boolean[] = [false, false, false, false];
  const guessUsed: boolean[] = [false, false, false, false];
  
  let whites = 0; // Exatos (posição correta)
  let grays = 0;  // Parciais (posição errada)
  
  // PASSO 1: Acertos EXATOS (mesma posição)
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guess[i].id === secret[i].id) {
      whites++;
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
        grays++;
        secretUsed[j] = true;
        break; // Importante: só conta uma vez por símbolo do guess
      }
    }
  }
  
  return { correctPosition: whites, correctSymbol: grays };
}

// ─────────────────────────────────────────────────────────────────────────────
// SELF-TESTS (executados apenas em modo debug)
// ─────────────────────────────────────────────────────────────────────────────

interface TestCase {
  name: string;
  secret: string[];
  guess: string[];
  expectedWhites: number;
  expectedGrays: number;
}

function createSymbol(id: string): GameSymbol {
  return { id, color: '#000', shape: 'circle' };
}

function runSelfTests(): void {
  const testCases: TestCase[] = [
    // 1) Todos corretos
    {
      name: 'All correct',
      secret: ['A', 'B', 'C', 'D'],
      guess: ['A', 'B', 'C', 'D'],
      expectedWhites: 4,
      expectedGrays: 0,
    },
    // 2) Todos trocados
    {
      name: 'All swapped',
      secret: ['A', 'B', 'C', 'D'],
      guess: ['D', 'C', 'B', 'A'],
      expectedWhites: 0,
      expectedGrays: 4,
    },
    // 3) Duplicados: secret [A,A,B,C], guess [A,B,A,A] => whites 1, grays 2
    {
      name: 'Duplicates case 1',
      secret: ['A', 'A', 'B', 'C'],
      guess: ['A', 'B', 'A', 'A'],
      expectedWhites: 1, // A na pos 0
      expectedGrays: 2,  // B (pos 1 guess -> pos 2 secret), A (pos 2 guess -> pos 1 secret)
    },
    // 4) Duplicados: secret [A,B,B,B], guess [B,B,B,A] => whites 2, grays 2
    {
      name: 'Duplicates case 2',
      secret: ['A', 'B', 'B', 'B'],
      guess: ['B', 'B', 'B', 'A'],
      expectedWhites: 2, // B na pos 1 e pos 2
      expectedGrays: 2,  // B na pos 0 guess -> pos 3 secret, A na pos 3 guess -> pos 0 secret
    },
    // 5) Nenhum acerto
    {
      name: 'No matches',
      secret: ['A', 'B', 'C', 'D'],
      guess: ['E', 'E', 'E', 'E'],
      expectedWhites: 0,
      expectedGrays: 0,
    },
    // 6) Misto: secret [A,B,C,A], guess [A,A,B,C] => whites 1, grays 3
    {
      name: 'Mixed case',
      secret: ['A', 'B', 'C', 'A'],
      guess: ['A', 'A', 'B', 'C'],
      expectedWhites: 1, // A na pos 0
      expectedGrays: 3,  // A na pos 1 guess -> pos 3 secret, B na pos 2 guess -> pos 1 secret, C na pos 3 guess -> pos 2 secret
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
    
    const ok = result.correctPosition === tc.expectedWhites && 
               result.correctSymbol === tc.expectedGrays;
    
    if (ok) {
      console.log(`✅ PASS: ${tc.name}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${tc.name}`);
      console.log(`   Secret: [${tc.secret.join(',')}], Guess: [${tc.guess.join(',')}]`);
      console.log(`   Expected: whites=${tc.expectedWhites}, grays=${tc.expectedGrays}`);
      console.log(`   Got:      whites=${result.correctPosition}, grays=${result.correctSymbol}`);
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
  // ═══════════════════════════════════════════════════════════════════════════
  const secretRef = useRef<GameSymbol[]>(generateSecret());
  const roundIdRef = useRef<string>(generateRoundId());
  
  // Estado mutável (NÃO inclui o secret para evitar regeneração)
  const [status, setStatus] = useState<GameStatus>('playing');
  const [attempts, setAttempts] = useState(0);
  const [history, setHistory] = useState<AttemptResult[]>([]);
  const [currentGuess, setCurrentGuess] = useState<GuessSlot[]>([null, null, null, null]);
  const [remainingSeconds, setRemainingSeconds] = useState(ROUND_DURATION_SECONDS);
  
  // Timer reference
  const timerRef = useRef<number | null>(null);
  
  // Debug mode
  const debugMode = useMemo(() => isDebugMode(), []);

  // Executa self-tests em modo debug (apenas uma vez)
  useEffect(() => {
    if (debugMode) {
      runSelfTests();
      console.log('🔐 Current Secret:', secretRef.current.map(s => s.id));
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
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setStatus('defeat');
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
  }, [status, roundIdRef.current]);

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
    
    // Gera NOVO secret e round ID
    secretRef.current = generateSecret();
    roundIdRef.current = generateRoundId();
    
    // Reset de todo o estado
    setStatus('playing');
    setAttempts(0);
    setHistory([]);
    setCurrentGuess([null, null, null, null]);
    setRemainingSeconds(ROUND_DURATION_SECONDS);
    
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
  // ───────────────────────────────────────────────────────────────────────────
  const submitGuess = useCallback(() => {
    if (status !== 'playing') return;
    if (currentGuess.includes(null)) return;
    
    const guess = currentGuess as GameSymbol[];
    const secret = secretRef.current; // Usa o secret do ref (IMUTÁVEL)
    
    const feedback = calculateFeedback(secret, guess);
    
    // Log debug
    if (isDebugMode()) {
      console.log('📝 Guess:', guess.map(s => s.id));
      console.log('🔐 Secret:', secret.map(s => s.id));
      console.log('📊 Feedback:', `whites=${feedback.correctPosition}, grays=${feedback.correctSymbol}`);
    }
    
    const newAttempts = attempts + 1;
    const newHistoryEntry: AttemptResult = {
      guess: [...guess],
      correctPosition: feedback.correctPosition,
      correctSymbol: feedback.correctSymbol,
    };
    
    setHistory(prev => [newHistoryEntry, ...prev]);
    setAttempts(newAttempts);
    setCurrentGuess([null, null, null, null]);
    
    // Vitória: todos os 4 corretos
    if (feedback.correctPosition === CODE_LENGTH) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStatus('victory');
      return;
    }
    
    // Derrota: 8 tentativas esgotadas
    if (newAttempts >= MAX_ATTEMPTS) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStatus('defeat');
      return;
    }
  }, [status, currentGuess, attempts]);

  // ───────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ───────────────────────────────────────────────────────────────────────────
  return {
    // Estado derivado para UI
    state: {
      roundId: roundIdRef.current,
      guess: currentGuess,
      attempts,
      history,
      score: status === 'victory' ? 1000 : 0,
      remainingSeconds,
      gameStatus: status,
    } as GameState,
    
    // Secret para reveal no fim (ou debug)
    secretCode: secretRef.current,
    
    // Debug mode flag
    debugMode,
    
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
