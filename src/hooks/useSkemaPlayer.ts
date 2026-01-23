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
  password?: string; // Senha simples para retornar
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
const ACCOUNTS_KEY = 'skema_accounts'; // Registro global de contas (código -> dados completos)
const INITIAL_ENERGY = 10;
const REFERRAL_REWARD = 10;
const MAX_REFERRAL_REWARDS = 10;
const TRANSFER_TAX = 0.0643; // 6.43%

// Códigos de convite master (para primeiros jogadores)
const MASTER_INVITE_CODES = ['SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI'];

// Guardião do Universo - jogador fixo "skema"
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

function generatePlayerId(): string {
  return `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calendário SKEMA:
 * - Nascimento: 12/07/1970 às 00:18 (epoch)
 * - 1 dia Skema = 2 horas reais (ratio 1:12)
 * - 1 ano Skema = 365 dias Skema = ~30.4 dias reais
 */
const SKEMA_EPOCH = new Date('1970-07-12T00:18:00').getTime();
const REAL_HOURS_PER_SKEMA_DAY = 2;
const SKEMA_DAYS_PER_YEAR = 365;

function getSkemaTimeSinceEpoch(): { years: number; days: number; hours: number } {
  const now = Date.now();
  const msElapsed = now - SKEMA_EPOCH;
  
  // Converte para horas reais
  const realHours = msElapsed / (1000 * 60 * 60);
  
  // Converte para dias Skema (2h real = 1 dia Skema)
  const totalSkemaDays = Math.floor(realHours / REAL_HOURS_PER_SKEMA_DAY);
  
  // Calcula anos e dias
  const years = Math.floor(totalSkemaDays / SKEMA_DAYS_PER_YEAR);
  const days = (totalSkemaDays % SKEMA_DAYS_PER_YEAR) + 1; // 1-indexed
  
  // Hora dentro do dia Skema (0-23 equivalente)
  const hoursIntoCurrentSkemaDay = (realHours % REAL_HOURS_PER_SKEMA_DAY);
  const skemaHour = Math.floor((hoursIntoCurrentSkemaDay / REAL_HOURS_PER_SKEMA_DAY) * 24);
  
  return { years: years + 1, days, hours: skemaHour }; // year 1-indexed
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
    const syncReferrals = (currentPlayer: SkemaPlayer): SkemaPlayer => {
      const REFERRALS_BY_INVITE_KEY = 'skema_referrals_by_invite_code';
      const INVITER_ENERGY_KEY = 'skema_inviter_energy_credits';
      
      let updatedPlayer = { ...currentPlayer };
      let needsSave = false;
      
      // 1. Sincroniza créditos de energia pendentes (novo sistema)
      try {
        const storedCredits = localStorage.getItem(INVITER_ENERGY_KEY);
        if (storedCredits) {
          const energyCredits = JSON.parse(storedCredits);
          if (energyCredits[currentPlayer.id]?.pending > 0) {
            const pending = energyCredits[currentPlayer.id].pending;
            updatedPlayer.energy += pending;
            console.log(`[SKEMA] ✅ +k$${pending} sincronizado de convites realizados!`);
            
            // Zera os créditos pendentes
            energyCredits[currentPlayer.id].pending = 0;
            localStorage.setItem(INVITER_ENERGY_KEY, JSON.stringify(energyCredits));
            needsSave = true;
          }
        }
      } catch (e) {
        console.error('[SKEMA] Erro ao sincronizar créditos pendentes:', e);
      }
      
      // 2. Sincroniza lista de referrals
      const storedReferrals = localStorage.getItem(REFERRALS_BY_INVITE_KEY);
      if (storedReferrals) {
        try {
          const referralsByInvite = JSON.parse(storedReferrals);
          if (referralsByInvite[currentPlayer.inviteCode]) {
            const globalReferrals = referralsByInvite[currentPlayer.inviteCode] as string[];
            const mergedReferrals = [...new Set([...(currentPlayer.referrals || []), ...globalReferrals])];
            
            if (mergedReferrals.length > (updatedPlayer.referrals?.length || 0)) {
              updatedPlayer.referrals = mergedReferrals;
              needsSave = true;
            }
          }
        } catch (e) {
          console.error('[SKEMA] Erro ao sincronizar referrals:', e);
        }
      }
      
      // 3. Migração: verifica também o registro antigo por ID
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
              needsSave = true;
            }
          }
        }
      } catch (e) {
        console.error('[SKEMA] Erro ao migrar referrals antigos:', e);
      }
      
      if (needsSave) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlayer));
      }
      
      return updatedPlayer;
    };

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        let parsed = JSON.parse(stored) as SkemaPlayer;
        
        // Verifica refill diário
        const today = getTodayDateString();
        if (parsed.lastRefillDate !== today && parsed.energy < INITIAL_ENERGY) {
          parsed.energy = INITIAL_ENERGY;
          parsed.lastRefillDate = today;
        }
        
        // Sincroniza referrals do registro global
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
    } catch (e) {
      console.error('Erro ao carregar jogador:', e);
    }
    setIsLoaded(true);
  }, []);

  // Salva no localStorage E no registro global de contas
  const savePlayer = useCallback((updated: SkemaPlayer) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setPlayer(updated);
    
    // Atualiza registro global de contas (para login futuro)
    try {
      const storedAccounts = localStorage.getItem(ACCOUNTS_KEY);
      const accounts = storedAccounts ? JSON.parse(storedAccounts) : {};
      accounts[updated.inviteCode] = updated;
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error('[SKEMA] Erro ao salvar conta global:', e);
    }
  }, []);

  // Valida código de convite - busca no registro global OU aceita formato válido
  const validateInviteCode = useCallback((code: string): { valid: boolean; inviterId: string | null; inviterName?: string } => {
    const upperCode = code.toUpperCase().trim();
    console.log('[SKEMA] Validando código:', upperCode);
    
    // Master codes
    if (MASTER_INVITE_CODES.includes(upperCode)) {
      console.log('[SKEMA] Código master válido');
      return { valid: true, inviterId: null, inviterName: 'SKEMA' };
    }
    
    // Busca no registro global de códigos (se existir no localStorage)
    const storedRegistry = localStorage.getItem(CODE_REGISTRY_KEY);
    console.log('[SKEMA] Registry raw:', storedRegistry);
    
    if (storedRegistry) {
      try {
        const registry = JSON.parse(storedRegistry) as Record<string, CodeRegistryEntry>;
        console.log('[SKEMA] Registry parsed:', registry);
        console.log('[SKEMA] Buscando código:', upperCode, 'encontrado:', registry[upperCode]);
        
        if (registry[upperCode]) {
          return { valid: true, inviterId: registry[upperCode].id, inviterName: registry[upperCode].name };
        }
      } catch (e) {
        console.error('[SKEMA] Erro ao parsear registry:', e);
      }
    }
    
    // WORKAROUND: Em aba privada/outro navegador, o registry está vazio
    // Aceita códigos com formato válido: SK + 6 caracteres alfanuméricos
    const validCodePattern = /^SK[A-Z0-9]{6}$/;
    if (validCodePattern.test(upperCode)) {
      console.log('[SKEMA] ✅ Código com formato válido aceito (cross-browser):', upperCode);
      return { valid: true, inviterId: 'unknown', inviterName: 'Jogador SKEMA' };
    }
    
    console.log('[SKEMA] Código não encontrado no registry e formato inválido');
    return { valid: false, inviterId: null };
  }, []);

  // Login com código do jogador + senha
  const login = useCallback((playerCode: string, password: string): { success: boolean; error?: string } => {
    const upperCode = playerCode.toUpperCase().trim();
    const upperPass = password.toUpperCase().trim();
    console.log('[SKEMA] Tentando login com código:', upperCode, 'senha:', upperPass);
    
    // Login especial do Guardião - aceita DEUSPAI em qualquer campo
    if (upperCode === 'DEUSPAI' || upperPass === 'DEUSPAI') {
      const guardian = { ...GUARDIAN_PLAYER };
      savePlayer(guardian);
      console.log('[SKEMA] 🌌 Guardião do Universo logado');
      return { success: true };
    }
    
    // Busca conta no registro global
    try {
      const storedAccounts = localStorage.getItem(ACCOUNTS_KEY);
      if (storedAccounts) {
        const accounts = JSON.parse(storedAccounts) as Record<string, SkemaPlayer>;
        const account = accounts[upperCode];
        
        if (account) {
          // Verifica senha
          if (account.password !== password) {
            console.log('[SKEMA] ❌ Senha incorreta');
            return { success: false, error: 'Senha incorreta' };
          }
          
          // Login bem-sucedido - restaura dados
          console.log('[SKEMA] ✅ Login bem-sucedido:', account.name);
          savePlayer(account);
          return { success: true };
        }
      }
    } catch (e) {
      console.error('[SKEMA] Erro ao fazer login:', e);
    }
    
    return { success: false, error: 'Conta não encontrada' };
  }, [savePlayer]);

  // Registra novo jogador com senha
  const register = useCallback((name: string, inviteCode: string, emoji: string = '🎮', password?: string): { success: boolean; error?: string; playerCode?: string } => {
    const upperCode = inviteCode.toUpperCase().trim();
    
    // Login especial do Guardião
    if (upperCode === 'DEUSPAI') {
      const guardian = { ...GUARDIAN_PLAYER };
      savePlayer(guardian);
      
      // Registra código do guardião no registry global
      const storedRegistry = localStorage.getItem(CODE_REGISTRY_KEY);
      const registry = storedRegistry ? JSON.parse(storedRegistry) : {};
      registry[guardian.inviteCode] = { id: guardian.id, name: guardian.name };
      localStorage.setItem(CODE_REGISTRY_KEY, JSON.stringify(registry));
      setCodeRegistry(registry);
      
      console.log('[SKEMA] 🌌 Guardião do Universo logado:', guardian.name);
      return { success: true, playerCode: guardian.inviteCode };
    }
    
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
    
    // Valida senha
    const trimmedPassword = (password || '').trim();
    if (trimmedPassword.length < 4) {
      return { success: false, error: 'Senha deve ter pelo menos 4 caracteres' };
    }
    if (trimmedPassword.length > 20) {
      return { success: false, error: 'Senha deve ter no máximo 20 caracteres' };
    }

    const newInviteCode = generateInviteCode();
    
    const newPlayer: SkemaPlayer = {
      id: generatePlayerId(),
      name: trimmedName,
      emoji,
      inviteCode: newInviteCode,
      password: trimmedPassword,
      invitedBy: validation.inviterId,
      invitedByName: validation.inviterName || null,
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
    
    // ========== IMPORTANTE: Atualiza referrals ANTES de trocar jogador ==========
    const usedInviteCode = inviteCode.toUpperCase().trim();
    const isMasterCode = MASTER_INVITE_CODES.includes(usedInviteCode);
    
    if (!isMasterCode) {
      const REFERRALS_BY_INVITE_KEY = 'skema_referrals_by_invite_code';
      const INVITER_ENERGY_KEY = 'skema_inviter_energy_credits';
      
      try {
        // 1. Salva no registro global de referrals (persistente entre sessões)
        const storedReferrals = localStorage.getItem(REFERRALS_BY_INVITE_KEY);
        const referralsByInvite = storedReferrals ? JSON.parse(storedReferrals) : {};
        
        if (!referralsByInvite[usedInviteCode]) {
          referralsByInvite[usedInviteCode] = [];
        }
        
        const isNewReferral = !referralsByInvite[usedInviteCode].includes(newPlayer.id);
        
        if (isNewReferral) {
          referralsByInvite[usedInviteCode].push(newPlayer.id);
          console.log(`[SKEMA] ✅ Convite contabilizado: ${usedInviteCode} convidou ${newPlayer.name} (${newPlayer.id})`);
          console.log(`[SKEMA] Total referrals para ${usedInviteCode}:`, referralsByInvite[usedInviteCode].length);
          
          localStorage.setItem(REFERRALS_BY_INVITE_KEY, JSON.stringify(referralsByInvite));
          
          // 2. Busca inviter pelo código no registry global (NÃO pelo player atual)
          const storedRegistry = localStorage.getItem(CODE_REGISTRY_KEY);
          const globalRegistry = storedRegistry ? JSON.parse(storedRegistry) : {};
          const inviterEntry = globalRegistry[usedInviteCode];
          
          if (inviterEntry) {
            // 3. Credita energia no registro de créditos pendentes (será sincronizado no login do inviter)
            const storedCredits = localStorage.getItem(INVITER_ENERGY_KEY);
            const energyCredits = storedCredits ? JSON.parse(storedCredits) : {};
            
            if (!energyCredits[inviterEntry.id]) {
              energyCredits[inviterEntry.id] = { pending: 0, referralCount: 0 };
            }
            
            const currentCount = energyCredits[inviterEntry.id].referralCount || 0;
            if (currentCount < MAX_REFERRAL_REWARDS) {
              energyCredits[inviterEntry.id].pending = (energyCredits[inviterEntry.id].pending || 0) + REFERRAL_REWARD;
              energyCredits[inviterEntry.id].referralCount = currentCount + 1;
              localStorage.setItem(INVITER_ENERGY_KEY, JSON.stringify(energyCredits));
              console.log(`[SKEMA] 💰 +k$${REFERRAL_REWARD} creditado para ${inviterEntry.name} (aguardando sync)`);
            }
          }
        } else {
          localStorage.setItem(REFERRALS_BY_INVITE_KEY, JSON.stringify(referralsByInvite));
        }
      } catch (e) {
        console.error('[SKEMA] Erro ao registrar referral:', e);
      }
    }
    
    // Registro auxiliar de convites (metadata)
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
    
    // ========== Agora sim, troca para o novo jogador ==========
    savePlayer(newPlayer);
    
    // Registra o código deste jogador no registro global
    const storedRegistry = localStorage.getItem(CODE_REGISTRY_KEY);
    const currentRegistry = storedRegistry ? JSON.parse(storedRegistry) : {};
    currentRegistry[newInviteCode] = { id: newPlayer.id, name: newPlayer.name };
    localStorage.setItem(CODE_REGISTRY_KEY, JSON.stringify(currentRegistry));
    setCodeRegistry(currentRegistry);
    
    console.log(`[SKEMA] 🎉 Novo jogador registrado: ${newPlayer.name} (código: ${newInviteCode})`);

    return { success: true, playerCode: newInviteCode };
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
    isGuardian: player?.id === GUARDIAN_PLAYER.id,
    skemaYear: getSkemaYear(),
    skemaDay: getSkemaDay(),
    remainingReferralRewards,
    transferTax: TRANSFER_TAX,
    actions: {
      register,
      login,
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
