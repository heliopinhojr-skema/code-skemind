/**
 * useSkemaPlayer - Sistema local de jogador SKEMA
 * 
 * Usa localStorage para persistir:
 * - Nome e emoji do jogador
 * - Código de convite único
 * - Energia (k$)
 * - Missão de convites
 * - Data/hora de registro
 */

import { useState, useEffect, useCallback } from 'react';

// ==================== TIPOS ====================

export interface SkemaPlayer {
  id: string;
  name: string;
  emoji: string;
  inviteCode: string;
  invitedBy: string | null;
  invitedByName?: string | null; // Nome de quem convidou (ancestralidade)
  registeredAt: string;
  energy: number;
  lastRefillDate: string;
  referrals: string[]; // IDs de jogadores convidados
  stats: {
    wins: number;
    races: number;
    bestTime: number;
  };
}

export interface InvitedPlayer {
  id: string;
  name: string;
  invitedAt: string;
}

// ==================== CONSTANTES ====================

const STORAGE_KEY = 'skema_player';
const INVITES_KEY = 'skema_invites';
const CODE_REGISTRY_KEY = 'skema_code_registry'; // Mapeia códigos -> jogadores
const INITIAL_ENERGY = 10;
const REFERRAL_REWARD = 10;
const MAX_REFERRAL_REWARDS = 10;
const TRANSFER_TAX = 0.0643; // 6.43%

// Códigos de convite master (para primeiros jogadores)
const MASTER_INVITE_CODES = ['SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER'];

// ==================== HELPERS ====================

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SK';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generatePlayerId(): string {
  return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getSkemaYear(): number {
  const startDate = new Date('2024-01-01');
  const now = new Date();
  const diff = now.getTime() - startDate.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return Math.floor(days / 365) + 1;
}

