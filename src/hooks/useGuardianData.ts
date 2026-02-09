/**
 * useGuardianData - Hook para buscar dados administrativos do painel Guardian
 * Verifica role e busca métricas, usuários, convites, transações e corridas
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface DashboardStats {
  totalPlayers: number;
  totalEnergy: number;
  hxEnergy: number;
  playersEnergy: number;
  skemaBoxBalance: number;
  botTreasuryBalance: number;
  botTreasuryBotCount: number;
  totalReferrals: number;
  creditedReferrals: number;
  totalDistributed: number;
  totalRaces: number;
  systemTotal: number;
}

export interface PlayerProfile {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  energy: number;
  invite_code: string;
  invited_by: string | null;
  invited_by_name: string | null;
  player_tier: string | null;
  stats_wins: number;
  stats_races: number;
  stats_best_time: number | null;
  created_at: string;
  updated_at: string;
}

export interface ReferralNode {
  id: string;
  name: string;
  emoji: string;
  invite_code: string;
  invited_by: string | null;
  inviter_name: string | null;
  player_tier: string | null;
  energy: number;
  total_invited: number;
  rewards_credited: number;
  reward_transferred: number;
  invites_sent: number;
  created_at: string;
}

export interface SkemaBoxTransaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

export interface OfficialRace {
  id: string;
  name: string;
  status: string;
  scheduled_date: string;
  entry_fee: number;
  prize_per_player: number;
  skema_box_fee: number;
  min_players: number;
  max_players: number;
  created_at: string;
  registrations_count?: number;
}

// Hook para verificar se usuário é guardian (master_admin ou guardiao)
export function useIsGuardian() {
  return useQuery({
    queryKey: ['guardian-role-check'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      
      const { data: isMaster } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'master_admin'
      });
      
      if (isMaster) return true;
      
      const { data: isGuardiao, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'guardiao'
      });
      
      if (error) {
        console.error('Error checking guardian role:', error);
        return false;
      }
      
      return isGuardiao === true;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Hook para verificar se é master_admin (para controles admin exclusivos)
export function useIsMasterAdmin() {
  return useQuery({
    queryKey: ['master-admin-role-check'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;
      
      const { data: isMaster } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'master_admin'
      });
      
      return isMaster === true;
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Hook para métricas do dashboard
export function useDashboardStats() {
  return useQuery({
    queryKey: ['guardian-dashboard-stats'],
    queryFn: async () => {
      // Buscar total de jogadores e energia
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('energy, player_tier');
      
      if (profilesError) throw profilesError;
      
      const totalPlayers = profiles?.length || 0;
      
      // HX (master_admin) energy - the root treasury
      const hxEnergy = profiles
        ?.filter(p => p.player_tier === 'master_admin')
        .reduce((sum, p) => sum + Number(p.energy), 0) || 0;
      
      // Players energy (everyone except master_admin)
      const playersEnergy = profiles
        ?.filter(p => p.player_tier !== 'master_admin')
        .reduce((sum, p) => sum + Number(p.energy), 0) || 0;
      
      const totalEnergy = playersEnergy;
      
      // Buscar saldo do Skema Box
      const { data: skemaBox, error: skemaBoxError } = await supabase
        .from('skema_box')
        .select('balance')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();
      
      if (skemaBoxError && skemaBoxError.code !== 'PGRST116') {
        console.error('Skema box error:', skemaBoxError);
      }
      
      const skemaBoxBalance = Number(skemaBox?.balance) || 0;
      
      // Buscar saldo do Bot Treasury
      const { data: botTreasury, error: botTreasuryError } = await supabase
        .from('bot_treasury')
        .select('balance, bot_count')
        .eq('id', '00000000-0000-0000-0000-000000000002')
        .single();
      
      if (botTreasuryError && botTreasuryError.code !== 'PGRST116') {
        console.error('Bot treasury error:', botTreasuryError);
      }
      
      const botTreasuryBalance = Number(botTreasury?.balance) || 0;
      const botTreasuryBotCount = Number(botTreasury?.bot_count) || 99;
      
      // System total = HX + players + skema box + bot treasury (should always equal initial 10M)
      const systemTotal = hxEnergy + playersEnergy + skemaBoxBalance + botTreasuryBalance;
      
      // Buscar referrals com amounts
      const { data: referrals, error: referralsError } = await supabase
        .from('referrals')
        .select('reward_credited, reward_amount');
      
      if (referralsError) throw referralsError;
      
      const totalReferrals = referrals?.length || 0;
      const creditedReferrals = referrals?.filter(r => r.reward_credited).length || 0;
      const totalDistributed = referrals?.reduce((sum, r) => sum + (Number(r.reward_amount) || 0), 0) || 0;
      
      // Buscar corridas
      const { data: races, error: racesError } = await supabase
        .from('official_races')
        .select('id');
      
      if (racesError) throw racesError;
      
      return {
        totalPlayers,
        totalEnergy,
        hxEnergy,
        playersEnergy,
        skemaBoxBalance,
        botTreasuryBalance,
        botTreasuryBotCount,
        totalReferrals,
        creditedReferrals,
        totalDistributed,
        totalRaces: races?.length || 0,
        systemTotal,
      } as DashboardStats;
    },
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Hook para lista de usuários (exclui Master Admins que são apenas administradores)
export function usePlayersList() {
  return useQuery({
    queryKey: ['guardian-players-list'],
    queryFn: async () => {
      // Select only non-sensitive fields (exclude pin)
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, name, emoji, energy, invite_code, invited_by, invited_by_name, player_tier, stats_wins, stats_races, stats_best_time, created_at, updated_at')
        .neq('player_tier', 'master_admin')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PlayerProfile[];
    },
    staleTime: 30 * 1000,
  });
}

// Hook para árvore de convites (hierarquia baseada em invite_code)
// Normaliza códigos SKINV para o invite_code do perfil do criador
export function useReferralTree() {
  return useQuery({
    queryKey: ['guardian-referral-tree'],
    queryFn: async () => {
      // Buscar todos os profiles, referrals e invite_codes em paralelo
      const [profilesRes, referralsRes, inviteCodesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, name, emoji, invite_code, invited_by, invited_by_name, player_tier, energy, created_at')
          .order('created_at', { ascending: true }),
        supabase
          .from('referrals')
          .select('inviter_id, reward_credited, reward_amount'),
        supabase
          .from('invite_codes')
          .select('code, creator_id'),
      ]);
      
      if (profilesRes.error) throw profilesRes.error;
      if (referralsRes.error) throw referralsRes.error;
      
      const profiles = profilesRes.data;
      const referrals = referralsRes.data;
      const inviteCodes = inviteCodesRes.data || [];
      
      // Build SKINV code → creator's profile invite_code map
      const profileById = new Map(profiles?.map(p => [p.id, p]) || []);
      const skinvToProfileCode = new Map<string, string>();
      inviteCodes.forEach(ic => {
        const creator = profileById.get(ic.creator_id);
        if (creator) {
          skinvToProfileCode.set(ic.code, creator.invite_code);
        }
      });
      
      // Agregar dados de referral por inviter
      const referralCounts = new Map<string, { total: number; credited: number; totalTransferred: number }>();
      referrals?.forEach(r => {
        const current = referralCounts.get(r.inviter_id) || { total: 0, credited: 0, totalTransferred: 0 };
        current.total++;
        if (r.reward_credited) current.credited++;
        current.totalTransferred += Number(r.reward_amount) || 0;
        referralCounts.set(r.inviter_id, current);
      });
      
      return profiles?.map(p => {
        const refData = referralCounts.get(p.id);
        // Normalize invited_by: if it's a SKINV code, resolve to creator's profile invite_code
        const normalizedInvitedBy = p.invited_by 
          ? (skinvToProfileCode.get(p.invited_by) || p.invited_by)
          : p.invited_by;
        return {
          id: p.id,
          name: p.name,
          emoji: p.emoji,
          invite_code: p.invite_code,
          invited_by: normalizedInvitedBy,
          inviter_name: p.invited_by_name,
          player_tier: p.player_tier,
          energy: Number(p.energy) || 0,
          total_invited: refData?.total || 0,
          rewards_credited: refData?.credited || 0,
          reward_transferred: refData?.totalTransferred || 0,
          invites_sent: refData?.total || 0,
          created_at: p.created_at,
        };
      }) as ReferralNode[];
    },
    staleTime: 30 * 1000,
  });
}

// Hook para transações do Skema Box
export function useSkemaBoxTransactions() {
  return useQuery({
    queryKey: ['guardian-skema-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skema_box_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as SkemaBoxTransaction[];
    },
    staleTime: 30 * 1000,
  });
}

// Hook para saldo do Skema Box
export function useSkemaBoxBalance() {
  return useQuery({
    queryKey: ['guardian-skema-balance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skema_box')
        .select('balance, updated_at')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();
      
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 1000,
  });
}

// Hook para corridas oficiais
export function useOfficialRaces() {
  return useQuery({
    queryKey: ['guardian-official-races'],
    queryFn: async () => {
      const { data: races, error: racesError } = await supabase
        .from('official_races')
        .select('*')
        .order('scheduled_date', { ascending: false });
      
      if (racesError) throw racesError;
      
      // Buscar contagem de registrations para cada corrida
      const { data: registrations, error: regError } = await supabase
        .from('race_registrations')
        .select('race_id');
      
      if (regError) throw regError;
      
      const regCounts = new Map<string, number>();
      registrations?.forEach(r => {
        regCounts.set(r.race_id, (regCounts.get(r.race_id) || 0) + 1);
      });
      
      return races?.map(race => ({
        ...race,
        registrations_count: regCounts.get(race.id) || 0,
      })) as OfficialRace[];
    },
    staleTime: 30 * 1000,
  });
}
