/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SKEMIND - HOOK DO JOGO MASTERMIND
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Este hook gerencia o estado do jogo e usa a engine pura de src/lib/mastermindEngine.ts
 * 
 * REGRAS OBRIGATÓRIAS:
 * 1. Jogo SÓ começa ao clicar "Iniciar Jogo"
 * 2. Secret é gerado UMA VEZ e travado com useRef
 * 3. Secret NÃO muda até vitória/derrota/nova rodada
 * 4. Secret tem 4 símbolos SEM REPETIÇÃO
 * 5. Palpite deve ter 4 símbolos para ser enviado
 * 6. Feedback segue algoritmo Mastermind clássico (2 passes)
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  generateSecret,
  evaluateGuess,
  Symbol,
  Feedback,
  SYMBOLS as ENGINE_SYMBOLS,
  CODE_LENGTH,
} from '@/lib/mastermindEngine';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS EXPORTADOS (compatível com UI existente)
// ─────────────────────────────────────────────────────────────────────────────

export interface GameSymbol {
  id: string;
  color: string;
  shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'star' | 'hexagon';
}

export type GameStatus = 'notStarted' | 'playing' | 'won' | 'lost';

export type GuessSlot = GameSymbol | null;

export type { Feedback };

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
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────

// Símbolos do jogo (mesma ordem da engine, com shapes para UI)
export const SYMBOLS: GameSymbol[] = [
  { id: 'circle', color: '#E53935', shape: 'circle' },     // círculo vermelho
  { id: 'square', color: '#1E88E5', shape: 'square' },     // quadrado azul
  { id: 'triangle', color: '#43A047', shape: 'triangle' }, // triângulo verde
  { id: 'diamond', color: '#FDD835', shape: 'diamond' },   // losango amarelo
  { id: 'star', color: '#8E24AA', shape: 'star' },         // estrela roxa
  { id: 'hexagon', color: '#00BCD4', shape: 'hexagon' },   // hexágono ciano
];

export const MAX_ATTEMPTS = 8;
export { CODE_LENGTH };
export const ROUND_DURATION_SECONDS = 180;

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÕES AUXILIARES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detecta modo debug via query param
 */
function isDebugMode(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('debug') === '1';
}

/**
 * Converte Symbol da engine para GameSymbol da UI
 */
function engineSymbolToGameSymbol(sym: Symbol): GameSymbol {
  const uiSymbol = SYMBOLS.find(s => s.id === sym.id);
  if (uiSymbol) return uiSymbol;
  
  // Fallback (não deve acontecer)
  return {
    id: sym.id,
    color: sym.color,
    shape: 'circle',
  };
}

/**
 * Converte GameSymbol para Symbol da engine
 */
