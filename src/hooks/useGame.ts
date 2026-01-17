/**
 * useGame - Hook do SKEMIND
 * 
 * REGRAS:
 * - Jogo só começa ao clicar "Iniciar Jogo"
 * - Código secreto: 4 símbolos únicos, fixo até fim da rodada
 * - Palpite: 4 símbolos únicos (bloqueia duplicados)
 * - Feedback: brancos (posição certa) + cinzas (posição errada)
 * - Vitória: 4 brancos
 * - Derrota: 8 tentativas
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
  guess: string[];
  whites: number;
  grays: number;
}

export interface GameState {
  status: GameStatus;
  attempts: number;
  currentGuess: GuessSlot[];
  history: AttemptResult[];
}

// ==================== CONSTANTES UI ====================

export const UI_SYMBOLS: readonly GameSymbol[] = [
  { id: 'circle', color: '#E53935', shape: 'circle' },
  { id: 'square', color: '#1E88E5', shape: 'square' },
  { id: 'triangle', color: '#43A047', shape: 'triangle' },
  { id: 'diamond', color: '#FDD835', shape: 'diamond' },
  { id: 'star', color: '#8E24AA', shape: 'star' },
  { id: 'hexagon', color: '#00BCD4', shape: 'hexagon' },
] as const;

// ==================== HOOK ====================

export function useGame() {
  // Código secreto armazenado em ref (não muda durante a rodada)
  const secretRef = useRef<string[] | null>(null);

  // Estados do jogo
  const [status, setStatus] = useState<GameStatus>('notStarted');
  const [history, setHistory] = useState<AttemptResult[]>([]);
  const [currentGuess, setCurrentGuess] = useState<GuessSlot[]>([null, null, null, null]);

  // Mantém o palpite mais recente disponível de forma síncrona
  // (evita depender de timing de render/batching para calcular feedback)
  const currentGuessRef = useRef<GuessSlot[]>([null, null, null, null]);

  // Evita submit duplo (double-click) no mesmo frame
  const submitLockRef = useRef(false);

  const attempts = history.length;

  // Mantém histórico mais recente disponível de forma síncrona
  // (evita depender de timing de render/batching)
  const historyRef = useRef<AttemptResult[]>([]);

  // Detecta qualquer mudança inesperada do secret durante a rodada
  const secretInvariantRef = useRef<string | null>(null);

  useEffect(() => {
    // mantém historyRef alinhado com o estado (blindagem)
    historyRef.current = Array.isArray(history) ? history : [];
  }, [history]);

  useEffect(() => {
    const key = Array.isArray(secretRef.current) ? secretRef.current.join('|') : null;

    if (secretInvariantRef.current && key && secretInvariantRef.current !== key) {
      const errorMsg = `[SKEMIND] SECRET_CHANGED_UNEXPECTEDLY: prev=${secretInvariantRef.current} next=${key} status=${status}`;
      console.error(errorMsg);

      // DEV ONLY: dispara erro para parar exatamente no ponto do bug
      if (import.meta.env.DEV) {
        throw new Error(errorMsg);
      }
    }

    secretInvariantRef.current = key;
  }, [status, history.length]);

  // ==================== AÇÕES ====================

  /**
   * Inicia novo jogo
   * - Gera código secreto único
   * - Reseta estado
   */
  const startGame = useCallback(() => {
    // Blindagem: evita gerar outro secret por clique duplo antes do React re-renderizar
    if (secretRef.current) return;

    const secret = generateSecret(UI_SYMBOLS.map(s => s.id));
    secretRef.current = [...secret]; // imutável

    const cleared: GuessSlot[] = [null, null, null, null];
    currentGuessRef.current = cleared;
    historyRef.current = [];

    setStatus('playing');
    setHistory([]);
    setCurrentGuess(cleared);
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
  }, []);

  /**
   * Seleciona símbolo para o palpite
   * - Bloqueia duplicados
   * - Preenche próximo slot vazio
   *
   * IMPORTANTE: atualiza o ref de forma síncrona (sem depender do timing do React)
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
   * Limpa slot específico (síncrono via ref)
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
   * - Valida 4 símbolos únicos
   * - Calcula feedback
   * - Atualiza histórico
   * - Verifica vitória/derrota
   */
  const submit = useCallback(() => {
    if (status !== 'playing') return;
    if (!secretRef.current) return;

    // Bloqueia double-click / double submit no mesmo tick
    if (submitLockRef.current) return;
    submitLockRef.current = true;

    try {
      // snapshots IMEDIATOS (nunca usar state direto para avaliar)
      const guessSnapshot: GuessSlot[] = currentGuessRef.current.map(s => (s ? { ...s } : null));
      const secretSnapshot: string[] = [...secretRef.current];

      // precisa estar completo (4 slots) e sem repetição
      if (guessSnapshot.some(s => s === null)) return;
      const guessIds = guessSnapshot.map(s => (s as GameSymbol).id);
      if (!isValidGuess(guessIds)) return;

      // limite de tentativas (sincrono via ref)
      const attemptsBefore = historyRef.current.length;
      if (attemptsBefore >= MAX_ATTEMPTS) return;

      // feedback 100% puro: apenas secret fixo + palpite daquele clique
      const result = evaluateGuess(secretSnapshot, [...guessIds]);

      const entry: AttemptResult = {
        id: crypto.randomUUID(),
        guess: [...guessIds],
        whites: result.whites,
        grays: result.grays,
      };

      const nextHistory = [entry, ...historyRef.current];
      historyRef.current = nextHistory;
      setHistory(nextHistory);

      // vitória/derrota
      if (result.whites === CODE_LENGTH) {
        setStatus('won');
        return;
      }

      if (attemptsBefore + 1 >= MAX_ATTEMPTS) {
        setStatus('lost');
        return;
      }

      // próxima tentativa
      const cleared: GuessSlot[] = [null, null, null, null];
      currentGuessRef.current = cleared;
      setCurrentGuess(cleared);
    } finally {
      submitLockRef.current = false;
    }
  }, [status]);

  // ==================== DADOS DERIVADOS ====================

  // Converte código secreto para símbolos UI (para exibir na derrota)
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
    },
    secretCode,
  };
}

export { CODE_LENGTH, MAX_ATTEMPTS };
