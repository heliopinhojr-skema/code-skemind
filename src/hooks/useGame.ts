/**
 * useGame - Hook do SKEMIND
 * 
 * REGRAS:
 * - Jogo só começa ao clicar "Iniciar Jogo"
 * - Código secreto: 4 símbolos únicos, fixo até fim da rodada
 * - Palpite: 4 símbolos únicos (bloqueia duplicados)
 * - Feedback: brancos (posição certa) + cinzas (posição errada)
 * - Vitória: 4 brancos
 * - Derrota: tempo zera
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CODE_LENGTH,
  MAX_ATTEMPTS,
  generateSecret,
  evaluateGuess,
  getSymbolById,
  isValidGuess,
} from '@/lib/mastermindEngine';

// ==================== TIPOS ====================

export type GameStatus = 'notStarted' | 'playing' | 'won' | 'lost';

export interface GameSymbol {
  id: string;
  color: string;
  shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'hexagon';
}

export type GuessSlot = GameSymbol | null;

export interface AttemptResult {
  id: string;
  guessSnapshot: readonly string[];
  feedbackSnapshot: Readonly<{
    whites: number;
    grays: number;
  }>;
}

export interface GameState {
  status: GameStatus;
  attempts: number;
  currentGuess: GuessSlot[];
  history: AttemptResult[];
  score: number;
  timeRemaining: number;
}

// ==================== CONSTANTES ====================

export const GAME_DURATION = 180; // 3 minutos em segundos

export const UI_SYMBOLS: readonly GameSymbol[] = [
  { id: 'circle', color: '#E53935', shape: 'circle' },
  { id: 'square', color: '#1E88E5', shape: 'square' },
  { id: 'triangle', color: '#43A047', shape: 'triangle' },
  { id: 'diamond', color: '#FDD835', shape: 'diamond' },
  { id: 'star', color: '#8E24AA', shape: 'star' },
  { id: 'hexagon', color: '#00BCD4', shape: 'hexagon' },
] as const;

// Pontuação
const POINTS = {
  WHITE: 60,
  GRAY: 25,
  WIN: 1000,
  TIME_BONUS: {
    HIGH: 700,    // >120s
    MEDIUM: 500,  // 60-119s
    LOW: 300,     // 30-59s
    MINIMAL: 100, // <30s
  },
} as const;

function calculateTimeBonus(timeRemaining: number): number {
  if (timeRemaining > 120) return POINTS.TIME_BONUS.HIGH;
  if (timeRemaining >= 60) return POINTS.TIME_BONUS.MEDIUM;
  if (timeRemaining >= 30) return POINTS.TIME_BONUS.LOW;
  return POINTS.TIME_BONUS.MINIMAL;
}

// ==================== HOOK ====================

export function useGame() {
  // Código secreto armazenado em ref (não muda durante a rodada)
  const secretRef = useRef<readonly string[] | null>(null);

  // Estados do jogo
  const [status, setStatus] = useState<GameStatus>('notStarted');
  const [history, setHistory] = useState<AttemptResult[]>([]);
  const [currentGuess, setCurrentGuess] = useState<GuessSlot[]>([null, null, null, null]);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);

  // Refs para acesso síncrono
  const currentGuessRef = useRef<GuessSlot[]>([null, null, null, null]);
  const submitLockRef = useRef(false);
  const historyRef = useRef<AttemptResult[]>([]);
  const timerRef = useRef<number | null>(null);

  const attempts = history.length;

  // Sincroniza refs com estado
  useEffect(() => {
    historyRef.current = Array.isArray(history) ? history : [];
  }, [history]);

  // Timer regressivo
  useEffect(() => {
    if (status === 'playing') {
      timerRef.current = window.setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Tempo esgotado - derrota
            if (timerRef.current) clearInterval(timerRef.current);
            setStatus('lost');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  // ==================== AÇÕES ====================

  /**
   * Inicia novo jogo
   */
  const startGame = useCallback(() => {
    if (secretRef.current) return;

    const secret = generateSecret(UI_SYMBOLS.map(s => s.id));
    // Congela para impedir qualquer mutação acidental durante a rodada
    secretRef.current = Object.freeze([...secret]);

    const cleared: GuessSlot[] = [null, null, null, null];
    currentGuessRef.current = cleared;
    historyRef.current = [];

    setStatus('playing');
    setHistory([]);
    setCurrentGuess(cleared);
    setScore(0);
    setTimeRemaining(GAME_DURATION);
  }, []);

  /**
   * Volta para tela inicial
   */
  const newGame = useCallback(() => {
    secretRef.current = null;

    const cleared: GuessSlot[] = [null, null, null, null];
    currentGuessRef.current = cleared;
    historyRef.current = [];

    setStatus('notStarted');
    setHistory([]);
    setCurrentGuess(cleared);
    setScore(0);
    setTimeRemaining(GAME_DURATION);
  }, []);

  /**
   * Seleciona símbolo para o palpite
   */
  const selectSymbol = useCallback(
    (symbol: GameSymbol) => {
      if (status !== 'playing') return;

      const prev = currentGuessRef.current;

      // Bloqueia se símbolo já está no palpite
      if (prev.some(s => s?.id === symbol.id)) return;

      // Encontra próximo slot vazio
      const emptyIndex = prev.findIndex(s => s === null);
      if (emptyIndex === -1) return;

      const next = [...prev];
      next[emptyIndex] = { ...symbol };

      currentGuessRef.current = next;
      setCurrentGuess(next);
    },
    [status],
  );

  /**
   * Limpa slot específico
   */
  const clearSlot = useCallback(
    (index: number) => {
      if (status !== 'playing') return;
      if (index < 0 || index >= CODE_LENGTH) return;

      const prev = currentGuessRef.current;
      const next = [...prev];
      next[index] = null;

      currentGuessRef.current = next;
      setCurrentGuess(next);
    },
    [status],
  );

  /**
   * Envia palpite
   */
  const submit = useCallback(() => {
    if (status !== 'playing') return;
    if (!secretRef.current) return;

    // Bloqueia double-click
    if (submitLockRef.current) return;
    submitLockRef.current = true;

    try {
      const guessSnapshot: GuessSlot[] = currentGuessRef.current.map(s => (s ? { ...s } : null));
      
      // CRÍTICO: Copia o segredo de forma segura
      const secretSnapshot: string[] = [...secretRef.current];

      if (guessSnapshot.some(s => s === null)) return;
      const guessIds = guessSnapshot.map(s => (s as GameSymbol).id);
      if (!isValidGuess(guessIds)) return;

      // DEBUG: Log para verificar consistência
      console.log('=== SUBMIT DEBUG ===');
      console.log('Segredo FIXO:', secretSnapshot.join(', '));
      console.log('Palpite:', guessIds.join(', '));

      // Feedback - passa cópias para garantir imutabilidade
      const result = evaluateGuess([...secretSnapshot], [...guessIds]);
      
      console.log('Feedback:', `⚪${result.whites} ⚫${result.grays}`);
      console.log('====================');

      const entry: AttemptResult = Object.freeze({
        id: crypto.randomUUID(),
        guessSnapshot: Object.freeze([...guessIds]),
        feedbackSnapshot: Object.freeze({
          whites: result.whites,
          grays: result.grays,
        }),
      });

      // Atualiza histórico
      const nextHistory = [entry, ...historyRef.current];
      historyRef.current = nextHistory;
      setHistory(nextHistory);

      // Calcula pontos desta tentativa
      const attemptPoints = (result.whites * POINTS.WHITE) + (result.grays * POINTS.GRAY);

      // Vitória
      if (result.whites === CODE_LENGTH) {
        const timeBonus = calculateTimeBonus(timeRemaining);
        const finalScore = score + attemptPoints + POINTS.WIN + timeBonus;
        setScore(finalScore);
        setStatus('won');
        return;
      }

      // Adiciona pontos da tentativa
      setScore(prev => prev + attemptPoints);

      // Próxima tentativa
      const cleared: GuessSlot[] = [null, null, null, null];
      currentGuessRef.current = cleared;
      setCurrentGuess(cleared);
    } finally {
      submitLockRef.current = false;
    }
  }, [status, score, timeRemaining]);

  // ==================== DADOS DERIVADOS ====================

  const secretCode: GameSymbol[] = secretRef.current
    ? secretRef.current.map(id => {
        const sym = getSymbolById(id);
        return sym
          ? { id: sym.id, color: sym.color, shape: sym.id as GameSymbol['shape'] }
          : { id, color: '#888', shape: 'circle' as const };
      })
    : [];

  // ==================== RETORNO ====================

  return {
    state: {
      status,
      attempts,
      currentGuess,
      history,
      score,
      timeRemaining,
    },
    actions: {
      startGame,
      newGame,
      selectSymbol,
      clearSlot,
      submit,
    },
    constants: {
      CODE_LENGTH,
      MAX_ATTEMPTS,
      SYMBOLS: UI_SYMBOLS,
      GAME_DURATION,
    },
    secretCode,
  };
}

export { CODE_LENGTH, MAX_ATTEMPTS };
