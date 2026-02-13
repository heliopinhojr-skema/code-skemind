/**
 * TransferPanel - Painel de transferência de k$ entre jogadores
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, AlertCircle, CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { formatEnergy, calculateBalanceBreakdown } from '@/lib/tierEconomy';
import { PlayerTier } from '@/hooks/useSupabasePlayer';
import { toast } from 'sonner';
import { useI18n } from '@/i18n/I18nContext';

const TRANSFER_TAX = 0.0643;

// Tiers que podem transferir
const ALLOWED_TIERS: PlayerTier[] = ['master_admin', 'Criador', 'Grão Mestre', 'grao_mestre', 'guardiao'];

interface TransferPanelProps {
  playerId: string;
  playerName: string;
  playerTier: PlayerTier;
  energy: number;
  referralsCount: number;
  onTransferComplete: () => void;
}

export function TransferPanel({
  playerId,
  playerName,
  playerTier,
  energy,
  referralsCount,
  onTransferComplete,
}: TransferPanelProps) {
  const { t } = useI18n();
  const [nickname, setNickname] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const canTransfer = ALLOWED_TIERS.includes(playerTier);
  const balance = calculateBalanceBreakdown(energy, playerTier, referralsCount);
  const parsedAmount = parseFloat(amount.replace(',', '.')) || 0;
  const taxAmount = Math.round(parsedAmount * TRANSFER_TAX * 100) / 100;
  const totalCost = Math.round((parsedAmount + taxAmount) * 100) / 100;
  const canAfford = totalCost > 0 && totalCost <= balance.available;

  const handleTransfer = useCallback(async () => {
    if (!nickname.trim() || parsedAmount <= 0 || !canAfford) return;

    setIsLoading(true);
    setLastResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('transfer-energy', {
        body: {
          recipientNickname: nickname.trim(),
          amount: parsedAmount,
        },
      });

      if (error) {
        let errorMsg = t.transfer.transferError;
        try {
          if (error instanceof Error && 'context' in error) {
            const ctx = (error as any).context;
            if (ctx?.body) {
              const reader = ctx.body.getReader?.();
              if (reader) {
                const { value } = await reader.read();
                const text = new TextDecoder().decode(value);
                const parsed = JSON.parse(text);
                errorMsg = parsed.error || errorMsg;
              }
            }
          } else if (typeof error === 'object' && 'message' in error) {
            errorMsg = error.message;
          }
        } catch {
          errorMsg = String(error);
        }
        setLastResult({ success: false, message: errorMsg });
        toast.error(errorMsg);
      } else if (data?.error) {
        setLastResult({ success: false, message: data.error });
        toast.error(data.error);
      } else if (data?.success) {
        setLastResult({
          success: true,
          message: `✅ ${t.transfer.sent} ${formatEnergy(data.transferred)} ${t.transfer.to} ${data.recipientName} (${t.transfer.tax}: ${formatEnergy(data.tax)})`,
        });
        toast.success(`${t.transfer.transferSuccess} ${formatEnergy(data.transferred)}`);
        setNickname('');
        setAmount('');
        onTransferComplete();
      }
    } catch (err: any) {
      setLastResult({ success: false, message: err.message || t.transfer.unknownError });
      toast.error(t.transfer.transferError);
    } finally {
      setIsLoading(false);
    }
  }, [nickname, parsedAmount, canAfford, onTransferComplete, t]);

  if (!canTransfer) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl p-4"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Send className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-white">{t.transfer.title}</span>
        <span className="text-[10px] text-white/40 ml-auto">{t.transfer.fee}: 6,43%</span>
      </div>

      {/* Available balance */}
      <div className="text-xs text-white/50 mb-3">
        {t.transfer.availableBalance}: <span className="text-emerald-400 font-mono">{formatEnergy(balance.available)}</span>
      </div>

      {/* Inputs */}
      <div className="flex gap-2 mb-2">
        <Input
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => {
            setNickname(e.target.value);
            setLastResult(null);
          }}
          className="flex-1 h-9 bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30"
          maxLength={30}
          disabled={isLoading}
        />
        <Input
          placeholder={t.transfer.valuePlaceholder}
          value={amount}
          onChange={(e) => {
            const val = e.target.value.replace(/[^0-9.,]/g, '');
            setAmount(val);
            setLastResult(null);
          }}
          className="w-28 h-9 bg-white/5 border-white/10 text-white text-sm font-mono placeholder:text-white/30"
          maxLength={15}
          disabled={isLoading}
        />
      </div>

      {/* Preview */}
      {parsedAmount > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="text-[11px] text-white/50 mb-2 space-y-0.5"
        >
          <div className="flex justify-between">
            <span>{t.transfer.value}:</span>
            <span className="font-mono">{formatEnergy(parsedAmount)}</span>
          </div>
          <div className="flex justify-between text-orange-400/70">
            <span>{t.transfer.tax} (6,43%):</span>
            <span className="font-mono">{formatEnergy(taxAmount)}</span>
          </div>
          <div className="flex justify-between font-medium text-white/70 border-t border-white/10 pt-0.5">
            <span>{t.transfer.totalDebited}:</span>
            <span className="font-mono">{formatEnergy(totalCost)}</span>
          </div>
          {!canAfford && totalCost > 0 && (
            <div className="flex items-center gap-1 text-red-400 mt-1">
              <AlertCircle className="w-3 h-3" />
              <span>{t.transfer.insufficientBalance}</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Submit */}
      <Button
        onClick={handleTransfer}
        disabled={isLoading || !nickname.trim() || parsedAmount <= 0 || !canAfford}
        className="w-full h-9 text-sm"
        size="sm"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            {t.transfer.transferring}
          </>
        ) : (
          <>
            <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
            {t.transfer.send} {parsedAmount > 0 ? formatEnergy(parsedAmount) : 'k$'}
            {nickname.trim() ? ` ${t.transfer.to} ${nickname.trim()}` : ''}
          </>
        )}
      </Button>

      {/* Result */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-2 flex items-start gap-2 text-xs p-2 rounded-lg ${
              lastResult.success
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border border-red-500/20'
            }`}
          >
            {lastResult.success ? (
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            )}
            <span>{lastResult.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
