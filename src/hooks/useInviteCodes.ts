/**
 * useInviteCodes - Gerencia códigos de convite únicos (one-time-use)
 * 
 * Códigos SKINV... são gerados AUTOMATICAMENTE pelo universo com base no tier.
 * Ao carregar, o hook gera todos os códigos faltantes até o máximo do tier.
 * Cada código só pode ser usado uma vez. Após uso, fica marcado com used_by_id e used_at.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getTierEconomy } from '@/lib/tierEconomy';

export interface InviteCode {
  id: string;
  code: string;
  createdAt: string;
  usedById: string | null;
  usedAt: string | null;
  /** Nome do convidado que usou o código (join) */
  usedByName?: string;
}

interface UseInviteCodesResult {
  codes: InviteCode[];
  isLoading: boolean;
  isAutoGenerating: boolean;
  error: string | null;
  unusedCount: number;
  usedCount: number;
  refetch: () => Promise<void>;
}

export function useInviteCodes(profileId: string | null, playerTier: string | null): UseInviteCodesResult {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoGenTriggered = useRef(false);

  const fetchCodes = useCallback(async () => {
    if (!profileId) {
      setCodes([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('invite_codes')
        .select(`
          id,
          code,
          created_at,
          used_by_id,
          used_at,
          used_by:profiles!invite_codes_used_by_id_fkey(name)
        `)
        .eq('creator_id', profileId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        console.error('[INVITE_CODES] Fetch error:', fetchError);
        setError('Erro ao carregar códigos');
        return;
      }

      const entries: InviteCode[] = (data || []).map((row) => ({
        id: row.id,
        code: row.code,
        createdAt: row.created_at,
        usedById: row.used_by_id,
        usedAt: row.used_at,
        usedByName: row.used_by?.name || undefined,
      }));

      setCodes(entries);
      return entries;
    } catch (e) {
      console.error('[INVITE_CODES] Unexpected error:', e);
      setError('Erro inesperado');
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  // Auto-generate missing codes based on tier, discounting existing referrals
  const autoGenerateCodes = useCallback(async (currentCodes: InviteCode[]) => {
    if (!profileId || !playerTier) return;

    const config = getTierEconomy(playerTier);
    const maxInvites = config.maxInvites;

    if (maxInvites <= 0) return; // Ploft/jogador can't invite

    // Count referrals that match the expected invited tier for this slot type
    // e.g. master_admin slots are for Criadores only, not Plofts
    const expectedTier = config.invitedTierLabel;
    let extraReferrals = 0;

    if (expectedTier) {
      // Count referrals where the invited player has the expected tier
      const { data: tierReferrals } = await supabase
        .from('referrals')
        .select('invited_id')
        .eq('inviter_id', profileId);

      if (tierReferrals && tierReferrals.length > 0) {
        const invitedIds = tierReferrals.map(r => r.invited_id);
        const { count: matchingCount } = await supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .in('id', invitedIds)
          .eq('player_tier', expectedTier);

        const totalMatchingReferrals = matchingCount || 0;
        const usedCodes = currentCodes.filter(c => !!c.usedById).length;
        // Referrals of matching tier not accounted for by used SKINV codes
        extraReferrals = Math.max(0, totalMatchingReferrals - usedCodes);
      }
    }

    const effectiveMax = Math.max(0, maxInvites - extraReferrals);
    const totalCodes = currentCodes.length;
    const missing = effectiveMax - totalCodes;

    if (missing <= 0) return; // Already have all codes

    console.log(`[INVITE_CODES] Auto-generating ${missing} codes for tier ${playerTier} (has ${totalCodes}/${maxInvites})`);
    setIsAutoGenerating(true);

    try {
      // Generate all missing codes in sequence (each RPC generates one)
      for (let i = 0; i < missing; i++) {
        const { error: genError } = await supabase.rpc('generate_invite_code', {
          p_creator_profile_id: profileId,
        });

        if (genError) {
          console.error(`[INVITE_CODES] Auto-generate error (${i + 1}/${missing}):`, genError);
          break; // Stop on first error
        }
      }

      console.log(`[INVITE_CODES] Auto-generation complete`);
      // Refetch to get all the new codes
      await fetchCodes();
    } catch (e) {
      console.error('[INVITE_CODES] Auto-generate unexpected error:', e);
    } finally {
      setIsAutoGenerating(false);
    }
  }, [profileId, playerTier, fetchCodes]);

  // Fetch on mount, then auto-generate if needed
  useEffect(() => {
    if (!profileId) return;
    autoGenTriggered.current = false;

    const init = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('invite_codes')
          .select(`
            id,
            code,
            created_at,
            used_by_id,
            used_at,
            used_by:profiles!invite_codes_used_by_id_fkey(name)
          `)
          .eq('creator_id', profileId)
          .order('created_at', { ascending: true });

        if (fetchError) {
          console.error('[INVITE_CODES] Fetch error:', fetchError);
          setError('Erro ao carregar códigos');
          return;
        }

        const entries: InviteCode[] = (data || []).map((row) => ({
          id: row.id,
          code: row.code,
          createdAt: row.created_at,
          usedById: row.used_by_id,
          usedAt: row.used_at,
          usedByName: row.used_by?.name || undefined,
        }));

        setCodes(entries);

        // Auto-generate missing codes (only once per mount)
        if (!autoGenTriggered.current) {
          autoGenTriggered.current = true;
          await autoGenerateCodes(entries);
        }
      } catch (e) {
        console.error('[INVITE_CODES] Unexpected error:', e);
        setError('Erro inesperado');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [profileId, playerTier]); // eslint-disable-line react-hooks/exhaustive-deps

  const unusedCount = codes.filter((c) => !c.usedById).length;
  const usedCount = codes.filter((c) => !!c.usedById).length;

  const refetch = useCallback(async () => {
    await fetchCodes();
  }, [fetchCodes]);

  return {
    codes,
    isLoading,
    isAutoGenerating: isAutoGenerating,
    error,
    unusedCount,
    usedCount,
    refetch,
  };
}
