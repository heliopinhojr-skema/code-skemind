/**
 * useOfficialRace - Sistema de corridas oficiais agendadas
 * 
 * Corrida fixa: 03/03/2026 às 12:00 (horário local)
 * Entry: k$1.10 (k$1 prêmio + k$0.10 caixa skema)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// ==================== TIPOS ====================

export interface OfficialRacePlayer {
  id: string;
  name: string;
  emoji: string;
  registeredAt: string;
}

export interface OfficialRace {
  id: string;
  name: string;
  scheduledDate: Date;
  entryFee: number;      // Total a pagar (1.10)
  prizePerPlayer: number; // Vai pro pote (1.00)
  skemaBoxFee: number;    // Vai pro caixa (0.10)
  minPlayers: number;
  maxPlayers: number;
  registeredPlayers: OfficialRacePlayer[];
  status: 'registration' | 'starting' | 'running' | 'finished' | 'cancelled';
  creatorId: string;
  creatorName: string;
}

// ==================== CONSTANTES ====================

const STORAGE_KEY = 'skema_official_races';
const REGISTRATIONS_KEY = 'skema_race_registrations';

// Corrida fixa - 03/03/2026 às 12:00
const FIXED_RACE_DATE = new Date('2026-03-03T12:00:00');
const ENTRY_FEE = 1.10;
const PRIZE_PER_PLAYER = 1.00;
const SKEMA_BOX_FEE = 0.10;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 16;

// Criador do universo (você)
const UNIVERSE_CREATOR = {
  id: 'creator-skema-universe',
  name: 'Skema',
};

// ==================== HELPERS ====================

function formatTimeUntil(target: Date): string {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  
  if (diff <= 0) return 'Iniciando...';
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

function formatRaceDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ==================== HOOK ====================

export function useOfficialRace() {
  const [race, setRace] = useState<OfficialRace | null>(null);
  const [timeUntilRace, setTimeUntilRace] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Inicializa corrida fixa
  useEffect(() => {
    const loadOrCreateRace = () => {
      const stored = localStorage.getItem(STORAGE_KEY);
      
      if (stored) {
        const parsed = JSON.parse(stored) as OfficialRace;
        parsed.scheduledDate = new Date(parsed.scheduledDate);
        setRace(parsed);
      } else {
        // Cria corrida inicial
        const initialRace: OfficialRace = {
          id: 'official-race-2026-03-03',
          name: 'Corrida Inaugural SKEMA',
          scheduledDate: FIXED_RACE_DATE,
          entryFee: ENTRY_FEE,
          prizePerPlayer: PRIZE_PER_PLAYER,
          skemaBoxFee: SKEMA_BOX_FEE,
          minPlayers: MIN_PLAYERS,
          maxPlayers: MAX_PLAYERS,
          registeredPlayers: [],
          status: 'registration',
          creatorId: UNIVERSE_CREATOR.id,
          creatorName: UNIVERSE_CREATOR.name,
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialRace));
        setRace(initialRace);
      }
      
      setIsLoaded(true);
    };
    
    loadOrCreateRace();
  }, []);

  // Atualiza countdown
  useEffect(() => {
    if (!race) return;
    
    const update = () => {
      setTimeUntilRace(formatTimeUntil(race.scheduledDate));
    };
    
    update();
    const interval = setInterval(update, 60000); // Atualiza a cada minuto
    return () => clearInterval(interval);
  }, [race]);

  // Verifica se jogador está inscrito
  const isPlayerRegistered = useCallback((playerId: string): boolean => {
    if (!race) return false;
    return race.registeredPlayers.some(p => p.id === playerId);
  }, [race]);

  // Inscreve jogador
  const registerPlayer = useCallback((player: { id: string; name: string; emoji: string }): { success: boolean; error?: string } => {
    if (!race) return { success: false, error: 'Corrida não encontrada' };
    
    if (race.status !== 'registration') {
      return { success: false, error: 'Inscrições encerradas' };
    }
    
    if (race.registeredPlayers.length >= race.maxPlayers) {
      return { success: false, error: 'Corrida lotada' };
    }
    
    if (isPlayerRegistered(player.id)) {
      return { success: false, error: 'Você já está inscrito' };
    }
    
    const updatedRace: OfficialRace = {
      ...race,
      registeredPlayers: [
        ...race.registeredPlayers,
        {
          id: player.id,
          name: player.name,
          emoji: player.emoji,
          registeredAt: new Date().toISOString(),
        },
      ],
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRace));
    setRace(updatedRace);
    
    return { success: true };
  }, [race, isPlayerRegistered]);

  // Cancela inscrição
  const unregisterPlayer = useCallback((playerId: string): { success: boolean; error?: string } => {
    if (!race) return { success: false, error: 'Corrida não encontrada' };
    
    if (race.status !== 'registration') {
      return { success: false, error: 'Não é possível cancelar inscrição' };
    }
    
    if (!isPlayerRegistered(playerId)) {
      return { success: false, error: 'Você não está inscrito' };
    }
    
    const updatedRace: OfficialRace = {
      ...race,
      registeredPlayers: race.registeredPlayers.filter(p => p.id !== playerId),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRace));
    setRace(updatedRace);
    
    return { success: true };
  }, [race, isPlayerRegistered]);

  // Dados calculados
  const prizePool = useMemo(() => {
    if (!race) return 0;
    return race.registeredPlayers.length * PRIZE_PER_PLAYER;
  }, [race]);

  const skemaBoxTotal = useMemo(() => {
    if (!race) return 0;
    return race.registeredPlayers.length * SKEMA_BOX_FEE;
  }, [race]);

  const formattedDate = useMemo(() => {
    if (!race) return '';
    return formatRaceDate(race.scheduledDate);
  }, [race]);

  const canStartRace = useMemo(() => {
    if (!race) return false;
    const now = new Date();
    return now >= race.scheduledDate && 
           race.registeredPlayers.length >= race.minPlayers &&
           race.status === 'registration';
  }, [race]);

  return {
    race,
    isLoaded,
    timeUntilRace,
    formattedDate,
    prizePool,
    skemaBoxTotal,
    canStartRace,
    constants: {
      entryFee: ENTRY_FEE,
      prizePerPlayer: PRIZE_PER_PLAYER,
      skemaBoxFee: SKEMA_BOX_FEE,
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
      scheduledDate: FIXED_RACE_DATE,
    },
    actions: {
      isPlayerRegistered,
      registerPlayer,
      unregisterPlayer,
    },
  };
}
