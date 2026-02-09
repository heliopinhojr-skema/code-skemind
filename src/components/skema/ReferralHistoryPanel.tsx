/**
 * ReferralHistoryPanel - Painel de convites com códigos DNA únicos
 * 
 * Códigos SKINV... são gerados automaticamente pelo universo com base no tier.
 * Cada código é único e só pode ser usado uma vez.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Copy, Check, Clock, Coins, ChevronDown, ChevronUp, Users, Loader2, Share2, Ticket, Dna, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReferralEntry, useReferralHistory } from '@/hooks/useReferralHistory';
import { useInviteCodes, InviteCode } from '@/hooks/useInviteCodes';
import { getTierEconomy, formatEnergy } from '@/lib/tierEconomy';
import { toast } from '@/components/ui/use-toast';

interface ReferralHistoryPanelProps {
  playerId: string;
  inviteCode: string;
  playerTier: string;
  onProcessRewards: () => Promise<{ processed: number; total_reward: number }>;
  onRefreshProfile: () => void;
}

export function ReferralHistoryPanel({
  playerId,
  inviteCode,
  playerTier,
  onProcessRewards,
  onRefreshProfile,
}: ReferralHistoryPanelProps) {
  const { referrals, isLoading: referralsLoading, error: referralsError, pendingRewardsCount, pendingRewardsTotal, refetch: refetchReferrals } = useReferralHistory(playerId);
  const { codes, isLoading: codesLoading, isAutoGenerating, error: codesError, unusedCount, usedCount, refetch: refetchCodes } = useInviteCodes(playerId, playerTier);
  
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const tierConfig = getTierEconomy(playerTier);
  const maxInvites = tierConfig.maxInvites;
  const costPerInvite = tierConfig.costPerInvite;
  const invitedTierLabel = tierConfig.invitedTierLabel;
  const canInvite = maxInvites > 0;

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast({
        title: '✅ Código copiado!',
        description: `${code} — envie para seu convidado.`,
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (e) {
      console.error('Erro ao copiar:', e);
    }
  };

  const handleCopyLink = async (code: string) => {
    const link = `${window.location.origin}/?convite=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedCode(`link-${code}`);
      toast({
        title: '✅ Link copiado!',
        description: 'Envie para seu convidado.',
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (e) {
      console.error('Erro ao copiar:', e);
    }
  };

  const handleProcessRewards = async () => {
    if (isProcessing || pendingRewardsCount === 0) return;
    
    setIsProcessing(true);
    try {
      const result = await onProcessRewards();
      
      if (result.total_reward > 0) {
        toast({
          title: '💰 Recompensas Creditadas!',
          description: `Você recebeu k$${result.total_reward.toFixed(2)} por ${result.processed} convite(s).`,
        });
        await refetchReferrals();
        await refetchCodes();
        onRefreshProfile();
      } else {
        toast({
          title: 'Nenhuma recompensa pendente',
          description: 'Todos os seus convites já foram processados.',
        });
      }
    } catch (e) {
      console.error('[REFERRALS] Erro ao processar:', e);
      toast({
        title: 'Erro ao processar',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: ptBR });
    } catch {
      return 'Data desconhecida';
    }
  };

  // Ploft/jogador sem convites
  if (!canInvite) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <div className="flex items-center gap-2 text-white/40">
          <Lock className="w-4 h-4" />
          <span className="text-sm">Convites não disponíveis para seu tier</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl overflow-hidden backdrop-blur-sm">
      {/* Header Compacto */}
      <button
        onClick={() => setIsCardExpanded(!isCardExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
            <Dna className="w-3.5 h-3.5 text-purple-300" />
          </div>
          <div className="text-left">
            <span className="font-medium text-white text-sm">Códigos DNA</span>
            <div className="text-[10px] text-white/40">
              Gera {invitedTierLabel} • {formatEnergy(costPerInvite)}/cada
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isAutoGenerating && (
            <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
          )}
          <div className="flex items-center gap-1">
            {unusedCount > 0 && (
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 text-xs rounded-full font-medium">
                {unusedCount} ✦
              </span>
            )}
            <span className="text-xs text-white/40 font-mono">
              {usedCount}/{maxInvites}
            </span>
          </div>
          {pendingRewardsCount > 0 && (
            <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-300 text-xs rounded-full animate-pulse font-medium">
              💰 {pendingRewardsCount}
            </span>
          )}
          {isCardExpanded ? (
            <ChevronUp className="w-4 h-4 text-white/30" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/30" />
          )}
        </div>
      </button>

      {/* Conteúdo Expandido */}
      <AnimatePresence>
        {isCardExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10 overflow-hidden"
          >
            <div className="p-3 space-y-2">
              {/* Tier info strip */}
              <div className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-xs">
                <span className="text-white/50">Cada código gera um</span>
                <span className="text-purple-300 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {invitedTierLabel} • {formatEnergy(costPerInvite)}
                </span>
              </div>

              {/* Lista de códigos DNA */}
              {codesLoading || isAutoGenerating ? (
                <div className="flex flex-col items-center justify-center py-6 gap-2">
                  <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                  <span className="text-xs text-white/40">
                    {isAutoGenerating ? 'Gerando códigos DNA...' : 'Carregando...'}
                  </span>
                </div>
              ) : codes.length > 0 ? (
                <div className="space-y-1.5 max-h-72 overflow-y-auto scrollbar-thin">
                  {codes.map((code, index) => (
                    <InviteCodeItem
                      key={code.id}
                      code={code}
                      index={index + 1}
                      copiedCode={copiedCode}
                      onCopyCode={handleCopyCode}
                      onCopyLink={handleCopyLink}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <Ticket className="w-6 h-6 text-white/20 mx-auto mb-1" />
                  <p className="text-xs text-white/40">
                    Nenhum código disponível para seu tier.
                  </p>
                </div>
              )}

              {codesError && (
                <div className="text-xs text-red-400 text-center">{codesError}</div>
              )}

              {/* Expandir histórico de convidados */}
              {usedCount > 0 && (
                <button
                  onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                  className="w-full flex items-center justify-center gap-1 text-xs text-white/40 hover:text-white/70 transition-colors py-1.5 border-t border-white/5"
                >
                  <Users className="w-3 h-3" />
                  <span>Árvore de Convidados ({usedCount})</span>
                  {isHistoryExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}

              {/* Lista de convidados */}
              <AnimatePresence>
                {isHistoryExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-1.5 max-h-48 overflow-y-auto"
                  >
                    {referralsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
                      </div>
                    ) : referralsError ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-red-400">{referralsError}</p>
                        <Button variant="ghost" size="sm" onClick={refetchReferrals} className="mt-2 text-xs">
                          Tentar novamente
                        </Button>
                      </div>
                    ) : referrals.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-white/40">Nenhum convidado ainda</p>
                      </div>
                    ) : (
                      referrals.map((referral) => (
                        <ReferralItem key={referral.id} referral={referral} formatDate={formatDate} />
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Botão de resgatar */}
              {pendingRewardsCount > 0 && (
                <Button
                  onClick={handleProcessRewards}
                  disabled={isProcessing}
                  className="w-full gap-2 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-white border-0"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Coins className="w-4 h-4" />
                  )}
                  Resgatar {formatEnergy(pendingRewardsTotal)}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==================== Componente de código DNA individual ====================

function InviteCodeItem({ 
  code, 
  index,
  copiedCode, 
  onCopyCode, 
  onCopyLink,
  formatDate 
}: { 
  code: InviteCode; 
  index: number;
  copiedCode: string | null;
  onCopyCode: (code: string) => void;
  onCopyLink: (code: string) => void;
  formatDate: (d: string) => string;
}) {
  const isUsed = !!code.usedById;
  const isCopied = copiedCode === code.code;
  const isLinkCopied = copiedCode === `link-${code.code}`;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`flex items-center gap-2 rounded-lg p-2 border transition-colors ${
        isUsed 
          ? 'bg-white/3 border-white/5 opacity-50' 
          : 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/40'
      }`}
    >
      {/* Número do slot */}
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
        isUsed 
          ? 'bg-white/10 text-white/30' 
          : 'bg-purple-500/20 text-purple-300'
      }`}>
        {index}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`font-mono text-xs tracking-wider ${isUsed ? 'text-white/30 line-through' : 'text-purple-200'}`}>
            {code.code}
          </span>
        </div>
        <div className="text-[10px] text-white/30 mt-0.5">
          {isUsed ? (
            <span>
              ✅ <span className="text-white/50">{code.usedByName || '?'}</span> • {formatDate(code.usedAt!)}
            </span>
          ) : (
            <span className="text-emerald-400/60">● disponível</span>
          )}
        </div>
      </div>

      {!isUsed && (
        <div className="flex items-center gap-0.5 shrink-0">
          <motion.div
            animate={isCopied ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCopyCode(code.code)}
              className="h-7 w-7 text-white/40 hover:text-white"
              title="Copiar código"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>
          </motion.div>
          <motion.div
            animate={isLinkCopied ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCopyLink(code.code)}
              className="h-7 w-7 text-white/40 hover:text-white"
              title="Copiar link de convite"
            >
              {isLinkCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            </Button>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

// ==================== Componente de item referral ====================

function ReferralItem({ referral, formatDate }: { referral: ReferralEntry; formatDate: (d: string) => string }) {
  return (
    <div className="flex items-center gap-3 bg-white/5 rounded-lg p-2">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center text-base shrink-0">
        {referral.invitedEmoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{referral.invitedName}</div>
        <div className="text-xs text-white/40">{formatDate(referral.createdAt)}</div>
      </div>
      <div className="shrink-0">
        {referral.rewardCredited ? (
          <div className="flex items-center gap-1 text-emerald-400 text-xs">
            <Check className="w-3 h-3" />
            <span>{formatEnergy(referral.rewardAmount)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-yellow-400 text-xs">
            <Clock className="w-3 h-3" />
            <span>{formatEnergy(referral.rewardAmount)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
