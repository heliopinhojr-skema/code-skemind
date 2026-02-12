/**
 * useArenaListings - Hook para listar e criar arenas custom
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ArenaListing {
  id: string;
  creator_id: string;
  creator_name?: string;
  creator_emoji?: string;
  name: string;
  buy_in: number;
  rake_fee: number;
  bot_count: number;
  iq_min: number;
  iq_max: number;
  status: string;
  total_entries: number;
  created_at: string;
}

export function useArenaListings() {
  return useQuery({
    queryKey: ['arena-listings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('arena_listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch creator names
      if (data && data.length > 0) {
        const creatorIds = [...new Set(data.map((a: any) => a.creator_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, emoji')
          .in('id', creatorIds);

        const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

        return data.map((arena: any) => {
          const creator = profileMap.get(arena.creator_id) as any;
          return {
            ...arena,
            creator_name: creator?.name || 'Desconhecido',
            creator_emoji: creator?.emoji || '🎮',
          };
        }) as ArenaListing[];
      }

      return data as ArenaListing[];
    },
    staleTime: 15 * 1000,
  });
}

export function useOpenArenas() {
  return useQuery({
    queryKey: ['open-arenas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('arena_listings')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch creator names
      if (data && data.length > 0) {
        const creatorIds = [...new Set(data.map((a: any) => a.creator_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, emoji')
          .in('id', creatorIds);

        const profileMap = new Map(profiles?.map((p: any) => [p.id, p]) || []);

        return data.map((arena: any) => {
          const creator = profileMap.get(arena.creator_id) as any;
          return {
            ...arena,
            creator_name: creator?.name || 'Desconhecido',
            creator_emoji: creator?.emoji || '🎮',
          };
        }) as ArenaListing[];
      }

      return (data || []) as ArenaListing[];
    },
    staleTime: 15 * 1000,
  });
}

export function useBotTreasuryBalance() {
  return useQuery({
    queryKey: ['bot-treasury-balance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bot_treasury')
        .select('balance')
        .eq('id', '00000000-0000-0000-0000-000000000002')
        .single();

      if (error) throw error;
      return Number(data?.balance ?? 0);
    },
    staleTime: 10 * 1000,
  });
}

export function useCreateArena() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      creator_id: string;
      name: string;
      buy_in: number;
      rake_fee: number;
      bot_count: number;
    }) => {
      // Pre-validate: check bot treasury can cover bot buy-ins
      const { data: treasury, error: treasuryError } = await supabase
        .from('bot_treasury')
        .select('balance')
        .eq('id', '00000000-0000-0000-0000-000000000002')
        .single();

      if (treasuryError) throw new Error('Erro ao verificar Bot Treasury');

      const botTotalBuyIn = params.bot_count * params.buy_in;
      const treasuryBalance = Number(treasury?.balance ?? 0);

      if (treasuryBalance < botTotalBuyIn) {
        throw new Error(
          `Bot Treasury insuficiente: k$ ${treasuryBalance.toFixed(2)} < k$ ${botTotalBuyIn.toFixed(2)} necessário. ` +
          `Máximo buy-in suportado: k$ ${(treasuryBalance / params.bot_count).toFixed(2)}`
        );
      }

      const { data, error } = await supabase
        .from('arena_listings')
        .insert({
          creator_id: params.creator_id,
          name: params.name,
          buy_in: params.buy_in,
          rake_fee: params.rake_fee,
          bot_count: params.bot_count,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arena-listings'] });
      queryClient.invalidateQueries({ queryKey: ['open-arenas'] });
    },
  });
}

export function useCloseArena() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (arenaId: string) => {
      const { error } = await supabase
        .from('arena_listings')
        .update({ status: 'closed' })
        .eq('id', arenaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arena-listings'] });
      queryClient.invalidateQueries({ queryKey: ['open-arenas'] });
    },
  });
}

export function useUpdateArena() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      name?: string;
      buy_in?: number;
      rake_fee?: number;
      bot_count?: number;
    }) => {
      const updateData: Record<string, any> = {};
      if (params.name !== undefined) updateData.name = params.name;
      if (params.buy_in !== undefined) updateData.buy_in = params.buy_in;
      if (params.rake_fee !== undefined) updateData.rake_fee = params.rake_fee;
      if (params.bot_count !== undefined) updateData.bot_count = params.bot_count;

      const { error } = await supabase
        .from('arena_listings')
        .update(updateData)
        .eq('id', params.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arena-listings'] });
      queryClient.invalidateQueries({ queryKey: ['open-arenas'] });
    },
  });
}

export function useDeleteArena() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (arenaId: string) => {
      await supabase
        .from('arena_entries')
        .delete()
        .eq('arena_id', arenaId);

      const { error } = await supabase
        .from('arena_listings')
        .delete()
        .eq('id', arenaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arena-listings'] });
      queryClient.invalidateQueries({ queryKey: ['open-arenas'] });
    },
  });
}