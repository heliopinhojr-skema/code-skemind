import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// SKEMIND - MASTERMIND CLÁSSICO (REENGENHEIRADO DO ZERO)
// ═══════════════════════════════════════════════════════════════════════════
//
// INVARIANTES MATEMÁTICOS:
// 1. O secret é gerado UMA ÚNICA VEZ em startNewRound()
// 2. O secret é armazenado em useRef e NUNCA muda durante a rodada
// 3. DUPLICATAS SÃO PERMITIDAS no secret (sorteio independente por posição)
// 4. O feedback segue o algoritmo clássico do Mastermind (2 passes)
// 5. Nenhum símbolo é contado duas vezes no feedback
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

export type GameStatus = 'notStarted' | 'playing' | 'won' | 'lost';

export type GuessSlot = GameSymbol | null;

export interface Feedback {
  exact: number;   // Pinos brancos (posição correta)
  present: number; // Pinos cinzas (posição errada)
}

export interface AttemptResult {
  guess: GameSymbol[];
  feedback: Feedback;
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
 * Retorna um símbolo aleatório do pool.
 * Cada chamada é independente (permite duplicatas).
 */
function randomSymbol(): GameSymbol {
  const index = Math.floor(Math.random() * SYMBOLS.length);
  return SYMBOLS[index];
}

/**
 * Gera código secreto com 4 símbolos.
 * SORTEIO INDEPENDENTE para cada posição - DUPLICATAS SÃO PERMITIDAS.
 * 
 * CHAMADO APENAS POR startNewRound()
 */
function generateSecret(): GameSymbol[] {
  return [
    randomSymbol(),
    randomSymbol(),
    randomSymbol(),
    randomSymbol(),
  ];
}

/**
 * ALGORITMO MASTERMIND CLÁSSICO - 2 PASSES
 * 
 * Implementação matematicamente idêntica ao Mastermind original.
 * 
 * PASSO 1 (EXATOS - Pinos Brancos):
 *   Para cada posição i, se guess[i] === secret[i]:
 *   - Incrementa exact
 *   - Marca posição como usada em ambos os arrays
 * 
 * PASSO 2 (PARCIAIS - Pinos Cinzas):
 *   Para cada posição i do guess ainda não usada:
 *   - Procura um símbolo igual em posição j do secret ainda não usada
 *   - Se encontrar, incrementa present e marca j como usada
 * 
 * GARANTIAS:
 * - Nenhum símbolo é contado duas vezes
 * - exact + present <= CODE_LENGTH
 * - Feedback não revela posições específicas
 */
export function calculateFeedback(
  secret: GameSymbol[],
  guess: GameSymbol[]
): Feedback {
  // Arrays para marcar posições já usadas (não mutam os originais)
  const secretUsed: boolean[] = [false, false, false, false];
  const guessUsed: boolean[] = [false, false, false, false];
  
  let exact = 0;   // Pinos brancos
  let present = 0; // Pinos cinzas
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PASSO 1: Contar acertos EXATOS (mesma posição)
  // ═══════════════════════════════════════════════════════════════════════════
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guess[i].id === secret[i].id) {
      exact++;
      secretUsed[i] = true;
      guessUsed[i] = true;
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // PASSO 2: Contar acertos PARCIAIS (posição diferente)
  // ═══════════════════════════════════════════════════════════════════════════
  for (let i = 0; i < CODE_LENGTH; i++) {
    // Pular posições já contadas como exatas
    if (guessUsed[i]) continue;
    
    // Procurar símbolo igual em posição não usada do secret
    for (let j = 0; j < CODE_LENGTH; j++) {
      if (secretUsed[j]) continue;
      
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
// GAME HOOK
// ─────────────────────────────────────────────────────────────────────────────

export function useGame() {
  // ═══════════════════════════════════════════════════════════════════════════
  // SECRET TRAVADO COM useRef
  // 
  // O secret é armazenado em useRef para garantir que:
  // 1. Não é regenerado em re-renders
  // 2. Não é regenerado em effects
  // 3. Não é regenerado em submits
  // 4. Só muda em startNewRound()
  // 
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
  
  // Debug mode (memoizado)
  const debugMode = useMemo(() => isDebugMode(), []);

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
          setStatus('lost');
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
  // 
  // ÚNICO ponto onde o secret é gerado.
  // ───────────────────────────────────────────────────────────────────────────
  const startNewRound = useCallback(() => {
    // Limpa timer existente
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // GERA NOVO SECRET (COM DUPLICATAS PERMITIDAS)
    // Este é o ÚNICO lugar onde o secret é criado/modificado
    // ═══════════════════════════════════════════════════════════════════════
    const newSecret = generateSecret();
    secretRef.current = newSecret;
    
    // Reset de todo o estado
    setStatus('playing');
    setHistory([]);
    setCurrentGuess([null, null, null, null]);
    setTimeLeft(ROUND_DURATION_SECONDS);
    
    // Log debug
    if (isDebugMode()) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔄 NOVA RODADA INICIADA');
      console.log('🔐 SECRET GERADO:', newSecret.map(s => s.id));
      console.log('═══════════════════════════════════════════════════════');
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
  // 
  // Compara contra o secret IMUTÁVEL armazenado em secretRef.
  // O feedback é calculado UMA VEZ e armazenado no histórico (congelado).
  // ───────────────────────────────────────────────────────────────────────────
  const submitGuess = useCallback(() => {
    // ═══════════════════════════════════════════════════════════════════════
    // VALIDAÇÕES
    // ═══════════════════════════════════════════════════════════════════════
    if (status !== 'playing') return;
    if (currentGuess.includes(null)) return;
    if (!secretRef.current) return;
    if (history.length >= MAX_ATTEMPTS) return;
    if (timeLeft <= 0) return;
    
    const guess = currentGuess as GameSymbol[];
    const secret = secretRef.current; // Referência IMUTÁVEL
    
    // ═══════════════════════════════════════════════════════════════════════
    // CALCULA FEEDBACK (UMA VEZ, CONGELADO)
    // ═══════════════════════════════════════════════════════════════════════
    const feedback = calculateFeedback(secret, guess);
    
    // Log debug
    if (isDebugMode()) {
      console.log('───────────────────────────────────────────────────────');
      console.log('📝 PALPITE:', guess.map(s => s.id));
      console.log('🔐 SECRET:', secret.map(s => s.id));
      console.log('📊 FEEDBACK:', `exact=${feedback.exact}, present=${feedback.present}`);
      console.log('───────────────────────────────────────────────────────');
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
    
    // ═══════════════════════════════════════════════════════════════════════
    // VERIFICA VITÓRIA: todos os 4 na posição correta
    // ═══════════════════════════════════════════════════════════════════════
    if (feedback.exact === CODE_LENGTH) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStatus('won');
      
      if (isDebugMode()) {
        console.log('🎉 VITÓRIA! Código descoberto.');
      }
      return;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // VERIFICA DERROTA: 8 tentativas esgotadas
    // ═══════════════════════════════════════════════════════════════════════
    if (newHistory.length >= MAX_ATTEMPTS) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStatus('lost');
      
      if (isDebugMode()) {
        console.log('💔 DERROTA! Tentativas esgotadas.');
        console.log('🔐 O código era:', secret.map(s => s.id));
      }
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
    
    // Secret para reveal no final (ou debug)
    // Retorna array vazio se não iniciado (proteção)
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
