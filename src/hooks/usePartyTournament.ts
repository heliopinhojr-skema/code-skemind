/**
 * usePartyTournament - Hook para gerenciar torneios presenciais (Modo Festa)
 * 
 * Funciona 100% local - cada jogador joga no seu celular e reporta resultado verbal/screenshot
 * O anfitrião coleta os resultados e o sistema calcula ranking e prêmios
 */

import { useState, useCallback } from 'react';
import { roundCurrency } from '@/lib/currencyUtils';

export interface PartyPlayer {
  id: string;
  name: string;
  emoji: string;
}

export interface PartyResult {
  playerId: string;
  playerName: string;
  playerEmoji: string;
  won: boolean;
  attempts: number;
  timeRemaining: number; // segundos restantes
  score: number;
  rank?: number;
  prize?: number;
}

export interface PartyTournament {
  id: string;
  name: string;
  hostId: string;
  hostName: string;
  entryFee: number;
  maxPlayers: number;
  prizePool: number;
  players: PartyPlayer[];
  results: PartyResult[];
  status: 'setup' | 'playing' | 'collecting' | 'finished';
  createdAt: string;
}

// Constantes
const ENTRY_FEE = 1.10;
const MAX_PLAYERS = 10;
const RAKE_PERCENT = 0.0643; // 6.43% vai pro sistema

// Distribuição de prêmios (top 4 ganham - 40% ITM)
const PRIZE_DISTRIBUTION = [0.50, 0.25, 0.15, 0.10]; // 1º: 50%, 2º: 25%, 3º: 15%, 4º: 10%

