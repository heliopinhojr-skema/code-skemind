/**
 * useSkemaBox - Hook para operações do Skema Box via Cloud (Supabase)
 * 
 * Substitui as funções localStorage de currencyUtils.ts para:
 * - addToSkemaBox → addToBox (via RPC update_skema_box)
 * - subtractFromSkemaBox → subtractFromBox (via RPC update_skema_box com valor negativo)
 * - getSkemaBoxBalance → balance (via query skema_box)
 * 
 * Todas as operações são atômicas no banco de dados.
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useSkemaBox() {
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current balance from Cloud
  const refreshBalance = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('skema_box')
        .select('balance')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[SKEMA BOX CLOUD] Erro ao buscar saldo:', error);
        return;
      }

      const newBalance = Number(data?.balance) || 0;
      setBalance(newBalance);
      console.log('[SKEMA BOX CLOUD] 📦 Saldo:', newBalance.toFixed(2));
    } catch (err) {
      console.error('[SKEMA BOX CLOUD] Erro inesperado:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount + window focus
  useEffect(() => {
    refreshBalance();

    const handleFocus = () => refreshBalance();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshBalance]);

  /**
   * Add amount to Skema Box (rake from races)
   * Returns new balance or null on error
   */
  const addToBox = useCallback(async (
    amount: number,
    type: 'arena_rake' | 'official_rake' | 'party_rake',
    description?: string
  ): Promise<number | null> => {
    try {
      const desc = description || getDefaultDescription(type, amount);
      
      const { data, error } = await supabase.rpc('update_skema_box', {
        p_amount: amount,
        p_type: type,
        p_description: desc,
      });

      if (error) {
        console.error('[SKEMA BOX CLOUD] Erro ao adicionar:', error);
        return null;
      }

      const newBalance = Number(data) || 0;
      setBalance(newBalance);
      console.log(`[SKEMA BOX CLOUD] ✅ +k$${amount.toFixed(2)} (${type}) → Saldo: k$${newBalance.toFixed(2)}`);
      return newBalance;
    } catch (err) {
      console.error('[SKEMA BOX CLOUD] Erro inesperado ao adicionar:', err);
      return null;
    }
  }, []);

  /**
   * Subtract amount from Skema Box (refunds)
   * Returns new balance or null on error
   */
  const subtractFromBox = useCallback(async (
    amount: number,
    type: 'official_refund' | 'adjustment',
    description?: string
  ): Promise<number | null> => {
    try {
      const desc = description || getDefaultDescription(type, -amount);
      
      const { data, error } = await supabase.rpc('update_skema_box', {
        p_amount: -amount,
        p_type: type,
        p_description: desc,
      });

      if (error) {
        console.error('[SKEMA BOX CLOUD] Erro ao subtrair:', error);
        return null;
      }

      const newBalance = Number(data) || 0;
      setBalance(newBalance);
      console.log(`[SKEMA BOX CLOUD] ✅ -k$${amount.toFixed(2)} (${type}) → Saldo: k$${newBalance.toFixed(2)}`);
      return newBalance;
    } catch (err) {
      console.error('[SKEMA BOX CLOUD] Erro inesperado ao subtrair:', err);
      return null;
    }
  }, []);

  /**
   * Reset Skema Box balance (Guardian only)
   */
  const resetBalance = useCallback(async (): Promise<boolean> => {
    try {
      // First get current balance to calculate the debit
      const current = balance;
      if (current <= 0) return true;

      const { error } = await supabase.rpc('update_skema_box', {
        p_amount: -current,
        p_type: 'reset',
        p_description: 'Skema Box zerado pelo Guardian',
      });

      if (error) {
        console.error('[SKEMA BOX CLOUD] Erro ao resetar:', error);
        return false;
      }

      setBalance(0);
      return true;
    } catch (err) {
      console.error('[SKEMA BOX CLOUD] Erro inesperado ao resetar:', err);
      return false;
    }
  }, [balance]);

  return {
    balance,
    isLoading,
    addToBox,
    subtractFromBox,
    resetBalance,
    refreshBalance,
  };
}

function getDefaultDescription(type: string, amount: number): string {
  switch (type) {
    case 'arena_rake':
      return `Arena x Bots: rake de 10 jogadores (k$${Math.abs(amount).toFixed(2)})`;
    case 'official_rake':
      return `Corrida Oficial: taxa de inscrição (k$${Math.abs(amount).toFixed(2)})`;
    case 'official_refund':
      return `Corrida Oficial: devolução de taxa (k$${Math.abs(amount).toFixed(2)})`;
    case 'party_rake':
      return `Modo Festa: rake do torneio (k$${Math.abs(amount).toFixed(2)})`;
    default:
      return `Transação: k$${amount.toFixed(2)}`;
  }
}
