/**
 * useSupabasePlayer - Sistema de jogador SKEMA com Supabase
 * 
 * Substitui useSkemaPlayer usando Supabase para persistência:
 * - Autenticação via Supabase Auth
 * - Perfil e stats salvos no banco
 * - Cache local para offline/performance
 * - Sincronização automática
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { addCurrency, roundCurrency } from '@/lib/currencyUtils';

// ==================== TIPOS ====================

export type PlayerTier = 'master_admin' | 'guardiao' | 'grao_mestre' | 'mestre' | 'jogador';

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
  referrals: string[];
  playerTier: PlayerTier;
  isKeeper: boolean;
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

const CACHE_KEY = 'skema_player_cache';
const INITIAL_ENERGY = 10;
const REFERRAL_REWARD = 10;
const MAX_REFERRAL_REWARDS = 10;
const TRANSFER_TAX = 0.0643;

// Códigos de convite master
const MASTER_INVITE_CODES = ['SKEMA1', 'SKEMA2024', 'PRIMEIROSJOGADORES', 'BETATESTER', 'DEUSPAI'];

// ==================== HELPERS ====================

/**
 * Calendário SKEMA:
 * - Nascimento: 12/07/1970 às 00:18 (epoch)
 * - 1 dia Skema = 2 horas reais
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

function toCents(value: number): number {
  return Math.round(value * 100);
}

// ==================== HOOK ====================

export function useSupabasePlayer() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [player, setPlayer] = useState<SkemaPlayer | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const playerRef = useRef<SkemaPlayer | null>(null);
  playerRef.current = player;

  // ==================== AUTH STATE ====================
  
  useEffect(() => {
    // Set up auth listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[SUPABASE] Auth state changed:', event);
      setSession(session);
      setUser(session?.user ?? null);
      
      // Defer profile fetch to avoid deadlock
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      } else {
        setPlayer(null);
        setIsLoaded(true);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        // Try to load from cache for offline
        loadFromCache();
        setIsLoaded(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ==================== PROFILE FETCHING ====================

  const fetchProfile = async (userId: string) => {
    console.log('[SUPABASE] Fetching profile for user:', userId);
    setIsLoading(true);
    
    try {
      // Fetch profile with player_tier
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          emoji,
          invite_code,
          invited_by,
          invited_by_name,
          created_at,
          energy,
          last_refill_date,
          stats_wins,
          stats_races,
          stats_best_time,
          player_tier
        `)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[SUPABASE] Error fetching profile:', error);
        loadFromCache();
        setIsLoaded(true);
        setIsLoading(false);
        return;
      }

      if (!profile) {
        console.log('[SUPABASE] No profile found for user');
        setPlayer(null);
        setIsLoaded(true);
        setIsLoading(false);
        return;
      }

      // Check if user is master_admin (only HX has infinite energy)
      const { data: isMasterAdmin } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'master_admin'
      });
      
      const isKeeper = isMasterAdmin === true;

      // Fetch referrals count
      const { count: referralsCount } = await supabase
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('inviter_id', profile.id);

      const playerTier = (profile.player_tier as PlayerTier) || 'jogador';
      
      const skemaPlayer: SkemaPlayer = {
        id: profile.id,
        name: profile.name,
        emoji: profile.emoji,
        inviteCode: profile.invite_code,
        invitedBy: profile.invited_by,
        invitedByName: profile.invited_by_name,
        registeredAt: profile.created_at,
        // Keepers have infinite energy (displayed as 999999)
        energy: isKeeper ? 999999 : Number(profile.energy),
        lastRefillDate: profile.last_refill_date,
        referrals: Array(referralsCount || 0).fill(''), // Just for count
        playerTier,
        isKeeper,
        stats: {
          wins: profile.stats_wins || 0,
          races: profile.stats_races || 0,
          bestTime: profile.stats_best_time || 0,
        },
      };

      console.log('[SUPABASE] Profile loaded:', skemaPlayer.name, 'Tier:', playerTier, 'Keeper:', isKeeper, 'Energy:', skemaPlayer.energy);
      setPlayer(skemaPlayer);
      saveToCache(skemaPlayer);
      
    } catch (e) {
      console.error('[SUPABASE] Unexpected error:', e);
      loadFromCache();
    }
    
    setIsLoaded(true);
    setIsLoading(false);
  };

  // ==================== CACHE ====================

  const saveToCache = (p: SkemaPlayer) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(p));
    } catch (e) {
      console.warn('[SUPABASE] Failed to save cache:', e);
    }
  };

  const loadFromCache = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as SkemaPlayer;
        console.log('[SUPABASE] Loaded from cache:', parsed.name);
        setPlayer(parsed);
      }
    } catch (e) {
      console.warn('[SUPABASE] Failed to load cache:', e);
    }
  };

  // ==================== VALIDATE INVITE CODE ====================

  const validateInviteCode = useCallback(async (code: string): Promise<{ valid: boolean; inviterId: string | null; inviterName?: string }> => {
    const upperCode = code.toUpperCase().trim();
    
    // Master codes
    if (MASTER_INVITE_CODES.includes(upperCode)) {
      return { valid: true, inviterId: null, inviterName: 'SKEMA' };
    }
    
    // Check format SK + 6 chars
    const validCodePattern = /^SK[A-Z0-9]{6}$/;
    if (!validCodePattern.test(upperCode)) {
      return { valid: false, inviterId: null };
    }
    
    // Look up in database
    const { data: inviter } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('invite_code', upperCode)
      .maybeSingle();
    
    if (inviter) {
      return { valid: true, inviterId: inviter.id, inviterName: inviter.name };
    }
    
    // Accept valid format even if not found (might be new)
    return { valid: true, inviterId: null, inviterName: 'Jogador SKEMA' };
  }, []);

  // ==================== REGISTER (uses Auth page now) ====================

  const register = useCallback(async (
    name: string, 
    inviteCode: string, 
    emoji: string = '🎮',
    _password?: string
  ): Promise<{ success: boolean; error?: string; playerCode?: string }> => {
    // Registration now happens via Auth page
    // This is kept for compatibility but redirects to auth flow
    console.log('[SUPABASE] Register called - should use /auth page');
    return { success: false, error: 'Use a página de autenticação para registrar' };
  }, []);

  // ==================== LOGIN (uses Auth page now) ====================

  const login = useCallback(async (
    _playerCode: string, 
    _password: string
  ): Promise<{ success: boolean; error?: string }> => {
    console.log('[SUPABASE] Login called - should use /auth page');
    return { success: false, error: 'Use a página de autenticação para fazer login' };
  }, []);

  // ==================== ENERGY OPERATIONS ====================

  const updateEnergy = useCallback(async (amount: number) => {
    const current = playerRef.current;
    if (!current) return;

    // Optimistic update
    const newEnergy = Math.max(0, addCurrency(current.energy, amount));
    setPlayer(prev => prev ? { ...prev, energy: newEnergy } : null);

    // Persist to database
    try {
      const { error } = await supabase.rpc('update_player_energy', {
        p_player_id: current.id,
        p_amount: amount
      });

      if (error) {
        console.error('[SUPABASE] Failed to update energy:', error);
        // Revert optimistic update
        setPlayer(prev => prev ? { ...prev, energy: current.energy } : null);
        return;
      }

      // Update cache
      saveToCache({ ...current, energy: newEnergy });
      console.log('[SUPABASE] Energy updated:', amount, '→', newEnergy);
    } catch (e) {
      console.error('[SUPABASE] Energy update error:', e);
    }
  }, []);

  const deductEnergy = useCallback((amount: number): boolean => {
    const current = playerRef.current;
    if (!current) return false;

    // Keepers have infinite energy - always allow
    if (current.isKeeper) {
      console.log('[SUPABASE] Keeper bypass - no energy deduction');
      return true;
    }

    const currentCents = toCents(roundCurrency(current.energy));
    const amountCents = toCents(roundCurrency(amount));
    if (currentCents < amountCents) return false;
    
    updateEnergy(-amount);
    return true;
  }, [updateEnergy]);

  const addEnergy = useCallback((amount: number) => {
    updateEnergy(amount);
  }, [updateEnergy]);

  const transferEnergy = useCallback((amount: number, _toPlayerId: string): { success: boolean; error?: string } => {
    const current = playerRef.current;
    if (!current) return { success: false, error: 'Jogador não encontrado' };
    
    const totalCost = roundCurrency(amount * (1 + TRANSFER_TAX));
    const currentCents = toCents(roundCurrency(current.energy));
    const totalCostCents = toCents(totalCost);
    
    if (currentCents < totalCostCents) {
      return { success: false, error: 'Energia insuficiente (inclua a taxa de 6.43%)' };
    }
    
    updateEnergy(-totalCost);
    // TODO: Implement recipient credit via edge function
    
    return { success: true };
  }, [updateEnergy]);

  // ==================== STATS OPERATIONS ====================

  const updateStats = useCallback(async (result: { won: boolean; time?: number }) => {
    const current = playerRef.current;
    if (!current) return;

    // Optimistic update
    const newStats = {
      ...current.stats,
      races: current.stats.races + 1,
      wins: current.stats.wins + (result.won ? 1 : 0),
      bestTime: result.won && result.time
        ? (current.stats.bestTime === 0 ? result.time : Math.min(current.stats.bestTime, result.time))
        : current.stats.bestTime,
    };

    setPlayer(prev => prev ? { ...prev, stats: newStats } : null);

    // Persist to database
    try {
      const updates: Record<string, unknown> = {
        stats_races: newStats.races,
        stats_wins: newStats.wins,
      };
      
      if (result.won && result.time) {
        updates.stats_best_time = newStats.bestTime;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', current.id);

      if (error) {
        console.error('[SUPABASE] Failed to update stats:', error);
        return;
      }

      saveToCache({ ...current, stats: newStats });
      console.log('[SUPABASE] Stats updated:', newStats);
    } catch (e) {
      console.error('[SUPABASE] Stats update error:', e);
    }
  }, []);

  const updateEmoji = useCallback(async (emoji: string) => {
    const current = playerRef.current;
    if (!current) return;

    setPlayer(prev => prev ? { ...prev, emoji } : null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ emoji })
        .eq('id', current.id);

      if (error) {
        console.error('[SUPABASE] Failed to update emoji:', error);
        setPlayer(prev => prev ? { ...prev, emoji: current.emoji } : null);
        return;
      }

      saveToCache({ ...current, emoji });
    } catch (e) {
      console.error('[SUPABASE] Emoji update error:', e);
    }
  }, []);

  const forceRefill = useCallback(async () => {
    const current = playerRef.current;
    if (!current || current.energy >= INITIAL_ENERGY) return;

    const today = new Date().toISOString().split('T')[0];
    
    setPlayer(prev => prev ? { 
      ...prev, 
      energy: INITIAL_ENERGY, 
      lastRefillDate: today 
    } : null);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          energy: INITIAL_ENERGY, 
          last_refill_date: today 
        })
        .eq('id', current.id);

      if (error) {
        console.error('[SUPABASE] Failed to refill:', error);
        return;
      }

      saveToCache({ ...current, energy: INITIAL_ENERGY, lastRefillDate: today });
      console.log('[SUPABASE] Energy refilled to', INITIAL_ENERGY);
    } catch (e) {
      console.error('[SUPABASE] Refill error:', e);
    }
  }, []);

  // ==================== LOGOUT ====================

  const logout = useCallback(async () => {
    console.log('[SUPABASE] Logging out...');
    
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('[SUPABASE] Signout error:', e);
    }
    
    localStorage.removeItem(CACHE_KEY);
    setPlayer(null);
    setUser(null);
    setSession(null);
    
    console.log('[SUPABASE] Logged out');
  }, []);

  // ==================== PROCESS REFERRAL REWARDS ====================

  const processReferralRewards = useCallback(async () => {
    if (!session?.access_token) return { processed: 0, total_reward: 0 };

    try {
      const { data, error } = await supabase.functions.invoke('process-referral-rewards', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('[SUPABASE] Failed to process referrals:', error);
        return { processed: 0, total_reward: 0 };
      }

      if (data?.total_reward > 0) {
        // Refresh profile to get updated energy
        if (user) {
          await fetchProfile(user.id);
        }
      }

      return data;
    } catch (e) {
      console.error('[SUPABASE] Referral processing error:', e);
      return { processed: 0, total_reward: 0 };
    }
  }, [session, user]);

  // ==================== COMPUTED VALUES ====================

  const remainingReferralRewards = player 
    ? Math.max(0, MAX_REFERRAL_REWARDS - player.referrals.length) 
    : 0;

  const isGuardian = user?.email?.includes('guardian') || false;

  // ==================== RETURN ====================

  return {
    player,
    user,
    session,
    isLoaded,
    isLoading,
    isRegistered: !!player,
    isGuardian,
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
      processReferralRewards,
      refreshProfile: () => user && fetchProfile(user.id),
    },
  };
}

// Export para compatibilidade
export { useSupabasePlayer as useSkemaPlayer };