function gameSymbolToEngineSymbol(sym: GameSymbol): Symbol {
  const engineSym = ENGINE_SYMBOLS.find(s => s.id === sym.id);
  if (engineSym) return engineSym;
  
  // Fallback
  return {
    id: sym.id,
    label: sym.id.charAt(0).toUpperCase(),
    color: sym.color,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// HOOK PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export function useGame() {
  // ═══════════════════════════════════════════════════════════════════════════
  // SECRET TRAVADO COM useRef
  // 
  // - Inicializa como NULL (jogo não começou)
  // - Gerado APENAS em startNewRound()
  // - NUNCA muda durante a rodada
  // ═══════════════════════════════════════════════════════════════════════════
  const secretRef = useRef<Symbol[] | null>(null);
  
  // Estado do jogo
  const [status, setStatus] = useState<GameStatus>('notStarted');
  const [history, setHistory] = useState<AttemptResult[]>([]);
  const [currentGuess, setCurrentGuess] = useState<GuessSlot[]>([null, null, null, null]);
  const [timeLeft, setTimeLeft] = useState(ROUND_DURATION_SECONDS);
  
  // Timer reference
  const timerRef = useRef<number | null>(null);
  
  // Debug mode (memoizado para não recalcular)
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
    // GERA NOVO SECRET usando a engine pura
    // Este é o ÚNICO lugar onde o secret é criado
    // ═══════════════════════════════════════════════════════════════════════
    const newSecret = generateSecret();
    secretRef.current = newSecret;
    
    // Reset de todo o estado
    setStatus('playing');
    setHistory([]);
    setCurrentGuess([null, null, null, null]);
    setTimeLeft(ROUND_DURATION_SECONDS);
    
    // Debug log
    if (debugMode) {
      console.log('═══════════════════════════════════════════════════════');
      console.log('🔄 NOVA RODADA INICIADA');
      console.log('🔐 SECRET GERADO:', newSecret.map(s => s.id));
      console.log('═══════════════════════════════════════════════════════');
    }
  }, [debugMode]);

  // ───────────────────────────────────────────────────────────────────────────
  // ACTION: Select Symbol
  // 
  // REGRA: Símbolos NÃO podem se repetir no palpite
  // ───────────────────────────────────────────────────────────────────────────
  const selectSymbol = useCallback((symbol: GameSymbol) => {
    if (status !== 'playing') return;
    
    setCurrentGuess(prev => {
      // VALIDAÇÃO: Impede símbolo repetido no palpite
      const alreadyUsed = prev.some(slot => slot !== null && slot.id === symbol.id);
      if (alreadyUsed) {
        return prev; // Não adiciona se já está no palpite
      }
      
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
  // Usa a engine pura para avaliar o palpite
  // ───────────────────────────────────────────────────────────────────────────
  const submitGuess = useCallback(() => {
    // ═══════════════════════════════════════════════════════════════════════
    // VALIDAÇÕES
    // ═══════════════════════════════════════════════════════════════════════
    if (status !== 'playing') return;
    if (currentGuess.includes(null)) return; // Palpite deve estar completo
    if (!secretRef.current) return; // Secret deve existir
    if (history.length >= MAX_ATTEMPTS) return;
    if (timeLeft <= 0) return;
    
    const guess = currentGuess as GameSymbol[];
    const secret = secretRef.current; // Referência IMUTÁVEL
    
    // Converte para formato da engine
    const engineGuess = guess.map(gameSymbolToEngineSymbol);
    
    // ═══════════════════════════════════════════════════════════════════════
    // AVALIA O PALPITE usando a engine pura
    // ═══════════════════════════════════════════════════════════════════════
    const result = evaluateGuess(secret, engineGuess);
    
    // Debug log
    if (debugMode) {
      console.log('───────────────────────────────────────────────────────');
      console.log('📝 PALPITE:', guess.map(s => s.id));
      console.log('🔐 SECRET:', secret.map(s => s.id));
      console.log('📊 FEEDBACK:', `exact=${result.feedback.exact}, present=${result.feedback.present}`);
      console.log('🏆 VITÓRIA?:', result.isVictory);
      console.log('───────────────────────────────────────────────────────');
    }
    
    // Cria entry do histórico com feedback CONGELADO
    const newHistoryEntry: AttemptResult = {
      guess: [...guess], // Clone para segurança
      feedback: { ...result.feedback }, // Clone do feedback
    };
    
    // Adiciona ao histórico (mais recente primeiro)
    const newHistory = [newHistoryEntry, ...history];
    setHistory(newHistory);
    setCurrentGuess([null, null, null, null]);
    
    // ═══════════════════════════════════════════════════════════════════════
    // VERIFICA VITÓRIA
    // ═══════════════════════════════════════════════════════════════════════
    if (result.isVictory) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStatus('won');
      
      if (debugMode) {
        console.log('🎉 VITÓRIA! Código descoberto.');
      }
      return;
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // VERIFICA DERROTA: tentativas esgotadas
    // ═══════════════════════════════════════════════════════════════════════
    if (newHistory.length >= MAX_ATTEMPTS) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStatus('lost');
      
      if (debugMode) {
        console.log('💔 DERROTA! Tentativas esgotadas.');
        console.log('🔐 O código era:', secret.map(s => s.id));
      }
      return;
    }
  }, [status, currentGuess, history, timeLeft, debugMode]);

  // ───────────────────────────────────────────────────────────────────────────
  // SECRET CODE para UI (convertido para GameSymbol)
  // ───────────────────────────────────────────────────────────────────────────
  const secretCode = useMemo(() => {
    if (!secretRef.current) return [];
    return secretRef.current.map(engineSymbolToGameSymbol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]); // Recalcula quando status muda (secret só muda em startNewRound)

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
    secretCode,
    
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

// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORT para testes (funções da engine)
// ─────────────────────────────────────────────────────────────────────────────
export { evaluateGuess as calculateFeedback, generateSecret as generateSecretForTest } from '@/lib/mastermindEngine';
