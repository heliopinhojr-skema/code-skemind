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

import { useCallback, useRef, useState } from 'react';
import {
  CODE_LENGTH,
  MAX_ATTEMPTS,
  SYMBOLS,
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

  const attempts = history.length;

  // ==================== AÇÕES ====================

  /**
   * Inicia novo jogo
   * - Gera código secreto único
   * - Reseta estado
   */
  const startGame = useCallback(() => {
    const secret = generateSecret();
    secretRef.current = [...secret]; // Cópia para garantir imutabilidade
    
    setStatus('playing');
    setHistory([]);
    setCurrentGuess([null, null, null, null]);
  }, []);

  /**
   * Volta para tela inicial
   */
  const newGame = useCallback(() => {
    secretRef.current = null;
    setStatus('notStarted');
    setHistory([]);
    setCurrentGuess([null, null, null, null]);
  }, []);

  /**
   * Seleciona símbolo para o palpite
   * - Bloqueia duplicados
   * - Preenche próximo slot vazio
   */
  const selectSymbol = useCallback((symbol: GameSymbol) => {
    if (status !== 'playing') return;

    setCurrentGuess(prev => {
      // Bloqueia se símbolo já está no palpite
      if (prev.some(s => s?.id === symbol.id)) return prev;

      // Encontra próximo slot vazio
      const emptyIndex = prev.findIndex(s => s === null);
      if (emptyIndex === -1) return prev;

      // Retorna nova array com símbolo inserido
      const next = [...prev];
      next[emptyIndex] = { ...symbol };
      return next;
    });
  }, [status]);

  /**
   * Limpa slot específico
   */
  const clearSlot = useCallback((index: number) => {
    if (status !== 'playing') return;
    if (index < 0 || index >= CODE_LENGTH) return;

    setCurrentGuess(prev => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }, [status]);

  /**
   * Envia palpite
   * - Valida 4 símbolos únicos
   * - Calcula feedback
   * - Atualiza histórico
   * - Verifica vitória/derrota
   */
  const submit = useCallback(() => {
    // Validações de estado
    if (status !== 'playing') return;
    if (!secretRef.current) return;
    if (attempts >= MAX_ATTEMPTS) return;

    // Extrai IDs do palpite
    const filledGuess = currentGuess.filter((s): s is GameSymbol => s !== null);
    if (filledGuess.length !== CODE_LENGTH) return;

    const guessIds = filledGuess.map(s => s.id);

    // Valida palpite (4 símbolos únicos)
    if (!isValidGuess(guessIds)) return;

    // Calcula feedback usando cópia do segredo
    const secretCopy = [...secretRef.current];
    const result = evaluateGuess(secretCopy, guessIds);

    // Cria entrada no histórico com ID único
    const entry: AttemptResult = {
      id: crypto.randomUUID(),
      guess: [...guessIds],
      whites: result.whites,
      grays: result.grays,
    };

    // Atualiza histórico (mais recente primeiro)
    const nextHistory = [entry, ...history];
    setHistory(nextHistory);

    // Verifica vitória (4 brancos)
    if (result.whites === CODE_LENGTH) {
      setStatus('won');
      return;
    }

    // Verifica derrota (8 tentativas)
    if (nextHistory.length >= MAX_ATTEMPTS) {
      setStatus('lost');
      return;
    }

    // Limpa palpite para próxima tentativa
    setCurrentGuess([null, null, null, null]);
  }, [status, attempts, currentGuess, history]);

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
