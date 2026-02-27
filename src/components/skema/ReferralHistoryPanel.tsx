/**
 * ReferralHistoryPanel - Painel de convites com códigos DNA únicos
 * 
 * Códigos SKINV... são gerados automaticamente pelo universo com base no tier.
 * Cada código é único e só pode ser usado uma vez.
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Copy, Check, Clock, Coins, ChevronDown, ChevronUp, Users, Loader2, Share2, Ticket, Dna, Lock, Sparkles, X, UserPlus, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ptBR as ptBRLocale, enUS as enUSLocale } from 'date-fns/locale';
import { ReferralEntry, useReferralHistory } from '@/hooks/useReferralHistory';
import { useInviteCodes, InviteCode } from '@/hooks/useInviteCodes';
import { useI18n } from '@/i18n/I18nContext';
import { getTierEconomy, formatEnergy } from '@/lib/tierEconomy';
import { toast } from '@/components/ui/use-toast';
import { buildInviteUrl } from '@/lib/inviteUrl';
import { copyToClipboard } from '@/lib/clipboardFallback';

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
  const { codes, isLoading: codesLoading, isAutoGenerating, error: codesError, unusedCount, usedCount, sharedCount, refetch: refetchCodes, shareCode, cancelCode } = useInviteCodes(playerId, playerTier);
  const { t, locale } = useI18n();
  
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const tierConfig = getTierEconomy(playerTier);
  const maxInvites = tierConfig.maxInvites;
  const costPerInvite = tierConfig.costPerInvite;
  const invitedTierLabel = tierConfig.invitedTierLabel;
  const canInvite = maxInvites > 0;

  const handleShareAndCopy = async (codeId: string, code: string, type: 'code' | 'link' | 'whatsapp', sharedToName?: string) => {
    // Find the code object
    const codeObj = codes.find(c => c.id === codeId);
    const isAlreadyShared = codeObj?.sharedAt;

    // Share (debit) if not already shared
    if (!isAlreadyShared) {
      const ok = await shareCode(codeId, sharedToName);
      if (!ok) {
        toast({
          title: t.referral.shareError,
          description: t.referral.insufficientOrServerError,
          variant: 'destructive',
        });
        return;
      }
      onRefreshProfile(); // Refresh balance
    }

    const inviteUrl = buildInviteUrl(code);

    if (type === 'whatsapp') {
      const message = `${t.referral.whatsAppMessage}\n\n${inviteUrl}\n\nCódigo: ${code}`;
      const waUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');
      toast({
        title: '✅ WhatsApp',
        description: sharedToName 
          ? `${t.referral.inviteFor} "${sharedToName}"`
          : t.referral.sendToInvitee,
      });
      return;
    }

    // Copy to clipboard — try immediately, then retry with delay
    const textToCopy = inviteUrl;

    // First attempt
    let ok = await copyToClipboard(textToCopy);
    
    // Retry after a short delay (helps in iframe environments)
    if (!ok) {
      await new Promise(r => setTimeout(r, 300));
      ok = await copyToClipboard(textToCopy);
    }

    if (ok) {
      setCopiedCode(`link-${code}`);
      toast({
        title: '✅ ' + t.referral.linkCopied,
        description: sharedToName 
          ? `${t.referral.inviteFor} "${sharedToName}" — ${t.referral.sendNow}`
          : t.referral.sendToInvitee,
      });
      setTimeout(() => setCopiedCode(null), 3000);
    }
    // Note: if clipboard fails, the visible link field is already shown by the child component
  };

  const handleCancelCode = async (codeId: string) => {
    const ok = await cancelCode(codeId);
    if (ok) {
      toast({
        title: t.referral.inviteCancelled,
        description: `${t.referral.energyRefunded} (${formatEnergy(costPerInvite)}).`,
      });
      onRefreshProfile();
    } else {
      toast({
        title: t.referral.cancelError,
        description: t.referral.alreadyAcceptedOrError,
        variant: 'destructive',
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
          title: t.referral.rewardsRedeemed,
          description: `${t.referral.youReceived} k$${result.total_reward.toFixed(2)} ${t.referral.forInvites}`,
        });
        await refetchReferrals();
        await refetchCodes();
        onRefreshProfile();
      } else {
        toast({
          title: t.referral.noPendingRewards,
          description: t.referral.allProcessed,
        });
      }
    } catch (e) {
      console.error('[REFERRALS] Erro ao processar:', e);
      toast({
        title: t.referral.processError,
        description: t.referral.tryLater,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: locale === 'pt-BR' ? ptBRLocale : enUSLocale });
    } catch {
      return t.referral.unknownDate;
    }
  };

  // Ploft/jogador sem convites
  if (!canInvite) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-3">
        <div className="flex items-center gap-2 text-white/40">
          <Lock className="w-4 h-4" />
          <span className="text-sm">{t.referral.invitesNotAvailable}</span>
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
            <span className="font-medium text-white text-sm">🧬 Convide Amigos</span>
            <div className="text-[10px] text-white/40">
              {t.referral.generates} {invitedTierLabel} • {formatEnergy(costPerInvite)}/{t.referral.each}
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
            {sharedCount > 0 && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 text-xs rounded-full font-medium">
                {sharedCount} ⏳
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
                <span className="text-white/50">{t.referral.eachCodeGenerates}</span>
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
                    {isAutoGenerating ? t.referral.generatingDna : t.common.loading}
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
                      onShareAndCopy={handleShareAndCopy}
                      onCancel={handleCancelCode}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white/5 rounded-lg p-4 text-center">
                  <Ticket className="w-6 h-6 text-white/20 mx-auto mb-1" />
                  <p className="text-xs text-white/40">
                    {t.referral.noCodesForTier}
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
                  <span>{t.referral.inviteTree} ({usedCount})</span>
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
                          {t.referral.tryAgain}
                        </Button>
                      </div>
                    ) : referrals.length === 0 ? (
                      <div className="text-center py-4">
                        <p className="text-sm text-white/40">{t.referral.noInviteesYet}</p>
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
                  {t.referral.redeem} {formatEnergy(pendingRewardsTotal)}
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
  onShareAndCopy,
  onCancel,
  formatDate 
}: { 
  code: InviteCode; 
  index: number;
  copiedCode: string | null;
  onShareAndCopy: (codeId: string, code: string, type: 'code' | 'link' | 'whatsapp', sharedToName?: string) => Promise<void>;
  onCancel: (codeId: string) => Promise<void>;
  formatDate: (d: string) => string;
}) {
  const { t, locale } = useI18n();
  const [isCancelling, setIsCancelling] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [inviteeName, setInviteeName] = useState('');
  const [pendingAction, setPendingAction] = useState<'code' | 'link' | 'whatsapp' | null>(null);
  const [visibleLink, setVisibleLink] = useState<string | null>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const isUsed = !!code.usedById;
  const isCopied = copiedCode === code.code;
  const isLinkCopied = copiedCode === `link-${code.code}`;
  const isPending = !isUsed && !!code.sharedAt;

  const handleCancel = async () => {
    setIsCancelling(true);
    await onCancel(code.id);
    setIsCancelling(false);
  };

  const handleStartShare = (type: 'code' | 'link' | 'whatsapp') => {
    setPendingAction(type);
    setShowNameInput(true);
    setVisibleLink(null);
    setTimeout(() => nameInputRef.current?.focus(), 100);
  };

  const handleConfirmShare = async () => {
    if (!pendingAction) return;
    const name = inviteeName.trim();
    if (!name) {
      nameInputRef.current?.focus();
      return;
    }
    // Blur the name input BEFORE copying so execCommand doesn't copy the input value
    nameInputRef.current?.blur();
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    
    const action = pendingAction;
    setShowNameInput(false);
    setInviteeName('');
    setPendingAction(null);

    // For link actions, show the link text field immediately
    if (action !== 'whatsapp') {
      const linkText = buildInviteUrl(code.code);
      setVisibleLink(linkText);
    }

    await onShareAndCopy(code.id, code.code, action, name);

    // Always focus and select the visible field after everything settles
    if (action !== 'whatsapp') {
      setTimeout(() => {
        linkInputRef.current?.focus();
        linkInputRef.current?.select();
      }, 400);
    }
  };

  const handleCancelInput = () => {
    setShowNameInput(false);
    setInviteeName('');
    setPendingAction(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`rounded-lg p-2 border transition-colors ${
        isUsed 
          ? 'bg-white/3 border-white/5 opacity-50' 
          : isPending
            ? 'bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border-amber-500/20'
            : 'bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:border-purple-500/40'
      }`}
    >
      <div className="flex items-center gap-2">
        {/* Número do slot */}
        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
          isUsed 
            ? 'bg-white/10 text-white/30' 
            : isPending
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-purple-500/20 text-purple-300'
        }`}>
          {index}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={`font-mono text-xs tracking-wider ${isUsed ? 'text-white/30 line-through' : isPending ? 'text-amber-200' : 'text-purple-200'}`}>
              {code.code}
            </span>
          </div>
          <div className="text-[10px] text-white/30 mt-0.5">
            {isUsed ? (
              <span className="text-emerald-300/80">
                ✅ {t.referral.inviteAcceptedBy} <span className="text-white/70 font-semibold">{code.usedByName || '?'}</span>
                {code.usedAt && <span className="text-white/30 ml-1">• {new Date(code.usedAt).toLocaleDateString(locale === 'pt-BR' ? 'pt-BR' : 'en-US', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>}
              </span>
            ) : isPending ? (
              <span className="text-amber-400/80 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 animate-pulse" /> {t.referral.pending}
                {code.sharedToName && (
                  <span className="text-white/50 ml-0.5">• {t.referral.forPerson} <span className="font-semibold text-amber-200">{code.sharedToName}</span></span>
                )}
              </span>
            ) : (
              <span className="text-emerald-400/60">● {t.referral.available}</span>
            )}
          </div>
        </div>

        {!isUsed && (
          <div className="flex items-center gap-0.5 shrink-0">
            {isPending ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancel}
                disabled={isCancelling}
                className="h-7 w-7 text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                title={t.lobby.cancel}
              >
                {isCancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              </Button>
            ) : (
              <>
                <motion.div
                  animate={isLinkCopied ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleStartShare('link')}
                    className="h-7 w-7 text-white/40 hover:text-white"
                    title={t.referral.copyLink}
                  >
                    {isLinkCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                  </Button>
                </motion.div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleStartShare('whatsapp')}
                  className="h-7 w-7 text-emerald-400/60 hover:text-emerald-400 hover:bg-emerald-500/10"
                  title={t.referral.shareWhatsApp}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Input de nome do convidado */}
      <AnimatePresence>
        {showNameInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/10">
              <UserPlus className="w-3.5 h-3.5 text-purple-300 shrink-0" />
              <input
                ref={nameInputRef}
                type="text"
                name={"invite_guest_" + code.id}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                data-form-type="other"
                placeholder={t.referral.guestNameInputPlaceholder}
                value={inviteeName}
                onChange={(e) => setInviteeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmShare();
                  if (e.key === 'Escape') handleCancelInput();
                }}
                className="flex-1 bg-white/10 border border-white/20 rounded-md px-2 py-1 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-purple-400/50 min-w-0"
                maxLength={30}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleConfirmShare}
                className="h-6 w-6 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 shrink-0"
                title="Confirmar"
              >
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCancelInput}
                className="h-6 w-6 text-white/40 hover:text-white hover:bg-white/10 shrink-0"
                title="Cancelar"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Link visível para copiar manualmente */}
      <AnimatePresence>
        {visibleLink && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-emerald-500/20">
              <input
                ref={linkInputRef}
                type="text"
                readOnly
                value={visibleLink}
                onFocus={(e) => e.target.select()}
                onClick={(e) => (e.target as HTMLInputElement).select()}
                className="flex-1 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-2 py-1.5 text-[11px] text-emerald-200 font-mono select-all focus:outline-none focus:border-emerald-400/60 min-w-0 cursor-text"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  const ok = await copyToClipboard(visibleLink!);
                  if (ok) {
                    toast({ title: '✅ Link copiado!' });
                    setVisibleLink(null);
                  } else {
                    // Select the text so user can Ctrl+C
                    linkInputRef.current?.focus();
                    linkInputRef.current?.select();
                  }
                }}
                className="h-7 w-7 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 shrink-0"
                title="Copiar link"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setVisibleLink(null)}
                className="h-6 w-6 text-white/40 hover:text-white shrink-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-[10px] text-emerald-300/60 mt-1 px-1">
              📋 Toque em copiar ou selecione o link acima
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ==================== Componente de item referral ====================

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
