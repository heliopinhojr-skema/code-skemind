/**
 * useGame — SKEMIND (Mastermind) reconstruído conforme especificação.
 *
 * REGRAS:
 * - Secret só é gerado ao clicar "Iniciar Jogo"
 * - Secret tem 4 símbolos distintos e não muda durante a partida
 * - Máximo 8 tentativas
 * - Feedback (branco/cinza) vem da engine com algoritmo obrigatório em 2 passos
 * - Debug panel: habilitado por ?debug=1 (SEM useMemo com deps vazias)
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
  CODE_LENGTH,
  SYMBOLS as ENGINE_SYMBOLS,
  evaluateGuess,
  generateSecret,
  type Symbol as EngineSymbol,
} from '@/lib/mastermindEngine';

export type GameStatus = 'notStarted' | 'playing' | 'won' | 'lost';

export interface GameSymbol {
  id: string;
  color: string;
  shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'hexagon';
}

export type GuessSlot = GameSymbol | null;

export interface AttemptResult {
  // obrigatório: histórico armazena APENAS ids (string[])
  guess: string[];
  // obrigatório: feedback sempre existe
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

// Símbolos disponíveis (UI)
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
  return (
    found ?? {
      id: sym.id,
      color: sym.color,
      shape: 'circle',
    }
  );
}

function uiToEngineSymbol(sym: GameSymbol): EngineSymbol {
  const found = ENGINE_SYMBOLS.find(s => s.id === sym.id);
  return (
    found ?? {
      id: sym.id,
      label: sym.id.charAt(0).toUpperCase(),
      color: sym.color,
    }
  );
}

function isDistinctCompleteGuess(guess: GuessSlot[]): guess is GameSymbol[] {
  if (guess.length !== CODE_LENGTH) return false;
  if (guess.some(s => s === null)) return false;
  const ids = guess.map(s => (s as GameSymbol).id);
  return new Set(ids).size === CODE_LENGTH;
}

export function useGame() {
  // Mantém um hook estável (evita crash de hooks em hot-reload) e lê debug do URL atual
  const location = useLocation();
  const debugMode = new URLSearchParams(location.search).get('debug') === '1';

  // Secret travado (NUNCA muda durante a partida)
  const secretRef = useRef<EngineSymbol[] | null>(null);

  const [status, setStatus] = useState<GameStatus>('notStarted');
  const [history, setHistory] = useState<AttemptResult[]>([]);
  const [currentGuess, setCurrentGuess] = useState<GuessSlot[]>([null, null, null, null]);

  const attempts = history.length;

  const startGame = useCallback(() => {
    // ÚNICO local onde o secret é gerado
    const secret = generateSecret();
    secretRef.current = secret;

    setStatus('playing');
    setHistory([]);
    setCurrentGuess([null, null, null, null]);

    if (debugMode) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG] startGame secret=', secret.map(s => s.id));
    }
  }, [debugMode]);

  const newGame = useCallback(() => {
    // Volta ao estado inicial
    secretRef.current = null;
    setStatus('notStarted');
    setHistory([]);
    setCurrentGuess([null, null, null, null]);
  }, []);

  const selectSymbol = useCallback(
    (symbol: GameSymbol) => {
      if (status !== 'playing') return;

      setCurrentGuess(prev => {
        // não permitir duplicação
        if (prev.some(s => s?.id === symbol.id)) return prev;

        const next = [...prev];
        const emptyIndex = next.findIndex(s => s === null);
        if (emptyIndex === -1) return prev;
        next[emptyIndex] = symbol;
        return next;
      });
    },
    [status],
  );

  const clearSlot = useCallback(
    (index: number) => {
      if (status !== 'playing') return;
      setCurrentGuess(prev => {
        const next = [...prev];
        next[index] = null;
        return next;
      });
    },
    [status],
  );

  const submit = useCallback(() => {
    if (status !== 'playing') return;
    if (!secretRef.current) return;
    if (attempts >= MAX_ATTEMPTS) return;

    if (!isDistinctCompleteGuess(currentGuess)) {
      if (debugMode) {
        // eslint-disable-next-line no-console
        console.warn('[DEBUG] submit bloqueado: guess incompleto ou com repetição', currentGuess);
      }
      return;
    }

    const secret = secretRef.current;
    const guess = currentGuess;

    const engineGuess = guess.map(uiToEngineSymbol);
    const result = evaluateGuess(secret, engineGuess);

    // obrigatório: histórico no formato { guess: string[], whites, blacks }
    const guessIds = (Array.isArray(guess) ? guess : []).map(s => s.id);
    const whites = Number.isFinite(result.feedback.exact) ? result.feedback.exact : 0;
    const blacks = Number.isFinite(result.feedback.present) ? result.feedback.present : 0;

    const entry: AttemptResult = {
      guess: guessIds,
      whites,
      blacks,
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

    // continua jogando
    setCurrentGuess([null, null, null, null]);

    if (debugMode) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG] submit', {
        guess: guessIds,
        secret: (Array.isArray(secret) ? secret : []).map(s => s.id),
        whites,
        blacks,
      });
    }
  }, [attempts, currentGuess, debugMode, history, status]);

  const secretCode: GameSymbol[] = useMemo(() => {
    const secret = secretRef.current;
    if (!secret) return [];
    return secret.map(engineToUiSymbol);
  }, [status]);

  const state: GameState = {
    status,
    attempts,
    currentGuess,
    history,
  };

  const actions = {
    startGame,
    newGame,
    selectSymbol,
    clearSlot,
    submit,
  };

  const constants = {
    CODE_LENGTH,
    MAX_ATTEMPTS,
    SYMBOLS,
  } as const;

  return { state, actions, constants, secretCode, debugMode };
}
