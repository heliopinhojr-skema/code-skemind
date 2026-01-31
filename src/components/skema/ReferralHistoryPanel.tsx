/**
 * ReferralHistoryPanel - Painel de histórico de convites (colapsável)
 * 
 * Mostra:
 * - Header compacto sempre visível (título, badges, chevron)
 * - Ao expandir: código pessoal, link de convite, lista de convidados
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Copy, Check, Clock, Coins, ChevronDown, ChevronUp, Users, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReferralEntry, useReferralHistory } from '@/hooks/useReferralHistory';
import { toast } from '@/components/ui/use-toast';

const MAX_REFERRAL_REWARDS = 10;

interface ReferralHistoryPanelProps {
  playerId: string;
  inviteCode: string;
  onProcessRewards: () => Promise<{ processed: number; total_reward: number }>;
  onRefreshProfile: () => void;
}

export function ReferralHistoryPanel({
  playerId,
  inviteCode,
  onProcessRewards,
  onRefreshProfile,
}: ReferralHistoryPanelProps) {
  const { referrals, isLoading, error, pendingRewardsCount, pendingRewardsTotal, refetch } = useReferralHistory(playerId);
  
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const inviteLink = `${window.location.origin}/?convite=${encodeURIComponent(inviteCode)}`;
  const usedCount = referrals.length;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopiedCode(true);
      toast({
        title: '✅ Código copiado!',
        description: 'Cole onde quiser para compartilhar.',
      });
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      console.error('Erro ao copiar:', e);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedLink(true);
      toast({
        title: '✅ Link copiado!',
        description: 'Envie para seus amigos.',
      });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      console.error('Erro ao copiar:', e);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'SKEMIND - Jogue comigo!',
          text: `Use meu código de convite ${inviteCode} e ganhe k$10 para começar!`,
          url: inviteLink,
        });
        setShareSuccess(true);
        toast({
          title: '🎉 Compartilhado!',
          description: 'Seu convite foi enviado com sucesso.',
        });
        setTimeout(() => setShareSuccess(false), 2000);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.error('Erro ao compartilhar:', e);
        }
      }
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
        await refetch();
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

  return (
    <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-xl overflow-hidden">
      {/* Header Compacto - Sempre Visível */}
      <button
        onClick={() => setIsCardExpanded(!isCardExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground text-sm">Meus Convites</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {usedCount}/{MAX_REFERRAL_REWARDS}
          </span>
          {pendingRewardsCount > 0 && (
            <span className="px-1.5 py-0.5 bg-accent/20 text-accent-foreground text-xs rounded-full animate-pulse">
              {pendingRewardsCount} 💰
            </span>
          )}
          {isCardExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
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
            className="border-t border-border overflow-hidden"
          >
            <div className="p-4 space-y-3">
              {/* Código pessoal */}
              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground">Seu código pessoal:</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-background/30 border border-border rounded-lg px-3 py-2 font-mono text-sm text-primary">
                    {inviteCode}
                  </div>
                  <motion.div
                    animate={copiedCode ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCopyCode}
                      className={`shrink-0 gap-1 transition-colors ${copiedCode ? 'bg-primary/20 border-primary/40' : ''}`}
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* Link de convite */}
              <div className="space-y-1.5">
                <div className="text-xs text-muted-foreground">Link de convite:</div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-background/30 border border-border rounded-lg px-3 py-2 text-xs text-primary truncate">
                    {inviteLink}
                  </div>
                  <motion.div
                    animate={copiedLink ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleCopyLink}
                      className={`shrink-0 gap-1 transition-colors ${copiedLink ? 'bg-primary/20 border-primary/40' : ''}`}
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </motion.div>
                  {typeof navigator !== 'undefined' && navigator.share && (
                    <motion.div
                      animate={shareSuccess ? { scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] } : {}}
                      transition={{ duration: 0.4 }}
                    >
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleNativeShare}
                        className={`shrink-0 gap-1 transition-colors ${shareSuccess ? 'bg-primary text-primary-foreground' : ''}`}
                      >
                        {shareSuccess ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Expandir histórico */}
              {usedCount > 0 && (
                <button
                  onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                  className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  <Users className="w-3 h-3" />
                  <span>Ver histórico ({usedCount})</span>
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
                    className="space-y-2 max-h-48 overflow-y-auto"
                  >
                    {isLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                      </div>
                    ) : error ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-destructive">{error}</p>
                        <Button variant="ghost" size="sm" onClick={refetch} className="mt-2 text-xs">
                          Tentar novamente
                        </Button>
                      </div>
                    ) : referrals.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">Nenhum convite ainda</p>
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
                  className="w-full gap-2"
                  variant="default"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Coins className="w-4 h-4" />
                  )}
                  Resgatar k${pendingRewardsTotal.toFixed(2)}
                </Button>
              )}

              {/* Mensagem de incentivo */}
              {usedCount === 0 && (
                <div className="bg-background/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground">
                    🎁 Convide amigos e ganhe <span className="text-primary font-medium">k$10</span> por cada um!
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Limite: {MAX_REFERRAL_REWARDS} recompensas
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Componente de item da lista
function ReferralItem({ referral, formatDate }: { referral: ReferralEntry; formatDate: (d: string) => string }) {
  return (
    <div className="flex items-center gap-3 bg-background/20 rounded-lg p-2">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center text-base shrink-0">
        {referral.invitedEmoji}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{referral.invitedName}</div>
        <div className="text-xs text-muted-foreground">{formatDate(referral.createdAt)}</div>
      </div>
      <div className="shrink-0">
        {referral.rewardCredited ? (
          <div className="flex items-center gap-1 text-primary text-xs">
            <Check className="w-3 h-3" />
            <span>k${referral.rewardAmount}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-accent-foreground text-xs">
            <Clock className="w-3 h-3" />
            <span>k${referral.rewardAmount}</span>
          </div>
        )}
      </div>
    </div>
  );
}
