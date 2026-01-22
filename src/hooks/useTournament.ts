/**
 * useTournament - Hook para gerenciar torneio de 10 jogadores
 * 
 * - 1 jogador real + 9 bots IQ80
 * - Todos jogam o mesmo código secreto
 * - Ranking por: vitória > pontuação > tempo
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { generateSecret, CODE_LENGTH, MAX_ATTEMPTS, SYMBOLS } from '@/lib/mastermindEngine';
import { createBot, simulateBotGame, BotPlayer, BotGameState } from '@/lib/botAI';
import { UI_SYMBOLS, GAME_DURATION } from './useGame';

// ==================== TIPOS ====================

export interface TournamentPlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  iq?: number;
}

export interface TournamentResult {
  playerId: string;
  rank: number;
  status: 'won' | 'lost' | 'playing' | 'waiting';
  attempts: number;
  score: number;
  finishTime?: number;
}

export type TournamentStatus = 'lobby' | 'playing' | 'finished';

export interface TournamentState {
  status: TournamentStatus;
  players: TournamentPlayer[];
  results: Map<string, TournamentResult>;
  secretCode: string[];
  humanPlayerId: string;
  entryFee: number;
  prizePool: number;
}

// ==================== CONSTANTES ====================

export const INITIAL_CREDITS = 1000; // K$ inicial
export const TOURNAMENT_ENTRY_FEE = 100; // Taxa de entrada
export const TOURNAMENT_PLAYERS = 10;
export const BOT_COUNT = 9;

// Prêmios por colocação (% do prize pool)
const PRIZE_DISTRIBUTION = [0.5, 0.25, 0.15, 0.1]; // 1º: 50%, 2º: 25%, 3º: 15%, 4º: 10%

// ==================== HOOK ====================

export function useTournament() {
  const [status, setStatus] = useState<TournamentStatus>('lobby');
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [results, setResults] = useState<Map<string, TournamentResult>>(new Map());
  const [secretCode, setSecretCode] = useState<string[]>([]);
  const [credits, setCredits] = useState(INITIAL_CREDITS);
  const [humanPlayerId] = useState(`human-${Date.now()}`);
  
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
  }, [humanPlayerId]);
  
  // Inicializa no mount
  useEffect(() => {
    initializeLobby();
  }, [initializeLobby]);
  
  // Inicia torneio
  const startTournament = useCallback(() => {
    if (credits < TOURNAMENT_ENTRY_FEE) {
      return { success: false, error: 'Créditos insuficientes' };
    }
    
    // Deduz taxa de entrada
    setCredits(prev => prev - TOURNAMENT_ENTRY_FEE);
    
    // Gera código secreto único para todos
    const secret = generateSecret(UI_SYMBOLS.map(s => s.id));
    setSecretCode(secret);
    
    // Inicializa resultados
    const initialResults = new Map<string, TournamentResult>();
    players.forEach(p => {
      initialResults.set(p.id, {
        playerId: p.id,
        rank: 0,
        status: p.isBot ? 'waiting' : 'playing',
        attempts: 0,
        score: 0,
      });
    });
    setResults(initialResults);
    
    // Simula partidas dos bots (pré-calcula, revela gradualmente)
    const botPlayers = players.filter(p => p.isBot);
    const botResults: TournamentResult[] = botPlayers.map(bot => {
      const gameResult = simulateBotGame(secret, UI_SYMBOLS, MAX_ATTEMPTS, GAME_DURATION);
      return {
        playerId: bot.id,
        rank: 0,
        status: gameResult.status,
        attempts: gameResult.attempts,
        score: gameResult.score,
        finishTime: gameResult.finishTime,
      };
    });
    
    botSimulationRef.current = botResults;
    
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
    }, 2000 + Math.random() * 3000); // 2-5s entre revelações
    
    setStatus('playing');
    return { success: true };
  }, [credits, players]);
  
  // Atualiza resultado do jogador humano
  const updateHumanResult = useCallback((
    gameStatus: 'won' | 'lost',
    attempts: number,
    score: number,
    timeRemaining: number,
  ) => {
    setResults(prev => {
      const next = new Map(prev);
      next.set(humanPlayerId, {
        playerId: humanPlayerId,
        rank: 0,
        status: gameStatus,
        attempts,
        score,
        finishTime: timeRemaining,
      });
      return next;
    });
  }, [humanPlayerId]);
  
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
      
      // Ordena: vencedores primeiro, depois por score, depois por tempo
      allResults.sort((a, b) => {
        // Vencedores primeiro
        if (a.status === 'won' && b.status !== 'won') return -1;
        if (b.status === 'won' && a.status !== 'won') return 1;
        
        // Por score (maior melhor)
        if (a.score !== b.score) return b.score - a.score;
        
        // Por tempo restante (mais tempo melhor)
        return (b.finishTime || 0) - (a.finishTime || 0);
      });
      
      // Atribui ranks
      allResults.forEach((result, index) => {
        result.rank = index + 1;
        next.set(result.playerId, result);
      });
      
      return next;
    });
    
    // Calcula prêmio
    const prizePool = TOURNAMENT_ENTRY_FEE * TOURNAMENT_PLAYERS;
    
    setStatus('finished');
    
    // Pega resultado do humano e calcula prêmio
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
  
  // Volta ao lobby
  const returnToLobby = useCallback(() => {
    initializeLobby();
  }, [initializeLobby]);
  
  // Cleanup
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
      secretCode,
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
