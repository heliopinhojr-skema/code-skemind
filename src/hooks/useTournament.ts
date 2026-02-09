/**
 * useTournament - Hook para gerenciar torneio de jogadores vs bots
 * 
 * - 1 jogador real + N bots IQ80
 * - CADA jogador tem seu próprio código secreto
 * - Ranking por: vitória > tentativas > score > tempo
 * - Economia integrada: buy-ins dos bots saem do Bot Treasury,
 *   prêmios dos bots voltam para ele. Rake vai para Skema Box.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { generateSecret, CODE_LENGTH, MAX_ATTEMPTS } from '@/lib/mastermindEngine';
import { createBot, simulateBotGame } from '@/lib/botAI';
import { UI_SYMBOLS, GAME_DURATION } from './useGame';
import { getScaledArenaPrize, isITM, ITM_POSITIONS, calculateArenaPool } from '@/lib/arenaPayouts';
import { supabase } from '@/integrations/supabase/client';

// ==================== TIPOS ====================

export interface TournamentPlayer {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  iq?: number;
  secretCode?: string[];
}

export interface TournamentResult {
  playerId: string;
  rank: number;
  status: 'won' | 'lost' | 'playing' | 'waiting';
  attempts: number;
  score: number;
  finishTime?: number;
  secretCode?: string[];
}

export type TournamentStatus = 'lobby' | 'playing' | 'finished';

// ==================== CONSTANTES ====================

export const TOURNAMENT_ENTRY_FEE = 0.55;
export const TOURNAMENT_RAKE_FEE = 0.05;
export const TOURNAMENT_PLAYERS = 100;
export const BOT_COUNT = 99;

// ==================== HOOK ====================

export function useTournament() {
  const [status, setStatus] = useState<TournamentStatus>('lobby');
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [results, setResults] = useState<Map<string, TournamentResult>>(new Map());
  const [humanPlayerId] = useState(`human-${Date.now()}`);
  const [humanSecretCode, setHumanSecretCode] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [arenaPool, setArenaPool] = useState(0);
  
  // Arena config (customizable for different buy-ins)
  const [buyIn, setBuyIn] = useState(TOURNAMENT_ENTRY_FEE);
  const [rakeFee, setRakeFee] = useState(TOURNAMENT_RAKE_FEE);
  const [botCount, setBotCount] = useState(BOT_COUNT);
  
  const botSimulationRef = useRef<TournamentResult[]>([]);
  const revealIntervalRef = useRef<number | null>(null);
  // Ref para pool ativo - previne race conditions com state batching
  const activePoolRef = useRef<number>(0);
  
  // Inicializa jogadores no lobby
  const initializeLobby = useCallback(() => {
    const humanPlayer: TournamentPlayer = {
      id: humanPlayerId,
      name: 'Você',
      avatar: '👤',
      isBot: false,
    };
    
    const bots: TournamentPlayer[] = Array.from({ length: botCount }, (_, i) => {
      const bot = createBot(i);
      return {
        id: bot.id,
        name: bot.name,
        avatar: bot.avatar,
        isBot: true,
        iq: bot.iq,
      };
    });
    
    const pool = calculateArenaPool(buyIn, rakeFee, botCount);
    setPlayers([humanPlayer, ...bots]);
    setStatus('lobby');
    setResults(new Map());
    setHumanSecretCode([]);
    setArenaPool(pool);
    activePoolRef.current = pool;
  }, [humanPlayerId, botCount, buyIn, rakeFee]);
  
  // Inicializa apenas no mount - NÃO re-executa quando deps mudam
  // (evita race condition onde initializeLobby reseta status/pool durante o jogo)
  useEffect(() => {
    initializeLobby();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Calcula o total de prêmios dos bots a partir dos resultados
  const calculateBotPrizesTotal = useCallback((allResults: TournamentResult[], pool: number) => {
    let total = 0;
    for (const result of allResults) {
      if (result.playerId !== humanPlayerId && isITM(result.rank)) {
        total += getScaledArenaPrize(result.rank, pool);
      }
    }
    return Math.round(total * 100) / 100; // round to 2 decimals
  }, [humanPlayerId]);

  // Configura arena customizada (chamado pelo lobby antes de iniciar)
  const configureArena = useCallback((config: { buyIn: number; rakeFee: number; botCount: number }) => {
    setBuyIn(config.buyIn);
    setRakeFee(config.rakeFee);
    setBotCount(config.botCount);
  }, []);

  // Inicia torneio - chama Edge Function para economia
  // Accepts optional override config for arena params
  const startTournament = useCallback(async (arenaConfig?: { buyIn: number; rakeFee: number; botCount: number }) => {
    if (isProcessing) return { success: false, error: 'Processando...' };
    setIsProcessing(true);
    
    // Use override config if provided
    const effectiveBuyIn = arenaConfig?.buyIn ?? buyIn;
    const effectiveRakeFee = arenaConfig?.rakeFee ?? rakeFee;
    const effectiveBotCount = arenaConfig?.botCount ?? botCount;

    // Update state to match
    if (arenaConfig) {
      setBuyIn(effectiveBuyIn);
      setRakeFee(effectiveRakeFee);
      setBotCount(effectiveBotCount);
    }
    
    try {
      // Chama Edge Function para debitar player + bot treasury + creditar rake
      const { data, error } = await supabase.functions.invoke('process-arena-economy', {
        body: {
          action: 'enter',
          buy_in: effectiveBuyIn,
          rake_fee: effectiveRakeFee,
          bot_count: effectiveBotCount,
        },
      });

      if (error) {
        console.error('[TOURNAMENT] Edge function error:', error);
        setIsProcessing(false);
        return { success: false, error: 'Erro ao processar entrada na arena' };
      }

      if (!data?.success) {
        console.error('[TOURNAMENT] Arena entry failed:', data?.error);
        setIsProcessing(false);
        return { success: false, error: data?.error || 'Falha ao entrar na arena' };
      }

      console.log('[TOURNAMENT] ✅ Arena entry processed:', data);
    
      const symbolIds = UI_SYMBOLS.map(s => s.id);
      // Usa o pool retornado pelo backend para garantir consistência
      const pool = data.total_pool ?? calculateArenaPool(effectiveBuyIn, effectiveRakeFee, effectiveBotCount);
      setArenaPool(pool);
      activePoolRef.current = pool;
      
      // Gera código secreto ÚNICO para o humano
      const humanSecret = generateSecret(symbolIds);
      setHumanSecretCode(humanSecret);
      
      // Inicializa resultados
      const initialResults = new Map<string, TournamentResult>();
      
      initialResults.set(humanPlayerId, {
        playerId: humanPlayerId,
        rank: 0,
        status: 'playing',
        attempts: 0,
        score: 0,
        secretCode: humanSecret,
      });
      
      // Re-generate bot players inline if count changed
      const actualBotCount = effectiveBotCount;
      let botPlayers = players.filter(p => p.isBot);
      
      // If bot count doesn't match (arena config changed), regenerate
      if (botPlayers.length !== actualBotCount) {
        const { createBot: createBotFn } = await import('@/lib/botAI');
        botPlayers = Array.from({ length: actualBotCount }, (_, i) => {
          const bot = createBotFn(i);
          return {
            id: bot.id,
            name: bot.name,
            avatar: bot.avatar,
            isBot: true,
            iq: bot.iq,
          };
        });
        setPlayers([{ id: humanPlayerId, name: 'Você', avatar: '👤', isBot: false }, ...botPlayers]);
      }
      const botResults: TournamentResult[] = botPlayers.map(bot => {
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
      
      // Ordena bots por tempo de conclusão
      botResults.sort((a, b) => {
        if (a.status === 'won' && b.status !== 'won') return -1;
        if (b.status === 'won' && a.status !== 'won') return 1;
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
      setIsProcessing(false);
      return { success: true, humanSecretCode: humanSecret };
    } catch (e) {
      console.error('[TOURNAMENT] Unexpected error:', e);
      setIsProcessing(false);
      return { success: false, error: 'Erro inesperado' };
    }
  }, [isProcessing, buyIn, rakeFee, botCount, players, humanPlayerId]);
  
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
  
  // Finaliza torneio, calcula ranking, e processa economia
  // RECEBE dados do humano diretamente para evitar bugs de batching do React 18
  const finishTournament = useCallback(async (humanGameData: {
    status: 'won' | 'lost';
    attempts: number;
    score: number;
    timeRemaining: number;
  }) => {
    if (revealIntervalRef.current) {
      clearInterval(revealIntervalRef.current);
    }

    // ── Computar ranking SINCRONAMENTE ──
    const allResultsMap = new Map<string, TournamentResult>();

    // Resultado humano construído com dados passados diretamente (não do state!)
    const humanTournamentResult: TournamentResult = {
      playerId: humanPlayerId,
      rank: 0,
      status: humanGameData.status,
      attempts: humanGameData.attempts,
      score: humanGameData.score,
      finishTime: humanGameData.timeRemaining,
      secretCode: humanSecretCode,
    };
    allResultsMap.set(humanPlayerId, humanTournamentResult);

    // Adiciona todos os resultados dos bots (da simulação pré-computada)
    botSimulationRef.current.forEach(result => {
      allResultsMap.set(result.playerId, result);
    });

    // Ordena e atribui rankings
    const rankedResults = Array.from(allResultsMap.values());
    rankedResults.sort((a, b) => {
      if (a.status === 'won' && b.status !== 'won') return -1;
      if (b.status === 'won' && a.status !== 'won') return 1;
      if (a.status === 'won' && b.status === 'won') {
        if (a.attempts !== b.attempts) return a.attempts - b.attempts;
      }
      if (a.score !== b.score) return b.score - a.score;
      return (b.finishTime || 0) - (a.finishTime || 0);
    });

    rankedResults.forEach((result, index) => {
      result.rank = index + 1;
      allResultsMap.set(result.playerId, result);
    });

    // Atualiza o state de uma vez com todos os rankings
    setResults(new Map(allResultsMap));
    setStatus('finished');

    // ── Processa economia via Edge Function ──
    // Usa ref para pool ativo - imune a race conditions do React state
    const pool = activePoolRef.current || arenaPool;
    const humanResult = rankedResults.find(r => r.playerId === humanPlayerId)!;
    const humanPrize = isITM(humanResult.rank)
      ? getScaledArenaPrize(humanResult.rank, pool)
      : 0;

    const botPrizesTotal = calculateBotPrizesTotal(rankedResults, pool);

    console.log(`[TOURNAMENT] Finishing - Player rank: #${humanResult.rank}, prize: k$${humanPrize.toFixed(2)}, bot prizes total: k$${botPrizesTotal.toFixed(2)}, pool: k$${pool.toFixed(2)}`);

    try {
      const { data, error } = await supabase.functions.invoke('process-arena-economy', {
        body: {
          action: 'finish',
          player_rank: humanResult.rank,
          player_prize: humanPrize,
          bot_prizes_total: botPrizesTotal,
          attempts: humanResult.attempts,
          score: humanResult.score,
          time_remaining: humanResult.finishTime || null,
          won: humanResult.status === 'won',
        },
      });

      if (error) {
        console.error('[TOURNAMENT] Finish economy error:', error);
      } else {
        console.log('[TOURNAMENT] ✅ Arena economy finalized:', data);
      }
    } catch (e) {
      console.error('[TOURNAMENT] Finish error:', e);
    }
  }, [humanPlayerId, humanSecretCode, arenaPool, calculateBotPrizesTotal]);
  
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
      humanPlayerId,
      entryFee: buyIn,
      prizePool: arenaPool,
      isProcessing,
    },
    actions: {
      startTournament,
      configureArena,
      updateHumanResult,
      finishTournament,
      returnToLobby,
    },
  };
}
