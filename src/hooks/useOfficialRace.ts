/**
 * useOfficialRace - Corridas oficiais do banco de dados (official_races)
 * Busca TODAS as corridas com status 'registration' e suas inscrições
 */

import { useState, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  entryFee: number;
  prizePerPlayer: number;
  skemaBoxFee: number;
  minPlayers: number;
  maxPlayers: number;
  registeredPlayers: OfficialRacePlayer[];
  status: string;
}

function formatTimeUntil(target: Date): string {
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return 'Iniciando...';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatRaceDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function useOfficialRaces() {
  const queryClient = useQueryClient();

  const { data: races, isLoading } = useQuery({
    queryKey: ['official-races-lobby'],
    queryFn: async () => {
      // Fetch races with status registration or starting
      const { data: racesData, error: racesError } = await supabase
        .from('official_races')
        .select('*')
        .in('status', ['registration', 'starting', 'running'])
        .order('scheduled_date', { ascending: true });

      if (racesError) throw racesError;
      if (!racesData || racesData.length === 0) return [];

      // Fetch all registrations for these races
      const raceIds = racesData.map(r => r.id);
      const { data: regsData, error: regsError } = await supabase
        .from('race_registrations')
        .select('race_id, player_id, registered_at, profiles(id, name, emoji)')
        .in('race_id', raceIds);

      if (regsError) throw regsError;

      // Map registrations per race
      const regsByRace = new Map<string, OfficialRacePlayer[]>();
      (regsData || []).forEach((r: any) => {
        const list = regsByRace.get(r.race_id) || [];
        list.push({
          id: r.profiles?.id || r.player_id,
          name: r.profiles?.name || 'Unknown',
          emoji: r.profiles?.emoji || '🎮',
          registeredAt: r.registered_at,
        });
        regsByRace.set(r.race_id, list);
      });

      return racesData.map(r => ({
        id: r.id,
        name: r.name,
        scheduledDate: new Date(r.scheduled_date),
        entryFee: Number(r.entry_fee),
        prizePerPlayer: Number(r.prize_per_player),
        skemaBoxFee: Number(r.skema_box_fee),
        minPlayers: r.min_players,
        maxPlayers: r.max_players,
        registeredPlayers: regsByRace.get(r.id) || [],
        status: r.status,
      })) as OfficialRace[];
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['official-races-lobby'] });
  }, [queryClient]);

  return { races: races || [], isLoading, refresh };
}

// Backward-compatible single-race hook (returns first race)
export function useOfficialRace() {
  const { races, isLoading, refresh } = useOfficialRaces();
  const race = races.length > 0 ? races[0] : null;

  const isPlayerRegistered = useCallback((playerId: string): boolean => {
    if (!race) return false;
    return race.registeredPlayers.some(p => p.id === playerId);
  }, [race]);

  const registerPlayer = useCallback(async (player: { id: string; name: string; emoji: string }): Promise<{ success: boolean; error?: string }> => {
    if (!race) return { success: false, error: 'Corrida não encontrada' };
    
    const { error } = await supabase
      .from('race_registrations')
      .insert({ race_id: race.id, player_id: player.id });
    
    if (error) {
      if (error.code === '23505') return { success: false, error: 'Você já está inscrito' };
      return { success: false, error: error.message };
    }
    
    refresh();
    return { success: true };
  }, [race, refresh]);

  const unregisterPlayer = useCallback(async (playerId: string): Promise<{ success: boolean; error?: string }> => {
    if (!race) return { success: false, error: 'Corrida não encontrada' };
    
    const { error } = await supabase
      .from('race_registrations')
      .delete()
      .eq('race_id', race.id)
      .eq('player_id', playerId);
    
    if (error) return { success: false, error: error.message };
    
    refresh();
    return { success: true };
  }, [race, refresh]);

  const prizePool = useMemo(() => {
    if (!race) return 0;
    return race.registeredPlayers.length * race.prizePerPlayer;
  }, [race]);

  const formattedDate = useMemo(() => {
    if (!race) return '';
    return formatRaceDate(race.scheduledDate);
  }, [race]);

  const timeUntilRace = useMemo(() => {
    if (!race) return '';
    return formatTimeUntil(race.scheduledDate);
  }, [race]);

  return {
    race,
    isLoaded: !isLoading,
    timeUntilRace,
    formattedDate,
    prizePool,
    skemaBoxTotal: race ? race.registeredPlayers.length * race.skemaBoxFee : 0,
    canStartRace: race ? new Date() >= race.scheduledDate && race.registeredPlayers.length >= race.minPlayers && race.status === 'registration' : false,
    constants: {
      entryFee: race?.entryFee ?? 1.1,
      prizePerPlayer: race?.prizePerPlayer ?? 1,
      skemaBoxFee: race?.skemaBoxFee ?? 0.1,
      minPlayers: race?.minPlayers ?? 2,
      maxPlayers: race?.maxPlayers ?? 16,
      scheduledDate: race?.scheduledDate ?? new Date(),
    },
    actions: {
      isPlayerRegistered,
      registerPlayer,
      unregisterPlayer,
    },
  };
}
