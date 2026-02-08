/**
 * ReferralHistoryPanel - Painel de convites com códigos únicos
 * 
 * Cada código SKINV... é gerado individualmente e só pode ser usado uma vez.
 * Mostra lista de códigos gerados (usados/livres) e botão para gerar novos.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Copy, Check, Clock, Coins, ChevronDown, ChevronUp, Users, Loader2, Share2, Plus, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ReferralEntry, useReferralHistory } from '@/hooks/useReferralHistory';
import { useInviteCodes, InviteCode } from '@/hooks/useInviteCodes';
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
  const { referrals, isLoading: referralsLoading, error: referralsError, pendingRewardsCount, pendingRewardsTotal, refetch: refetchReferrals } = useReferralHistory(playerId);
  const { codes, isLoading: codesLoading, isGenerating, error: codesError, unusedCount, generateCode, refetch: refetchCodes } = useInviteCodes(playerId);
  
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const usedCount = referrals.length;

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

  const handleGenerateCode = async () => {
    const code = await generateCode();
    if (code) {
      toast({
        title: '🎟️ Código gerado!',
        description: `${code} — copie e envie para seu convidado.`,
      });
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

  return (
    <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 rounded-xl overflow-hidden">
      {/* Header Compacto */}
      <button
        onClick={() => setIsCardExpanded(!isCardExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground text-sm">Meus Convites</span>
        </div>
        
        <div className="flex items-center gap-2">
          {unusedCount > 0 && (
            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-300 text-xs rounded-full">
              {unusedCount} livre{unusedCount > 1 ? 's' : ''}
            </span>
          )}
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
              {/* Botão Gerar Novo Código */}
              <Button
                onClick={handleGenerateCode}
                disabled={isGenerating}
                variant="default"
                className="w-full gap-2"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Gerar Código de Convite
              </Button>

              {/* Lista de códigos gerados */}
              {codesLoading ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                </div>
              ) : codes.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {codes.map((code) => (
                    <InviteCodeItem
                      key={code.id}
                      code={code}
                      copiedCode={copiedCode}
                      onCopyCode={handleCopyCode}
                      onCopyLink={handleCopyLink}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-background/20 rounded-lg p-3 text-center">
                  <Ticket className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">
                    Nenhum código gerado ainda. Clique acima para criar!
                  </p>
                </div>
              )}

              {codesError && (
                <div className="text-xs text-destructive text-center">{codesError}</div>
              )}

              {/* Expandir histórico de convidados */}
              {usedCount > 0 && (
                <button
                  onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                  className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  <Users className="w-3 h-3" />
                  <span>Convidados ({usedCount})</span>
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
                    {referralsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                      </div>
                    ) : referralsError ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-destructive">{referralsError}</p>
                        <Button variant="ghost" size="sm" onClick={refetchReferrals} className="mt-2 text-xs">
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
              {usedCount === 0 && codes.length === 0 && (
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

// ==================== Componente de código individual ====================

function InviteCodeItem({ 
  code, 
  copiedCode, 
  onCopyCode, 
  onCopyLink,
  formatDate 
}: { 
  code: InviteCode; 
  copiedCode: string | null;
  onCopyCode: (code: string) => void;
  onCopyLink: (code: string) => void;
  formatDate: (d: string) => string;
}) {
  const isUsed = !!code.usedById;
  const isCopied = copiedCode === code.code;
  const isLinkCopied = copiedCode === `link-${code.code}`;

  return (
    <div className={`flex items-center gap-2 rounded-lg p-2 border ${
      isUsed 
        ? 'bg-background/10 border-border/50 opacity-60' 
        : 'bg-background/30 border-primary/20'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Ticket className={`w-3 h-3 shrink-0 ${isUsed ? 'text-muted-foreground' : 'text-primary'}`} />
          <span className={`font-mono text-sm ${isUsed ? 'text-muted-foreground line-through' : 'text-primary'}`}>
            {code.code}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">
          {isUsed ? (
            <span>✅ Usado por <span className="text-foreground">{code.usedByName || '?'}</span> • {formatDate(code.usedAt!)}</span>
          ) : (
            <span>🟢 Livre • {formatDate(code.createdAt)}</span>
          )}
        </div>
      </div>

      {!isUsed && (
        <div className="flex items-center gap-1 shrink-0">
          <motion.div
            animate={isCopied ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCopyCode(code.code)}
              className="h-7 w-7"
              title="Copiar código"
            >
              {isCopied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
            </Button>
          </motion.div>
          <motion.div
            animate={isLinkCopied ? { scale: [1, 1.2, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCopyLink(code.code)}
              className="h-7 w-7"
              title="Copiar link"
            >
              {isLinkCopied ? <Check className="w-3 h-3 text-primary" /> : <Share2 className="w-3 h-3" />}
            </Button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// ==================== Componente de item referral ====================

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
