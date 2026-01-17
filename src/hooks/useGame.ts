/**
 * useGame — SKEMIND hook
 */

import { useCallback, useRef, useState } from "react";
import { CODE_LENGTH, SYMBOLS, evaluateGuess, generateSecret, getSymbolById } from "@/lib/mastermindEngine";

export type GameStatus = 'notStarted' | 'playing' | 'won' | 'lost';

export interface GameSymbol {
  id: string;
  color: string;
  shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'hexagon';
}

export type GuessSlot = GameSymbol | null;

export interface AttemptResult {
  guess: string[];
  whites: number;
  blacks: number;
}

export interface GameState {
  status: GameStatus;
  attempts: number;
  currentGuess: GuessSlot[];
  history: AttemptResult[];
}

export { CODE_LENGTH };
export const MAX_ATTEMPTS = 8;

export const UI_SYMBOLS: readonly GameSymbol[] = [
  { id: 'circle', color: '#E53935', shape: 'circle' },
  { id: 'square', color: '#1E88E5', shape: 'square' },
  { id: 'triangle', color: '#43A047', shape: 'triangle' },
  { id: 'diamond', color: '#FDD835', shape: 'diamond' },
  { id: 'star', color: '#8E24AA', shape: 'star' },
  { id: 'hexagon', color: '#00BCD4', shape: 'hexagon' },
] as const;

export { UI_SYMBOLS as SYMBOLS };

export function useGame() {
  const secretRef = useRef<string[] | null>(null);

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
    console.log('[GAME] Secret:', secret);
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

    const filledGuess = currentGuess.filter((s): s is GameSymbol => s !== null);
    if (filledGuess.length !== CODE_LENGTH) return;

    const guessIds = filledGuess.map(s => s.id);
    if (new Set(guessIds).size !== CODE_LENGTH) return;

    const result = evaluateGuess(secretRef.current, guessIds);

    // eslint-disable-next-line no-console
    console.log('[GAME] Avaliação:', {
      secret: secretRef.current,
      guess: guessIds,
      whites: result.exact,
      blacks: result.present,
    });

    const entry: AttemptResult = {
      guess: guessIds,
      whites: result.exact,
      blacks: result.present,
    };

    const nextHistory = [entry, ...history];
    setHistory(nextHistory);

    if (result.exact === CODE_LENGTH) {
      setStatus('won');
      return;
    }

    if (nextHistory.length >= MAX_ATTEMPTS) {
      setStatus('lost');
      return;
    }

    setCurrentGuess([null, null, null, null]);
  }, [attempts, currentGuess, history, status]);

  const secretCode: GameSymbol[] = secretRef.current
    ? secretRef.current.map(id => {
        const sym = getSymbolById(id);
        return sym 
          ? { id: sym.id, color: sym.color, shape: sym.id as GameSymbol['shape'] }
          : { id, color: '#888', shape: 'circle' as const };
      })
    : [];

  return {
    state: { status, attempts, currentGuess, history },
    actions: { startGame, newGame, selectSymbol, clearSlot, submit },
    constants: { CODE_LENGTH, MAX_ATTEMPTS, SYMBOLS: UI_SYMBOLS },
    secretCode,
    debugMode: false,
  };
}