// Gera ID único para torneio
function generateTournamentId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'FESTA-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function usePartyTournament() {
  const [tournament, setTournament] = useState<PartyTournament | null>(null);

  // Criar torneio
  const createTournament = useCallback((
    hostId: string,
    hostName: string,
    hostEmoji: string,
    tournamentName: string = 'Festa SKEMA'
  ): PartyTournament => {
    const newTournament: PartyTournament = {
      id: generateTournamentId(),
      name: tournamentName,
      hostId,
      hostName,
      entryFee: ENTRY_FEE,
      maxPlayers: MAX_PLAYERS,
      prizePool: 0,
      players: [{ id: hostId, name: hostName, emoji: hostEmoji }],
      results: [],
      status: 'setup',
      createdAt: new Date().toISOString(),
    };
    
    setTournament(newTournament);
    console.log(`[FESTA] 🎉 Torneio criado: ${newTournament.id} por ${hostName}`);
    return newTournament;
  }, []);

  // Adicionar jogador (anfitrião digita nome do participante)
  const addPlayer = useCallback((name: string, emoji: string = '🎮'): { success: boolean; error?: string } => {
    if (!tournament) return { success: false, error: 'Nenhum torneio ativo' };
    if (tournament.status !== 'setup') return { success: false, error: 'Torneio já iniciado' };
    if (tournament.players.length >= MAX_PLAYERS) return { success: false, error: 'Limite de jogadores atingido' };
    
    // Verifica duplicata
    const exists = tournament.players.some(p => p.name.toLowerCase() === name.toLowerCase());
    if (exists) return { success: false, error: 'Jogador já adicionado' };
    
    const playerId = `party-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    
    setTournament(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        players: [...prev.players, { id: playerId, name, emoji }],
      };
    });
    
    console.log(`[FESTA] ✅ Jogador adicionado: ${emoji} ${name}`);
    return { success: true };
  }, [tournament]);

  // Remover jogador
  const removePlayer = useCallback((playerId: string): boolean => {
    if (!tournament) return false;
    if (tournament.status !== 'setup') return false;
    if (playerId === tournament.hostId) return false; // Não pode remover o host
    
    setTournament(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        players: prev.players.filter(p => p.id !== playerId),
      };
    });
    
    return true;
  }, [tournament]);

  // Iniciar torneio (coleta entrada de todos)
  const startTournament = useCallback((
    deductEnergy: (amount: number) => boolean,
    addToBox?: (amount: number, type: 'arena_rake' | 'official_rake' | 'party_rake', description?: string) => Promise<number | null>
  ): { success: boolean; error?: string } => {
    if (!tournament) return { success: false, error: 'Nenhum torneio ativo' };
    if (tournament.players.length < 2) return { success: false, error: 'Mínimo 2 jogadores' };
    
    // Deduz entrada do host (os outros pagam manualmente ou são "confiança")
    const totalEntry = roundCurrency(ENTRY_FEE * tournament.players.length);
    const rake = roundCurrency(totalEntry * RAKE_PERCENT);
    const prizePool = roundCurrency(totalEntry - rake);
    
    // Tenta deduzir do host
    if (!deductEnergy(ENTRY_FEE)) {
      return { success: false, error: 'Energia insuficiente' };
    }
    
    // Salva rake no Cloud via callback
    if (addToBox) {
      addToBox(rake, 'party_rake').then(newBal => {
        console.log(`[FESTA] 💰 Rake Cloud: k$${rake.toFixed(2)} → Caixa: k$${(newBal ?? 0).toFixed(2)}`);
      });
    } else {
      console.log(`[FESTA] ⚠️ addToBox não disponível, rake não registrado no Cloud`);
    }
    
    setTournament(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        prizePool,
        status: 'playing',
      };
    });
    
    console.log(`[FESTA] 🚀 Torneio iniciado! ${tournament.players.length} jogadores, Pool: k$${prizePool.toFixed(2)}`);
    return { success: true };
  }, [tournament]);

  // Ir para fase de coleta de resultados
  const goToCollecting = useCallback(() => {
    setTournament(prev => {
      if (!prev) return prev;
      return { ...prev, status: 'collecting' };
    });
  }, []);

  // Adicionar resultado de um jogador
  const addResult = useCallback((
    playerId: string,
    won: boolean,
    attempts: number,
    timeRemaining: number,
    score: number
  ): { success: boolean; error?: string } => {
    if (!tournament) return { success: false, error: 'Nenhum torneio ativo' };
    
    const player = tournament.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Jogador não encontrado' };
    
    // Verifica se já tem resultado
    const existingResult = tournament.results.find(r => r.playerId === playerId);
    if (existingResult) return { success: false, error: 'Resultado já registrado' };
    
    const result: PartyResult = {
      playerId,
      playerName: player.name,
      playerEmoji: player.emoji,
      won,
      attempts,
      timeRemaining,
      score,
    };
    
    setTournament(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        results: [...prev.results, result],
      };
    });
    
    console.log(`[FESTA] 📊 Resultado: ${player.emoji} ${player.name} - ${won ? '✅ Venceu' : '❌ Perdeu'} em ${attempts} tentativas`);
    return { success: true };
  }, [tournament]);

  // Atualizar resultado existente
  const updateResult = useCallback((
    playerId: string,
    won: boolean,
    attempts: number,
    timeRemaining: number,
    score: number
  ): boolean => {
    if (!tournament) return false;
    
    setTournament(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        results: prev.results.map(r => 
          r.playerId === playerId 
            ? { ...r, won, attempts, timeRemaining, score }
            : r
        ),
      };
    });
    
    return true;
  }, [tournament]);

  // Finalizar e calcular ranking
  const finishTournament = useCallback((
    addEnergy: (amount: number) => void,
    hostPlayerId: string
  ): PartyResult[] => {
    if (!tournament) return [];
    
    // Ordena resultados: Vitória > Menos tentativas > Maior score > Mais tempo restante
    const sortedResults = [...tournament.results].sort((a, b) => {
      // Vitória tem prioridade
      if (a.won && !b.won) return -1;
      if (!a.won && b.won) return 1;
      
      // Se ambos venceram ou perderam, compara tentativas (menos é melhor)
      if (a.attempts !== b.attempts) return a.attempts - b.attempts;
      
      // Empate em tentativas: maior score ganha
      if (a.score !== b.score) return b.score - a.score;
      
      // Empate em score: mais tempo restante ganha
      return b.timeRemaining - a.timeRemaining;
    });
    
    // Atribui ranks e prêmios
    const finalResults = sortedResults.map((result, index) => {
      const rank = index + 1;
      let prize = 0;
      
      if (rank <= PRIZE_DISTRIBUTION.length) {
        prize = roundCurrency(tournament.prizePool * PRIZE_DISTRIBUTION[rank - 1]);
      }
      
      return { ...result, rank, prize };
    });
    
    // Credita prêmio do host (se ganhou algo)
    const hostResult = finalResults.find(r => r.playerId === hostPlayerId);
    if (hostResult && hostResult.prize && hostResult.prize > 0) {
      addEnergy(hostResult.prize);
      console.log(`[FESTA] 🏆 Prêmio do host (${hostResult.rank}º): +k$${hostResult.prize.toFixed(2)}`);
    }
    
    setTournament(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        results: finalResults,
        status: 'finished',
      };
    });
    
    console.log('[FESTA] 🎊 Torneio finalizado!');
    return finalResults;
  }, [tournament]);

  // Resetar/fechar torneio
  const closeTournament = useCallback(() => {
    setTournament(null);
  }, []);

  return {
    tournament,
    constants: {
      ENTRY_FEE,
      MAX_PLAYERS,
      RAKE_PERCENT,
      PRIZE_DISTRIBUTION,
    },
    actions: {
      createTournament,
      addPlayer,
      removePlayer,
      startTournament,
      goToCollecting,
      addResult,
      updateResult,
      finishTournament,
      closeTournament,
    },
  };
}
