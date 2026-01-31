/**
 * useReferralHistory - Hook para buscar histórico de convites
 * 
 * Retorna a lista de pessoas que o jogador convidou,
 * com dados do perfil do convidado e status da recompensa.
 * 
 * Inclui subscription em tempo real para notificar quando
 * alguém usar o código de convite do jogador.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReferralEntry {
  id: string;
  invitedName: string;
  invitedEmoji: string;
  rewardCredited: boolean;
  rewardAmount: number;
  createdAt: string;
}

interface UseReferralHistoryResult {
  referrals: ReferralEntry[];
  isLoading: boolean;
  error: string | null;
  pendingRewardsCount: number;
  pendingRewardsTotal: number;
  refetch: () => Promise<void>;
}

export function useReferralHistory(playerId: string | null): UseReferralHistoryResult {
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref para evitar notificação duplicada na carga inicial
  const initialLoadDone = useRef(false);

  const fetchReferrals = useCallback(async () => {
    if (!playerId) {
      setReferrals([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Busca referrals com join na tabela profiles para obter dados do convidado
      const { data, error: fetchError } = await supabase
        .from('referrals')
        .select(`
          id,
          reward_credited,
          reward_amount,
          created_at,
          invited:profiles!referrals_invited_id_fkey(name, emoji)
        `)
        .eq('inviter_id', playerId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('[REFERRALS] Erro ao buscar:', fetchError);
        setError('Erro ao carregar histórico');
        setReferrals([]);
        return;
      }

      // Transforma os dados para o formato esperado
      const entries: ReferralEntry[] = (data || []).map((r) => ({
        id: r.id,
        invitedName: r.invited?.name || 'Jogador',
        invitedEmoji: r.invited?.emoji || '🎮',
        rewardCredited: r.reward_credited,
        rewardAmount: r.reward_amount || 10,
        createdAt: r.created_at,
      }));

      setReferrals(entries);
      console.log('[REFERRALS] Carregados:', entries.length);
      initialLoadDone.current = true;
    } catch (e) {
      console.error('[REFERRALS] Erro inesperado:', e);
      setError('Erro inesperado');
    } finally {
      setIsLoading(false);
    }
  }, [playerId]);

  // Busca inicial
  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  // Subscription em tempo real para novos referrals
  useEffect(() => {
    if (!playerId) return;

    console.log('[REFERRALS] Configurando realtime subscription para:', playerId);

    const channel = supabase
      .channel(`referrals-${playerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'referrals',
          filter: `inviter_id=eq.${playerId}`,
        },
        async (payload) => {
          console.log('[REFERRALS] Novo convite detectado:', payload);

          // Só mostra notificação após a carga inicial
          if (!initialLoadDone.current) return;

          const newReferral = payload.new as {
            id: string;
            invited_id: string;
            reward_amount: number;
            reward_credited: boolean;
            created_at: string;
          };

          // Busca dados do perfil do convidado
          const { data: invitedProfile } = await supabase
            .from('profiles')
            .select('name, emoji')
            .eq('id', newReferral.invited_id)
            .single();

          const invitedName = invitedProfile?.name || 'Novo jogador';
          const invitedEmoji = invitedProfile?.emoji || '🎮';

          // Mostra notificação
          toast.success(
            `${invitedEmoji} ${invitedName} usou seu código!`,
            {
              description: `Você ganhou k$${newReferral.reward_amount || 10} de recompensa!`,
              duration: 6000,
            }
          );

          // Adiciona à lista local
          const newEntry: ReferralEntry = {
            id: newReferral.id,
            invitedName,
            invitedEmoji,
            rewardCredited: newReferral.reward_credited,
            rewardAmount: newReferral.reward_amount || 10,
            createdAt: newReferral.created_at,
          };

          setReferrals((prev) => [newEntry, ...prev]);
        }
      )
      .subscribe((status) => {
        console.log('[REFERRALS] Subscription status:', status);
      });

    return () => {
      console.log('[REFERRALS] Removendo subscription');
      supabase.removeChannel(channel);
    };
  }, [playerId]);

  // Calcula pendentes
  const pendingReferrals = referrals.filter((r) => !r.rewardCredited);
  const pendingRewardsCount = pendingReferrals.length;
  const pendingRewardsTotal = pendingReferrals.reduce((sum, r) => sum + r.rewardAmount, 0);

  return {
    referrals,
    isLoading,
    error,
    pendingRewardsCount,
    pendingRewardsTotal,
    refetch: fetchReferrals,
  };
}
