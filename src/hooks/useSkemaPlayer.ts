/**
 * useSkemaPlayer - Sistema local de jogador SKEMA
 * 
 * Usa localStorage para persistir:
 * - Nome e emoji do jogador
 * - Código de convite único
 * - Energia (k$)
 * - Missão de convites (pending invites)
 * - Senha para retorno
 */

import { useState, useEffect, useCallback } from 'react';

// ==================== TIPOS ====================

export interface SkemaPlayer {
  id: string;
  name: string;
  emoji: string;
  inviteCode: string;
  invitedBy: string | null;
  invitedByName?: string | null;
  registeredAt: string;
  energy: number;
  lastRefillDate: string;
  referrals: string[]; // IDs de jogadores convidados
  password?: string; // Senha para retorno
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

// Convites pendentes - cada um é único e rastreável
export interface PendingInvite {
  code: string;          // SKINVXXXXXX
  creatorId: string;
  creatorCode: string;   // Código principal do criador
  createdAt: string;
  used: boolean;
  usedBy?: string;       // Nome de quem usou
  usedAt?: string;
}

// ==================== CONSTANTES ====================

const STORAGE_KEY = 'skema_player';
const INVITES_KEY = 'skema_invites';
const CODE_REGISTRY_KEY = 'skema_code_registry';
const PENDING_INVITES_KEY = 'skema_pending_invites';
const REFERRALS_BY_INVITE_KEY = 'skema_referrals_by_invite_code';
const INITIAL_ENERGY = 10;
const REFERRAL_REWARD = 10;
const MAX_REFERRAL_REWARDS = 10;
const TRANSFER_TAX = 0.0643;

// Códigos master
const MASTER_INVITE_CODES = ['SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI'];

// Guardião do Universo
const GUARDIAN_PLAYER: SkemaPlayer = {
  id: 'guardian-skema-universe',
  name: 'skema',
  emoji: '🌌',
  inviteCode: 'SKGUARDIAN',
  invitedBy: null,
  invitedByName: 'Universo SKEMA',
  registeredAt: '2024-01-01T00:00:00.000Z',
  energy: 9999,
  lastRefillDate: '2099-12-31',
  referrals: [],
  password: 'DEUSPAI',
  stats: { wins: 0, races: 0, bestTime: 0 },
};

// ==================== HELPERS ====================

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SK';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generatePendingInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SKINV';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generatePlayerId(): string {
  return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calendário SKEMA
 */
const SKEMA_EPOCH = new Date('1970-07-12T00:18:00').getTime();
const REAL_HOURS_PER_SKEMA_DAY = 2;
const SKEMA_DAYS_PER_YEAR = 365;

function getSkemaTimeSinceEpoch(): { years: number; days: number; hours: number } {
  const now = Date.now();
  const msElapsed = now - SKEMA_EPOCH;
  const realHours = msElapsed / (1000 * 60 * 60);
  const totalSkemaDays = Math.floor(realHours / REAL_HOURS_PER_SKEMA_DAY);
  const years = Math.floor(totalSkemaDays / SKEMA_DAYS_PER_YEAR);
  const days = (totalSkemaDays % SKEMA_DAYS_PER_YEAR) + 1;
  const hoursIntoCurrentSkemaDay = (realHours % REAL_HOURS_PER_SKEMA_DAY);
  const skemaHour = Math.floor((hoursIntoCurrentSkemaDay / REAL_HOURS_PER_SKEMA_DAY) * 24);
  return { years: years + 1, days, hours: skemaHour };
}

function getSkemaYear(): number {
  return getSkemaTimeSinceEpoch().years;
}

function getSkemaDay(): number {
  return getSkemaTimeSinceEpoch().days;
}

export function getSkemaHour(): number {
  return getSkemaTimeSinceEpoch().hours;
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

// ==================== HOOK ====================

interface CodeRegistryEntry {
  id: string;
  name: string;
  password?: string;
}

export function useSkemaPlayer() {
  const [player, setPlayer] = useState<SkemaPlayer | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [allInvites, setAllInvites] = useState<Record<string, InvitedPlayer>>({});
  const [codeRegistry, setCodeRegistry] = useState<Record<string, CodeRegistryEntry>>({});
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);

  // Carrega do localStorage
  useEffect(() => {
    const syncReferrals = (currentPlayer: SkemaPlayer): SkemaPlayer => {
      const storedReferrals = localStorage.getItem(REFERRALS_BY_INVITE_KEY);
      
      let updatedPlayer = { ...currentPlayer };
      let referralsUpdated = false;
      
      if (storedReferrals) {
        try {
          const referralsByInvite = JSON.parse(storedReferrals);
          if (referralsByInvite[currentPlayer.inviteCode]) {
            const globalReferrals = referralsByInvite[currentPlayer.inviteCode] as string[];
            const oldCount = currentPlayer.referrals?.length || 0;
            const mergedReferrals = [...new Set([...(currentPlayer.referrals || []), ...globalReferrals])];
            
            const newReferralsCount = mergedReferrals.length - oldCount;
            
            if (newReferralsCount > 0) {
              const rewardsGiven = Math.min(oldCount, MAX_REFERRAL_REWARDS);
              const rewardsAvailable = MAX_REFERRAL_REWARDS - rewardsGiven;
              const rewardsToGive = Math.min(newReferralsCount, rewardsAvailable);
              
              if (rewardsToGive > 0) {
                updatedPlayer.energy += REFERRAL_REWARD * rewardsToGive;
                console.log(`[SKEMA] ✅ +k$${REFERRAL_REWARD * rewardsToGive} por ${rewardsToGive} novos convites!`);
              }
              
              updatedPlayer.referrals = mergedReferrals;
              referralsUpdated = true;
            }
          }
        } catch (e) {
          console.error('[SKEMA] Erro ao sincronizar referrals:', e);
        }
      }
      
      // Migração: verifica registro antigo por ID
      try {
        const OLD_REFERRALS_KEY = 'skema_referrals_by_player';
        const oldReferrals = localStorage.getItem(OLD_REFERRALS_KEY);
        if (oldReferrals) {
          const oldByPlayer = JSON.parse(oldReferrals);
          if (oldByPlayer[currentPlayer.id]) {
            const oldGlobalReferrals = oldByPlayer[currentPlayer.id] as string[];
            const mergedReferrals = [...new Set([...(updatedPlayer.referrals || []), ...oldGlobalReferrals])];
            if (mergedReferrals.length > (updatedPlayer.referrals?.length || 0)) {
              updatedPlayer.referrals = mergedReferrals;
              referralsUpdated = true;
            }
          }
        }
      } catch (e) {
        console.error('[SKEMA] Erro ao migrar referrals antigos:', e);
      }
      
      if (referralsUpdated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlayer));
      }
      
      return updatedPlayer;
    };

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        let parsed = JSON.parse(stored) as SkemaPlayer;
        
        const today = getTodayDateString();
        if (parsed.lastRefillDate !== today && parsed.energy < INITIAL_ENERGY) {
          parsed.energy = INITIAL_ENERGY;
          parsed.lastRefillDate = today;
        }
        
        parsed = syncReferrals(parsed);
        
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

      // Carrega pending invites
      const storedPending = localStorage.getItem(PENDING_INVITES_KEY);
      if (storedPending) {
        setPendingInvites(JSON.parse(storedPending));
      }
    } catch (e) {
      console.error('Erro ao carregar jogador:', e);
    }
    setIsLoaded(true);
  }, []);

  const savePlayer = useCallback((updated: SkemaPlayer) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setPlayer(updated);
  }, []);

  // Valida código de convite - verifica pending invites E código principal
  const validateInviteCode = useCallback((code: string): { 
    valid: boolean; 
    inviterId: string | null; 
    inviterName?: string;
    isPendingInvite?: boolean;
    pendingInviteCode?: string;
  } => {
    const upperCode = code.toUpperCase().trim();
    console.log('[SKEMA] 🔍 Validando código:', upperCode);
    
    // Master codes
    if (MASTER_INVITE_CODES.includes(upperCode)) {
      console.log('[SKEMA] ✅ Código master válido');
      return { valid: true, inviterId: null, inviterName: 'SKEMA' };
    }
    
    // 1. Verifica pending invites primeiro (SKINVXXXXX) - deve ser NÃO usado
    const storedPending = localStorage.getItem(PENDING_INVITES_KEY);
    if (storedPending) {
      try {
        const pendingList = JSON.parse(storedPending) as PendingInvite[];
        console.log('[SKEMA] 📋 Pending invites no sistema:', pendingList.length);
        
        // Procura o código - pode estar usado ou não
        const pendingInvite = pendingList.find(p => p.code === upperCode);
        
        if (pendingInvite) {
          if (pendingInvite.used) {
            console.log('[SKEMA] ❌ Código SKINV já foi usado por:', pendingInvite.usedBy);
            return { valid: false, inviterId: null };
          }
          
          // Código válido e não usado!
          const registry = JSON.parse(localStorage.getItem(CODE_REGISTRY_KEY) || '{}') as Record<string, CodeRegistryEntry>;
          const creator = registry[pendingInvite.creatorCode];
          console.log('[SKEMA] ✅ Código SKINV válido! Criador:', creator?.name || pendingInvite.creatorCode);
          return { 
            valid: true, 
            inviterId: pendingInvite.creatorId, 
            inviterName: creator?.name || 'Desconhecido',
            isPendingInvite: true,
            pendingInviteCode: upperCode,
          };
        }
      } catch (e) {
        console.error('[SKEMA] Erro ao verificar pending invites:', e);
      }
    }
    
    // 2. Busca no registro global de códigos (SK prefix - código principal do jogador)
    const storedRegistry = localStorage.getItem(CODE_REGISTRY_KEY);
    if (storedRegistry) {
      try {
        const registry = JSON.parse(storedRegistry) as Record<string, CodeRegistryEntry>;
        console.log('[SKEMA] 📋 Códigos no registry:', Object.keys(registry).length);
        
        if (registry[upperCode]) {
          console.log('[SKEMA] ✅ Código principal SK válido! Jogador:', registry[upperCode].name);
          return { valid: true, inviterId: registry[upperCode].id, inviterName: registry[upperCode].name };
        }
      } catch (e) {
        console.error('[SKEMA] Erro ao parsear registry:', e);
      }
    }
    
    console.log('[SKEMA] ❌ Código não encontrado em nenhum registro');
    console.log('[SKEMA] 💡 Códigos válidos: SKINVXXXXX (convite único) ou SKXXXXXX (código do jogador)');
    return { valid: false, inviterId: null };
  }, []);

  // Login com código + senha
  const login = useCallback((playerCode: string, password: string): { success: boolean; error?: string } => {
    const upperCode = playerCode.toUpperCase().trim();
    
    // Verifica guardian
    if (upperCode === 'SKGUARDIAN' && password === 'DEUSPAI') {
      const saved = localStorage.getItem(STORAGE_KEY);
      const existing = saved ? JSON.parse(saved) : {};
      
      const guardian = { 
        ...GUARDIAN_PLAYER, 
        referrals: existing.referrals || [],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(guardian));
      setPlayer(guardian);
      
      const storedRegistry = localStorage.getItem(CODE_REGISTRY_KEY);
      const registry = storedRegistry ? JSON.parse(storedRegistry) : {};
      registry[guardian.inviteCode] = { id: guardian.id, name: guardian.name, password: guardian.password };
      localStorage.setItem(CODE_REGISTRY_KEY, JSON.stringify(registry));
      setCodeRegistry(registry);
      
      console.log('[SKEMA] 🌌 Guardião logado');
      return { success: true };
    }
    
    // Busca no registry
    const storedRegistry = localStorage.getItem(CODE_REGISTRY_KEY);
    if (!storedRegistry) {
      return { success: false, error: 'Nenhuma conta encontrada' };
    }
    
    const registry = JSON.parse(storedRegistry) as Record<string, CodeRegistryEntry>;
    const entry = registry[upperCode];
    
    if (!entry) {
      return { success: false, error: 'Código não encontrado' };
    }
    
    if (entry.password !== password) {
      return { success: false, error: 'Senha incorreta' };
    }
    
    // Carrega dados do jogador - busca em todos os players salvos ou reconstrói
    // Como é localStorage local, reconstruímos o player básico
    const playerData: SkemaPlayer = {
      id: entry.id,
      name: entry.name,
      emoji: '🎮',
      inviteCode: upperCode,
      invitedBy: null,
      invitedByName: null,
      registeredAt: new Date().toISOString(),
      energy: INITIAL_ENERGY,
      lastRefillDate: getTodayDateString(),
      referrals: [],
      password: entry.password,
      stats: { wins: 0, races: 0, bestTime: 0 },
    };
    
    // Tenta carregar dados completos se existirem
    const storedPlayer = localStorage.getItem(STORAGE_KEY);
    if (storedPlayer) {
      const saved = JSON.parse(storedPlayer) as SkemaPlayer;
      if (saved.id === entry.id) {
        // Mesmo jogador, apenas restaura
        setPlayer(saved);
        return { success: true };
      }
    }
    
    // Não encontrou dados salvos, cria novo
    savePlayer(playerData);
    console.log('[SKEMA] 🔓 Login bem-sucedido:', entry.name);
    return { success: true };
  }, [savePlayer]);

  // Registra novo jogador
  const register = useCallback((name: string, inviteCode: string, emoji: string = '🎮', password?: string): { success: boolean; error?: string } => {
    const upperCode = inviteCode.toUpperCase().trim();
    console.log('[SKEMA] 📝 Iniciando registro:', { name, code: upperCode });
    
    // Login especial do Guardião
    if (upperCode === 'DEUSPAI') {
      const saved = localStorage.getItem(STORAGE_KEY);
      const existing = saved ? JSON.parse(saved) : {};
      
      const guardian = { 
        ...GUARDIAN_PLAYER, 
        referrals: existing.referrals || [],
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(guardian));
      setPlayer(guardian);
      
      const storedRegistry = localStorage.getItem(CODE_REGISTRY_KEY);
      const registry = storedRegistry ? JSON.parse(storedRegistry) : {};
      registry[guardian.inviteCode] = { id: guardian.id, name: guardian.name, password: guardian.password };
      localStorage.setItem(CODE_REGISTRY_KEY, JSON.stringify(registry));
      setCodeRegistry(registry);
      
      console.log('[SKEMA] 🌌 Guardião do Universo logado:', guardian.name);
      return { success: true };
    }
    
    const validation = validateInviteCode(inviteCode);
    console.log('[SKEMA] 🔍 Resultado validação:', validation);
    
    if (!validation.valid) {
      console.log('[SKEMA] ❌ Código inválido:', upperCode);
      return { success: false, error: 'Código de convite inválido. Use um código SKINVXXXXX não utilizado ou o código SK de um jogador.' };
    }
    
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2) {
      return { success: false, error: 'Nome deve ter pelo menos 2 caracteres' };
    }
    
    if (trimmedName.length > 15) {
      return { success: false, error: 'Nome deve ter no máximo 15 caracteres' };
    }

    if (!password || password.length < 4) {
      return { success: false, error: 'Senha deve ter pelo menos 4 caracteres' };
    }

    const newInviteCode = generateInviteCode();
    
    const newPlayer: SkemaPlayer = {
      id: generatePlayerId(),
      name: trimmedName,
      emoji,
      inviteCode: newInviteCode,
      invitedBy: validation.inviterId,
      invitedByName: validation.inviterName || null,
      registeredAt: new Date().toISOString(),
      energy: INITIAL_ENERGY,
      lastRefillDate: getTodayDateString(),
      referrals: [],
      password,
      stats: {
        wins: 0,
        races: 0,
        bestTime: 0,
      },
    };
    
    // ========== Atualiza referrals e marca pending invite como usado ==========
    const isMasterCode = MASTER_INVITE_CODES.includes(upperCode);
    
    console.log('[SKEMA] 📊 Processando referral:', { isMasterCode, inviterId: validation.inviterId, isPending: validation.isPendingInvite });
    
    if (!isMasterCode && validation.inviterId) {
      try {
        // 1. Salva no registro global de referrals
        const storedReferrals = localStorage.getItem(REFERRALS_BY_INVITE_KEY);
        const referralsByInvite = storedReferrals ? JSON.parse(storedReferrals) : {};
        
        // Usa o código do inviter (não o pending invite code)
        const storedRegistry = localStorage.getItem(CODE_REGISTRY_KEY);
        const registry = storedRegistry ? JSON.parse(storedRegistry) : {};
        
        // Encontra o código principal do inviter
        let inviterMainCode: string | null = null;
        for (const [code, entry] of Object.entries(registry)) {
          if ((entry as CodeRegistryEntry).id === validation.inviterId) {
            inviterMainCode = code;
            break;
          }
        }
        
        console.log('[SKEMA] 🔗 Código principal do inviter:', inviterMainCode);
        
        if (inviterMainCode) {
          if (!referralsByInvite[inviterMainCode]) {
            referralsByInvite[inviterMainCode] = [];
          }
          
          if (!referralsByInvite[inviterMainCode].includes(newPlayer.id)) {
            referralsByInvite[inviterMainCode].push(newPlayer.id);
            console.log(`[SKEMA] ✅ Referral salvo para ${inviterMainCode}: agora tem ${referralsByInvite[inviterMainCode].length} referrals`);
          }
          
          localStorage.setItem(REFERRALS_BY_INVITE_KEY, JSON.stringify(referralsByInvite));
        } else {
          console.log('[SKEMA] ⚠️ Não encontrou código principal do inviter no registry');
        }
        
        // 2. Se era pending invite, marca como usado
        if (validation.isPendingInvite && validation.pendingInviteCode) {
          const storedPending = localStorage.getItem(PENDING_INVITES_KEY);
          if (storedPending) {
            const pendingList = JSON.parse(storedPending) as PendingInvite[];
            const updated = pendingList.map(p => 
              p.code === validation.pendingInviteCode 
                ? { ...p, used: true, usedBy: newPlayer.name, usedAt: new Date().toISOString() }
                : p
            );
            localStorage.setItem(PENDING_INVITES_KEY, JSON.stringify(updated));
            setPendingInvites(updated);
            console.log(`[SKEMA] 🎟️ Pending invite ${validation.pendingInviteCode} marcado como usado por ${newPlayer.name}`);
          }
        }
      } catch (e) {
        console.error('[SKEMA] Erro ao registrar referral:', e);
      }
    }
    
    // Registro auxiliar de convites
    if (validation.inviterId) {
      const invites = { ...allInvites };
      invites[newPlayer.id] = {
        id: newPlayer.id,
        name: newPlayer.name,
        invitedAt: newPlayer.registeredAt,
      };
      localStorage.setItem(INVITES_KEY, JSON.stringify(invites));
      setAllInvites(invites);
    }
    
    // Salva o novo jogador
    savePlayer(newPlayer);
    
    // Registra código no registry global
    const storedRegistry = localStorage.getItem(CODE_REGISTRY_KEY);
    const currentRegistry = storedRegistry ? JSON.parse(storedRegistry) : {};
    currentRegistry[newInviteCode] = { id: newPlayer.id, name: newPlayer.name, password };
    localStorage.setItem(CODE_REGISTRY_KEY, JSON.stringify(currentRegistry));
    setCodeRegistry(currentRegistry);
    
    console.log(`[SKEMA] 🎉 Novo jogador: ${newPlayer.name} (código: ${newInviteCode})`);

    return { success: true };
  }, [validateInviteCode, savePlayer, allInvites]);

  // Gera novo convite pendente
  const generatePendingInvite = useCallback((): { success: boolean; code?: string; error?: string } => {
    if (!player) return { success: false, error: 'Jogador não encontrado' };
    
    // Carrega lista atual
    const storedPending = localStorage.getItem(PENDING_INVITES_KEY);
    const pendingList = storedPending ? JSON.parse(storedPending) as PendingInvite[] : [];
    
    // Filtra convites deste jogador
    const myPendingInvites = pendingList.filter(p => p.creatorId === player.id);
    const usedCount = myPendingInvites.filter(p => p.used).length;
    
    // Limite de 10 convites usados
    if (usedCount >= MAX_REFERRAL_REWARDS) {
      return { success: false, error: 'Limite de 10 convites atingido' };
    }
    
    // Gera novo código único
    let newCode = generatePendingInviteCode();
    while (pendingList.some(p => p.code === newCode)) {
      newCode = generatePendingInviteCode();
    }
    
    const newPending: PendingInvite = {
      code: newCode,
      creatorId: player.id,
      creatorCode: player.inviteCode,
      createdAt: new Date().toISOString(),
      used: false,
    };
    
    const updated = [...pendingList, newPending];
    localStorage.setItem(PENDING_INVITES_KEY, JSON.stringify(updated));
    setPendingInvites(updated);
    
    console.log(`[SKEMA] 🎟️ Novo convite gerado: ${newCode}`);
    return { success: true, code: newCode };
  }, [player]);

  // Lista pending invites do jogador atual
  const getMyPendingInvites = useCallback((): PendingInvite[] => {
    if (!player) return [];
    return pendingInvites.filter(p => p.creatorId === player.id);
  }, [player, pendingInvites]);

  // Atualiza energia
  const updateEnergy = useCallback((amount: number) => {
    if (!player) return;
    
    const updated = {
      ...player,
      energy: Math.max(0, player.energy + amount),
    };
    savePlayer(updated);
  }, [player, savePlayer]);

  const deductEnergy = useCallback((amount: number): boolean => {
    if (!player) return false;
    if (player.energy < amount) return false;
    
    updateEnergy(-amount);
    return true;
  }, [player, updateEnergy]);

  const addEnergy = useCallback((amount: number) => {
    updateEnergy(amount);
  }, [updateEnergy]);

  const transferEnergy = useCallback((amount: number, toPlayerId: string): { success: boolean; error?: string } => {
    if (!player) return { success: false, error: 'Jogador não encontrado' };
    
    const totalCost = amount * (1 + TRANSFER_TAX);
    if (player.energy < totalCost) {
      return { success: false, error: 'Energia insuficiente (inclua a taxa de 6.43%)' };
    }
    
    updateEnergy(-totalCost);
    return { success: true };
  }, [player, updateEnergy]);

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

  const updateEmoji = useCallback((emoji: string) => {
    if (!player) return;
    savePlayer({ ...player, emoji });
  }, [player, savePlayer]);

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

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setPlayer(null);
  }, []);

  const remainingReferralRewards = player 
    ? Math.max(0, MAX_REFERRAL_REWARDS - player.referrals.length) 
    : 0;

  return {
    player,
    isLoaded,
    isRegistered: !!player,
    isGuardian: player?.id === GUARDIAN_PLAYER.id,
    skemaYear: getSkemaYear(),
    skemaDay: getSkemaDay(),
    remainingReferralRewards,
    transferTax: TRANSFER_TAX,
    pendingInvites: player ? pendingInvites.filter(p => p.creatorId === player.id) : [],
    actions: {
      register,
      login,
      validateInviteCode,
      generatePendingInvite,
      getMyPendingInvites,
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
