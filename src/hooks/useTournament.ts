/**
 * useTournament - Hook para gerenciar torneio de 10 jogadores
 * 
 * - 1 jogador real + 9 bots IQ80
 * - CADA jogador tem seu próprio código secreto
 * - Ranking por: vitória > tentativas > score > tempo
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { generateSecret, CODE_LENGTH, MAX_ATTEMPTS } from '@/lib/mastermindEngine';
import { createBot, simulateBotGame } from '@/lib/botAI';
import { UI_SYMBOLS, GAME_DURATION } from './useGame';

// ==================== TIPOS ====================

export interface TournamentPlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  iq?: number;
  secretCode?: string[]; // Cada jogador tem seu próprio código
}

export interface TournamentResult {
  playerId: string;
  rank: number;
  status: 'won' | 'lost' | 'playing' | 'waiting';
  attempts: number;
  score: number;
  finishTime?: number;
  secretCode?: string[]; // Revela no fim
}

export type TournamentStatus = 'lobby' | 'playing' | 'finished';

// ==================== CONSTANTES ====================

export const INITIAL_CREDITS = 1000;
export const TOURNAMENT_ENTRY_FEE = 100;
export const TOURNAMENT_PLAYERS = 10;
export const BOT_COUNT = 9;

const PRIZE_DISTRIBUTION = [0.5, 0.25, 0.15, 0.1];

// ==================== HOOK ====================

export function useTournament() {
  const [status, setStatus] = useState<TournamentStatus>('lobby');
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [results, setResults] = useState<Map<string, TournamentResult>>(new Map());
  const [credits, setCredits] = useState(INITIAL_CREDITS);
  const [humanPlayerId] = useState(`human-${Date.now()}`);
  const [humanSecretCode, setHumanSecretCode] = useState<string[]>([]);
  
  const botSimulationRef = useRef<TournamentResult[]>([]);
  const revealIntervalRef = useRef<number | null>(null);
  
  // Inicializa jogadores no lobby
  const initializeLobby = useCallback(() => {
    const humanPlayer: TournamentPlayer = {
      id: humanPlayerId,
      name: 'Você',
      avatar: '👤',
      isBot: false,
    };
    
    const bots: TournamentPlayer[] = Array.from({ length: BOT_COUNT }, (_, i) => {
      const bot = createBot(i);
      return {
        id: bot.id,
        name: bot.name,
        avatar: bot.avatar,
        isBot: true,
        iq: bot.iq,
      };
    });
    
    setPlayers([humanPlayer, ...bots]);
    setStatus('lobby');
    setResults(new Map());
    setHumanSecretCode([]);
  }, [humanPlayerId]);
  
  useEffect(() => {
    initializeLobby();
  }, [initializeLobby]);
  
  // Inicia torneio - CADA jogador recebe código secreto único
  const startTournament = useCallback(() => {
    if (credits < TOURNAMENT_ENTRY_FEE) {
      return { success: false, error: 'Créditos insuficientes' };
    }
    
    setCredits(prev => prev - TOURNAMENT_ENTRY_FEE);
    
    const symbolIds = UI_SYMBOLS.map(s => s.id);
    
    // Gera código secreto ÚNICO para o humano
    const humanSecret = generateSecret(symbolIds);
    setHumanSecretCode(humanSecret);
    
    // Inicializa resultados
    const initialResults = new Map<string, TournamentResult>();
    
    // Resultado inicial do humano
    initialResults.set(humanPlayerId, {
      playerId: humanPlayerId,
      rank: 0,
      status: 'playing',
      attempts: 0,
      score: 0,
      secretCode: humanSecret,
    });
    
    // Simula CADA bot com seu próprio código secreto
    const botPlayers = players.filter(p => p.isBot);
    const botResults: TournamentResult[] = botPlayers.map(bot => {
      // Cada bot recebe um código secreto DIFERENTE
      const botSecret = generateSecret(symbolIds);
      const gameResult = simulateBotGame(botSecret, UI_SYMBOLS, MAX_ATTEMPTS, GAME_DURATION);
      
      return {
        playerId: bot.id,
        rank: 0,
        status: gameResult.status,
        attempts: gameResult.attempts,
        score: gameResult.score,
        finishTime: gameResult.finishTime,
        secretCode: botSecret,
      };
    });
    
    // Ordena bots por tempo de conclusão (quem terminou primeiro aparece primeiro)
    botResults.sort((a, b) => {
      if (a.status === 'won' && b.status !== 'won') return -1;
      if (b.status === 'won' && a.status !== 'won') return 1;
      // Por tempo restante (menos tempo = terminou depois, então mostra primeiro quem tem mais tempo restante)
      return (b.finishTime || 0) - (a.finishTime || 0);
    });
    
    botSimulationRef.current = botResults;
    
    // Inicializa bots como "waiting"
    botPlayers.forEach(bot => {
      initialResults.set(bot.id, {
        playerId: bot.id,
        rank: 0,
        status: 'waiting',
        attempts: 0,
        score: 0,
      });
    });
    
    setResults(initialResults);
    
    // Revela resultados dos bots gradualmente
    let revealIndex = 0;
    revealIntervalRef.current = window.setInterval(() => {
      if (revealIndex >= botResults.length) {
        if (revealIntervalRef.current) {
          clearInterval(revealIntervalRef.current);
        }
        return;
      }
      
      const botResult = botResults[revealIndex];
      setResults(prev => {
        const next = new Map(prev);
        next.set(botResult.playerId, botResult);
        return next;
      });
      
      revealIndex++;
    }, 2000 + Math.random() * 2000);
    
    setStatus('playing');
    return { success: true, humanSecretCode: humanSecret };
  }, [credits, players, humanPlayerId]);
  
  // Atualiza resultado do jogador humano
  const updateHumanResult = useCallback((
    gameStatus: 'won' | 'lost',
    attempts: number,
    score: number,
    timeRemaining: number,
  ) => {
    setResults(prev => {
      const next = new Map(prev);
      const existing = prev.get(humanPlayerId);
      next.set(humanPlayerId, {
        playerId: humanPlayerId,
        rank: 0,
        status: gameStatus,
        attempts,
        score,
        finishTime: timeRemaining,
        secretCode: existing?.secretCode || humanSecretCode,
      });
      return next;
    });
  }, [humanPlayerId, humanSecretCode]);
  
  // Finaliza torneio e calcula ranking
  const finishTournament = useCallback(() => {
    // Revela todos os bots restantes
    botSimulationRef.current.forEach(result => {
      setResults(prev => {
        const next = new Map(prev);
        next.set(result.playerId, result);
        return next;
      });
    });
    
    if (revealIntervalRef.current) {
      clearInterval(revealIntervalRef.current);
    }
    
    // Calcula ranking
    setResults(prev => {
      const next = new Map(prev);
      const allResults = Array.from(next.values());
      
      // Ordena: vencedores primeiro, depois por menos tentativas, depois por score, depois por tempo
      allResults.sort((a, b) => {
        // Vencedores primeiro
        if (a.status === 'won' && b.status !== 'won') return -1;
        if (b.status === 'won' && a.status !== 'won') return 1;
        
        // Se ambos venceram: menos tentativas = melhor
        if (a.status === 'won' && b.status === 'won') {
          if (a.attempts !== b.attempts) return a.attempts - b.attempts;
        }
        
        // Por score (maior melhor)
        if (a.score !== b.score) return b.score - a.score;
        
        // Por tempo restante (mais tempo melhor)
        return (b.finishTime || 0) - (a.finishTime || 0);
      });
      
      allResults.forEach((result, index) => {
        result.rank = index + 1;
        next.set(result.playerId, result);
      });
      
      return next;
    });
    
    const prizePool = TOURNAMENT_ENTRY_FEE * TOURNAMENT_PLAYERS;
    
    setStatus('finished');
    
    setTimeout(() => {
      setResults(prev => {
        const humanResult = prev.get(humanPlayerId);
        if (humanResult && humanResult.rank <= PRIZE_DISTRIBUTION.length) {
          const prize = Math.floor(prizePool * PRIZE_DISTRIBUTION[humanResult.rank - 1]);
          setCredits(c => c + prize);
        }
        return prev;
      });
    }, 500);
  }, [humanPlayerId]);
  
  const returnToLobby = useCallback(() => {
    initializeLobby();
  }, [initializeLobby]);
  
  useEffect(() => {
    return () => {
      if (revealIntervalRef.current) {
        clearInterval(revealIntervalRef.current);
      }
    };
  }, []);
  
  return {
    state: {
      status,
      players,
      results,
      humanSecretCode,
      credits,
      humanPlayerId,
      entryFee: TOURNAMENT_ENTRY_FEE,
      prizePool: TOURNAMENT_ENTRY_FEE * TOURNAMENT_PLAYERS,
    },
    actions: {
      startTournament,
      updateHumanResult,
      finishTournament,
      returnToLobby,
    },
  };
}
