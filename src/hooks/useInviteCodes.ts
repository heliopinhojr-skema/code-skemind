/**
 * useInviteCodes - Gerencia códigos de convite únicos (one-time-use)
 * 
 * Cada código SKINV... é gerado individualmente e só pode ser usado uma vez.
 * Após uso, fica marcado com used_by_id e used_at.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  isGenerating: boolean;
  error: string | null;
  unusedCount: number;
  usedCount: number;
  generateCode: () => Promise<string | null>;
  refetch: () => Promise<void>;
}

export function useInviteCodes(profileId: string | null): UseInviteCodesResult {
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        .order('created_at', { ascending: false });

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
    } catch (e) {
      console.error('[INVITE_CODES] Unexpected error:', e);
      setError('Erro inesperado');
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  // Fetch on mount
  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const generateCode = useCallback(async (): Promise<string | null> => {
    if (!profileId || isGenerating) return null;

    setIsGenerating(true);
    setError(null);

    try {
      const { data, error: genError } = await supabase.rpc('generate_invite_code', {
        p_creator_profile_id: profileId,
      });

      if (genError) {
        console.error('[INVITE_CODES] Generate error:', genError);
        setError('Erro ao gerar código');
        return null;
      }

      const newCode = data as string;
      console.log('[INVITE_CODES] Generated:', newCode);

      // Refetch to get the full entry
      await fetchCodes();

      return newCode;
    } catch (e) {
      console.error('[INVITE_CODES] Generate unexpected error:', e);
      setError('Erro inesperado');
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [profileId, isGenerating, fetchCodes]);

  const unusedCount = codes.filter((c) => !c.usedById).length;
  const usedCount = codes.filter((c) => !!c.usedById).length;

  return {
    codes,
    isLoading,
    isGenerating,
    error,
    unusedCount,
    usedCount,
    generateCode,
    refetch: fetchCodes,
  };
}
