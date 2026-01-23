/**
 * useOfficialRace - Sistema de corridas oficiais agendadas (v2)
 * 
 * RECONSTRUÍDO para resolver:
 * - Inscritos não aparecendo entre domínios
 * - Sincronização via API simulada (futuramente Lovable Cloud)
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
  version: number; // Para detectar atualizações
}

// ==================== CONSTANTES ====================

const STORAGE_KEY = 'skema_official_race_v2';
const SYNC_INTERVAL = 5000; // 5 segundos

// Corrida fixa - 03/03/2026 às 12:00
const FIXED_RACE_DATE = new Date('2026-03-03T12:00:00');
const ENTRY_FEE = 1.10;
const PRIZE_PER_PLAYER = 1.00;
const SKEMA_BOX_FEE = 0.10;
const MIN_PLAYERS = 2;
const MAX_PLAYERS = 50; // Aumentado para acomodar mais jogadores

// Criador do universo - Guardião
const UNIVERSE_CREATOR: OfficialRacePlayer = {
  id: 'guardian-skema-universe',
  name: 'skema',
  emoji: '🌌',
  registeredAt: '2024-01-01T00:00:00.000Z',
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

function createInitialRace(): OfficialRace {
  return {
    id: 'official-race-2026-03-03',
    name: 'Corrida Inaugural SKEMA',
    scheduledDate: FIXED_RACE_DATE,
    entryFee: ENTRY_FEE,
    prizePerPlayer: PRIZE_PER_PLAYER,
    skemaBoxFee: SKEMA_BOX_FEE,
    minPlayers: MIN_PLAYERS,
    maxPlayers: MAX_PLAYERS,
    registeredPlayers: [UNIVERSE_CREATOR],
    status: 'registration',
    creatorId: UNIVERSE_CREATOR.id,
    creatorName: UNIVERSE_CREATOR.name,
    version: 1,
  };
}

function deduplicatePlayers(players: OfficialRacePlayer[]): OfficialRacePlayer[] {
  const seen = new Map<string, OfficialRacePlayer>();
  
  for (const player of players) {
    const normalizedName = player.name.trim().toLowerCase();
    
    // Mantém primeira ocorrência de cada nome e ID
    if (!seen.has(player.id) && ![...seen.values()].some(p => p.name.trim().toLowerCase() === normalizedName)) {
      seen.set(player.id, player);
    }
  }
  
  return Array.from(seen.values());
}

// ==================== HOOK ====================

export function useOfficialRace() {
  const [race, setRace] = useState<OfficialRace | null>(null);
  const [timeUntilRace, setTimeUntilRace] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Carrega corrida do storage
  const loadRace = useCallback((): OfficialRace => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      
      if (stored) {
        const parsed = JSON.parse(stored) as OfficialRace;
        parsed.scheduledDate = new Date(parsed.scheduledDate);
        
        // Deduplica jogadores
        parsed.registeredPlayers = deduplicatePlayers(parsed.registeredPlayers);
        
        // Garante que o Guardião esteja inscrito
        const guardianExists = parsed.registeredPlayers.some(p => p.id === UNIVERSE_CREATOR.id);
        if (!guardianExists) {
          parsed.registeredPlayers.unshift(UNIVERSE_CREATOR);
          parsed.version++;
        }
        
        return parsed;
      }
    } catch (e) {
      console.error('[OFFICIAL RACE] Erro ao carregar:', e);
    }
    
    return createInitialRace();
  }, []);

  // Salva corrida
  const saveRace = useCallback((updatedRace: OfficialRace) => {
    updatedRace.version++;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedRace));
    setRace(updatedRace);
    console.log('[OFFICIAL RACE] Salvo:', updatedRace.registeredPlayers.length, 'inscritos, versão', updatedRace.version);
  }, []);

  // Inicializa e sincroniza
  useEffect(() => {
    const initialRace = loadRace();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initialRace));
    setRace(initialRace);
    setIsLoaded(true);
    
    console.log('[OFFICIAL RACE] Carregado:', initialRace.name);
    console.log('[OFFICIAL RACE] Inscritos:', initialRace.registeredPlayers.map(p => p.name).join(', '));

    // Re-carrega periodicamente para pegar atualizações (simula sync)
    const syncInterval = setInterval(() => {
      const currentRace = loadRace();
      setRace(prev => {
        if (!prev || currentRace.version > prev.version) {
          console.log('[OFFICIAL RACE] Sincronizado, versão:', currentRace.version);
          return currentRace;
        }
        return prev;
      });
    }, SYNC_INTERVAL);

    return () => clearInterval(syncInterval);
  }, [loadRace]);

  // Atualiza countdown
  useEffect(() => {
    if (!race) return;
    
    const update = () => {
      setTimeUntilRace(formatTimeUntil(race.scheduledDate));
    };
    
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [race]);

  // Verifica se jogador está inscrito
  const isPlayerRegistered = useCallback((playerId: string): boolean => {
    if (!race) return false;
    return race.registeredPlayers.some(p => p.id === playerId);
  }, [race]);

  // Verifica se nome já está em uso
  const isNameTaken = useCallback((name: string, excludeId?: string): boolean => {
    if (!race) return false;
    const normalizedName = name.trim().toLowerCase();
    return race.registeredPlayers.some(p => 
      p.name.trim().toLowerCase() === normalizedName && p.id !== excludeId
    );
  }, [race]);

  // Inscreve jogador
  const registerPlayer = useCallback((player: { id: string; name: string; emoji: string }): { success: boolean; error?: string } => {
    // Recarrega antes de registrar para evitar conflitos
    const currentRace = loadRace();
    
    if (currentRace.status !== 'registration') {
      return { success: false, error: 'Inscrições encerradas' };
    }
    
    if (currentRace.registeredPlayers.length >= currentRace.maxPlayers) {
      return { success: false, error: 'Corrida lotada' };
    }
    
    // Verifica se já está inscrito por ID
    if (currentRace.registeredPlayers.some(p => p.id === player.id)) {
      return { success: false, error: 'Você já está inscrito' };
    }
    
    // Verifica nome duplicado
    const normalizedName = player.name.trim().toLowerCase();
    if (currentRace.registeredPlayers.some(p => p.name.trim().toLowerCase() === normalizedName)) {
      return { success: false, error: 'Nome já em uso nesta corrida' };
    }
    
    const updatedRace: OfficialRace = {
      ...currentRace,
      registeredPlayers: [
        ...currentRace.registeredPlayers,
        {
          id: player.id,
          name: player.name,
          emoji: player.emoji,
          registeredAt: new Date().toISOString(),
        },
      ],
    };
    
    saveRace(updatedRace);
    console.log('[OFFICIAL RACE] Inscrito:', player.name, '- Total:', updatedRace.registeredPlayers.length);
    
    return { success: true };
  }, [loadRace, saveRace]);

  // Cancela inscrição
  const unregisterPlayer = useCallback((playerId: string): { success: boolean; error?: string } => {
    const currentRace = loadRace();
    
    if (currentRace.status !== 'registration') {
      return { success: false, error: 'Não é possível cancelar inscrição' };
    }
    
    if (!currentRace.registeredPlayers.some(p => p.id === playerId)) {
      return { success: false, error: 'Você não está inscrito' };
    }
    
    // Não permite remover o Guardião
    if (playerId === UNIVERSE_CREATOR.id) {
      return { success: false, error: 'Guardião não pode sair' };
    }
    
    const updatedRace: OfficialRace = {
      ...currentRace,
      registeredPlayers: currentRace.registeredPlayers.filter(p => p.id !== playerId),
    };
    
    saveRace(updatedRace);
    console.log('[OFFICIAL RACE] Removido:', playerId, '- Total:', updatedRace.registeredPlayers.length);
    
    return { success: true };
  }, [loadRace, saveRace]);

  // Força recarga (útil para debug)
  const forceReload = useCallback(() => {
    const currentRace = loadRace();
    setRace(currentRace);
    console.log('[OFFICIAL RACE] Force reload - Inscritos:', currentRace.registeredPlayers.map(p => p.name).join(', '));
  }, [loadRace]);

  // Limpa e recria (debug)
  const resetRace = useCallback(() => {
    const newRace = createInitialRace();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newRace));
    setRace(newRace);
    console.log('[OFFICIAL RACE] RESET completo');
  }, []);

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
      isNameTaken,
      registerPlayer,
      unregisterPlayer,
      forceReload,
      resetRace,
    },
  };
}