function getSkemaDay(): number {
  const startDate = new Date('2024-01-01');
  const now = new Date();
  const diff = now.getTime() - startDate.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return (days % 365) + 1;
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// ==================== HOOK ====================

// Registro global de códigos → { name, id }
interface CodeRegistryEntry {
  id: string;
  name: string;
}

export function useSkemaPlayer() {
  const [player, setPlayer] = useState<SkemaPlayer | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [allInvites, setAllInvites] = useState<Record<string, InvitedPlayer>>({});
  const [codeRegistry, setCodeRegistry] = useState<Record<string, CodeRegistryEntry>>({});

  // Carrega do localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SkemaPlayer;
        
        // Verifica refill diário
        const today = getTodayDateString();
        if (parsed.lastRefillDate !== today && parsed.energy < INITIAL_ENERGY) {
          parsed.energy = INITIAL_ENERGY;
          parsed.lastRefillDate = today;
        }
        
        // Carrega referrals do registro global (para sincronizar convites feitos em outras sessões)
        const REFERRALS_BY_PLAYER_KEY = 'skema_referrals_by_player';
        const storedReferrals = localStorage.getItem(REFERRALS_BY_PLAYER_KEY);
        if (storedReferrals) {
          const referralsByPlayer = JSON.parse(storedReferrals);
          if (referralsByPlayer[parsed.id]) {
            const globalReferrals = referralsByPlayer[parsed.id] as string[];
            // Merge com referrals locais (evita duplicatas)
            const mergedReferrals = [...new Set([...(parsed.referrals || []), ...globalReferrals])];
            parsed.referrals = mergedReferrals;
          }
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        setPlayer(parsed);
      }
      
      const storedInvites = localStorage.getItem(INVITES_KEY);
      if (storedInvites) {
        setAllInvites(JSON.parse(storedInvites));
      }

      const storedRegistry = localStorage.getItem(CODE_REGISTRY_KEY);
      if (storedRegistry) {
        setCodeRegistry(JSON.parse(storedRegistry));
      }
    } catch (e) {
      console.error('Erro ao carregar jogador:', e);
    }
    setIsLoaded(true);
  }, []);

  // Salva no localStorage
  const savePlayer = useCallback((updated: SkemaPlayer) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setPlayer(updated);
  }, []);

  // Valida código de convite - busca no registro global
  const validateInviteCode = useCallback((code: string): { valid: boolean; inviterId: string | null; inviterName?: string } => {
    const upperCode = code.toUpperCase().trim();
    
    // Master codes
    if (MASTER_INVITE_CODES.includes(upperCode)) {
      return { valid: true, inviterId: null, inviterName: 'SKEMA' };
    }
    
    // Busca no registro global de códigos
    const storedRegistry = localStorage.getItem(CODE_REGISTRY_KEY);
    if (storedRegistry) {
      const registry = JSON.parse(storedRegistry) as Record<string, CodeRegistryEntry>;
      if (registry[upperCode]) {
        return { valid: true, inviterId: registry[upperCode].id, inviterName: registry[upperCode].name };
      }
    }
    
    // Para demo: aceita qualquer código SK (como código "órfão")
    if (upperCode.startsWith('SK') && upperCode.length >= 6) {
      return { valid: true, inviterId: null, inviterName: undefined };
    }
    
    return { valid: false, inviterId: null };
  }, []);

  // Registra novo jogador
  const register = useCallback((name: string, inviteCode: string, emoji: string = '🎮'): { success: boolean; error?: string } => {
    const validation = validateInviteCode(inviteCode);
    if (!validation.valid) {
      return { success: false, error: 'Código de convite inválido' };
    }
    
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Nome deve ter pelo menos 2 caracteres' };
    }
    
    if (trimmedName.length > 15) {
      return { success: false, error: 'Nome deve ter no máximo 15 caracteres' };
    }

    const newInviteCode = generateInviteCode();
    
    const newPlayer: SkemaPlayer = {
      id: generatePlayerId(),
      name: trimmedName,
      emoji,
      inviteCode: newInviteCode,
      invitedBy: validation.inviterId,
      invitedByName: validation.inviterName || null, // Guarda nome de quem convidou
      registeredAt: new Date().toISOString(),
      energy: INITIAL_ENERGY,
      lastRefillDate: getTodayDateString(),
      referrals: [],
      stats: {
        wins: 0,
        races: 0,
        bestTime: 0,
      },
    };
    
    savePlayer(newPlayer);
    
    // Registra o código deste jogador no registro global
    const updatedRegistry = { ...codeRegistry };
    updatedRegistry[newInviteCode] = { id: newPlayer.id, name: newPlayer.name };
    localStorage.setItem(CODE_REGISTRY_KEY, JSON.stringify(updatedRegistry));
    setCodeRegistry(updatedRegistry);
    
    // Registra quem convidou (para dar reward) e atualiza referrals do inviter
    if (validation.inviterId) {
      const invites = { ...allInvites };
      invites[newPlayer.id] = {
        id: newPlayer.id,
        name: newPlayer.name,
        invitedAt: newPlayer.registeredAt,
      };
      localStorage.setItem(INVITES_KEY, JSON.stringify(invites));
      setAllInvites(invites);
      
      // Atualiza o array referrals do jogador que convidou
      try {
        const storedInviter = localStorage.getItem(STORAGE_KEY);
        if (storedInviter) {
          const inviterPlayer = JSON.parse(storedInviter) as SkemaPlayer;
          if (inviterPlayer.id === validation.inviterId) {
            // O inviter é o jogador atual logado - atualiza diretamente
            inviterPlayer.referrals = [...(inviterPlayer.referrals || []), newPlayer.id];
            if (inviterPlayer.referrals.length <= MAX_REFERRAL_REWARDS) {
              inviterPlayer.energy += REFERRAL_REWARD;
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(inviterPlayer));
          }
        }
        
        // Também salva em registro global de referrals por jogador
        const REFERRALS_BY_PLAYER_KEY = 'skema_referrals_by_player';
        const storedReferrals = localStorage.getItem(REFERRALS_BY_PLAYER_KEY);
        const referralsByPlayer = storedReferrals ? JSON.parse(storedReferrals) : {};
        if (!referralsByPlayer[validation.inviterId]) {
          referralsByPlayer[validation.inviterId] = [];
        }
        referralsByPlayer[validation.inviterId].push(newPlayer.id);
        localStorage.setItem(REFERRALS_BY_PLAYER_KEY, JSON.stringify(referralsByPlayer));
      } catch (e) {
        console.error('Erro ao atualizar referrals do inviter:', e);
      }
    }
    
    return { success: true };
  }, [validateInviteCode, savePlayer, allInvites, codeRegistry]);

  // Atualiza energia
  const updateEnergy = useCallback((amount: number) => {
    if (!player) return;
    
    const updated = {
      ...player,
      energy: Math.max(0, player.energy + amount),
    };
    savePlayer(updated);
  }, [player, savePlayer]);

  // Deduz energia (para entry fees)
  const deductEnergy = useCallback((amount: number): boolean => {
    if (!player) return false;
    if (player.energy < amount) return false;
    
    updateEnergy(-amount);
    return true;
  }, [player, updateEnergy]);

  // Adiciona energia (prêmios)
  const addEnergy = useCallback((amount: number) => {
    updateEnergy(amount);
  }, [updateEnergy]);

  // Transferência entre jogadores (com taxa)
  const transferEnergy = useCallback((amount: number, toPlayerId: string): { success: boolean; error?: string } => {
    if (!player) return { success: false, error: 'Jogador não encontrado' };
    
    const totalCost = amount * (1 + TRANSFER_TAX);
    if (player.energy < totalCost) {
      return { success: false, error: 'Energia insuficiente (inclua a taxa de 6.43%)' };
    }
    
    updateEnergy(-totalCost);
    // Em sistema real, adicionaria ao destinatário
    
    return { success: true };
  }, [player, updateEnergy]);

  // Atualiza estatísticas
  const updateStats = useCallback((result: { won: boolean; time?: number }) => {
    if (!player) return;
    
    const updated = {
      ...player,
      stats: {
        ...player.stats,
        races: player.stats.races + 1,
        wins: player.stats.wins + (result.won ? 1 : 0),
        bestTime: result.won && result.time 
          ? (player.stats.bestTime === 0 ? result.time : Math.min(player.stats.bestTime, result.time))
          : player.stats.bestTime,
      },
    };
    savePlayer(updated);
  }, [player, savePlayer]);

  // Atualiza emoji
  const updateEmoji = useCallback((emoji: string) => {
    if (!player) return;
    savePlayer({ ...player, emoji });
  }, [player, savePlayer]);

  // Refill diário manual (para testes)
  const forceRefill = useCallback(() => {
    if (!player) return;
    if (player.energy >= INITIAL_ENERGY) return;
    
    const updated = {
      ...player,
      energy: INITIAL_ENERGY,
      lastRefillDate: getTodayDateString(),
    };
    savePlayer(updated);
  }, [player, savePlayer]);

  // Logout (limpa dados locais)
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPlayer(null);
  }, []);

  // Quantidade de convites válidos restantes
  const remainingReferralRewards = player 
    ? Math.max(0, MAX_REFERRAL_REWARDS - player.referrals.length) 
    : 0;

  return {
    player,
    isLoaded,
    isRegistered: !!player,
    skemaYear: getSkemaYear(),
    skemaDay: getSkemaDay(),
    remainingReferralRewards,
    transferTax: TRANSFER_TAX,
    actions: {
      register,
      validateInviteCode,
      updateEnergy,
      deductEnergy,
      addEnergy,
      transferEnergy,
      updateStats,
      updateEmoji,
      forceRefill,
      logout,
    },
  };
}
