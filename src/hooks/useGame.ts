/**
 * useGame — SKEMIND (Mastermind) hook simplificado
 */

import { useCallback, useRef, useState } from "react";

import {
  CODE_LENGTH,
  SYMBOLS as ENGINE_SYMBOLS,
  evaluateGuess,
  generateSecret,
  type Symbol as EngineSymbol,
} from "@/lib/mastermindEngine";

export type GameStatus = 'notStarted' | 'playing' | 'won' | 'lost';

export interface GameSymbol {
  id: string;
  color: string;
  shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'hexagon';
}

export type GuessSlot = GameSymbol | null;

export interface AttemptResult {
  guess: string[];
  whites: number;  // exact matches
  blacks: number;  // present but wrong position
}

export interface GameState {
  status: GameStatus;
  attempts: number;
  currentGuess: GuessSlot[];
  history: AttemptResult[];
}

export { CODE_LENGTH };
export const MAX_ATTEMPTS = 8;

export const SYMBOLS: readonly GameSymbol[] = [
  { id: 'circle', color: '#E53935', shape: 'circle' },
  { id: 'square', color: '#1E88E5', shape: 'square' },
  { id: 'triangle', color: '#43A047', shape: 'triangle' },
  { id: 'diamond', color: '#FDD835', shape: 'diamond' },
  { id: 'star', color: '#8E24AA', shape: 'star' },
  { id: 'hexagon', color: '#00BCD4', shape: 'hexagon' },
] as const;

function engineToUiSymbol(sym: EngineSymbol): GameSymbol {
  const found = SYMBOLS.find(s => s.id === sym.id);
  return found ?? { id: sym.id, color: sym.color, shape: 'circle' };
}

function uiToEngineSymbol(sym: GameSymbol): EngineSymbol {
  const found = ENGINE_SYMBOLS.find(s => s.id === sym.id);
  return found ?? { id: sym.id, label: sym.id.charAt(0).toUpperCase(), color: sym.color };
}

export function useGame() {
  // Debug mode simples
  const debugMode = typeof window !== 'undefined' && 
    new URLSearchParams(window.location.search).get('debug') === '1';

  // Secret fixo durante a partida
  const secretRef = useRef<EngineSymbol[] | null>(null);

  const [status, setStatus] = useState<GameStatus>('notStarted');
  const [history, setHistory] = useState<AttemptResult[]>([]);
  const [currentGuess, setCurrentGuess] = useState<GuessSlot[]>([null, null, null, null]);

  const attempts = history.length;

  const startGame = useCallback(() => {
    const secret = generateSecret();
    secretRef.current = secret;
    setStatus('playing');
    setHistory([]);
    setCurrentGuess([null, null, null, null]);
    
    // eslint-disable-next-line no-console
    console.log('[GAME] Secret gerado:', secret.map(s => s.id));
  }, []);

  const newGame = useCallback(() => {
    secretRef.current = null;
    setStatus('notStarted');
    setHistory([]);
    setCurrentGuess([null, null, null, null]);
  }, []);

  const selectSymbol = useCallback((symbol: GameSymbol) => {
    if (status !== 'playing') return;

    setCurrentGuess(prev => {
      // Não permitir duplicação
      if (prev.some(s => s?.id === symbol.id)) return prev;

      const next = [...prev];
      const emptyIndex = next.findIndex(s => s === null);
      if (emptyIndex === -1) return prev;
      next[emptyIndex] = symbol;
      return next;
    });
  }, [status]);

  const clearSlot = useCallback((index: number) => {
    if (status !== 'playing') return;
    setCurrentGuess(prev => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
  }, [status]);

  const submit = useCallback(() => {
    if (status !== 'playing') return;
    if (!secretRef.current) return;
    if (attempts >= MAX_ATTEMPTS) return;

    // Verificar se palpite está completo (4 símbolos distintos)
    const filledGuess = currentGuess.filter((s): s is GameSymbol => s !== null);
    if (filledGuess.length !== CODE_LENGTH) return;
    
    const ids = filledGuess.map(s => s.id);
    if (new Set(ids).size !== CODE_LENGTH) return;

    // Converter para engine symbols e avaliar
    const engineGuess = filledGuess.map(uiToEngineSymbol);
    const result = evaluateGuess(secretRef.current, engineGuess);

    // eslint-disable-next-line no-console
    console.log('[GAME] Avaliação:', {
      secret: secretRef.current.map(s => s.id),
      guess: ids,
      whites: result.feedback.exact,
      blacks: result.feedback.present,
    });

    // Adicionar ao histórico
    const entry: AttemptResult = {
      guess: ids,
      whites: result.feedback.exact,
      blacks: result.feedback.present,
    };

    const nextHistory = [entry, ...history];
    setHistory(nextHistory);

    if (result.isVictory) {
      setStatus('won');
      return;
    }

    if (nextHistory.length >= MAX_ATTEMPTS) {
      setStatus('lost');
      return;
    }

    // Limpar para próximo palpite
    setCurrentGuess([null, null, null, null]);
  }, [attempts, currentGuess, history, status]);

  // Secret para exibição (UI)
  const secretCode: GameSymbol[] = secretRef.current 
    ? secretRef.current.map(engineToUiSymbol) 
    : [];

  const state: GameState = {
    status,
    attempts,
    currentGuess,
    history,
  };

  return {
    state,
    actions: { startGame, newGame, selectSymbol, clearSlot, submit },
    constants: { CODE_LENGTH, MAX_ATTEMPTS, SYMBOLS },
    secretCode,
    debugMode,
  };
}
