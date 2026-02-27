/**
 * GuardianDashboard - Dashboard com métricas gerais da plataforma
 * Cards clicáveis para navegar entre tabs
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useDashboardStats, useReferralTree, useSkemaBoxTransactions } from '@/hooks/useGuardianData';
import { useSupabasePlayer } from '@/hooks/useSupabasePlayer';
import { useInviteCodes } from '@/hooks/useInviteCodes';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Zap, Box, Gift, Trophy, TrendingUp, Copy, Check, Share2, Link, ArrowDownRight, Dna, TreePine, Heart, Loader2, Calendar, Receipt, Radio, UserPlus, Activity, AlertTriangle, Briefcase, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { calculateBalanceBreakdown, formatEnergy as formatEnergyUtil, getTierEconomy } from '@/lib/tierEconomy';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GENERATION_COLORS, PlanetFace } from '@/components/skema/GenerationColorPicker';
import { buildInviteUrl } from '@/lib/inviteUrl';


// Sub-component: Investment Blocks Ledger (spreadsheet with dynamic month columns)
const TARGET_PCT = 25;
const NUM_INSTALLMENTS = 6;

/** Generate 6 month labels starting from a date, using Brazilian format */
function generateMonthLabels(startDate: Date): string[] {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const labels: string[] = [];
  for (let i = 0; i < NUM_INSTALLMENTS; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    labels.push(`${months[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`);
  }
  return labels;
}

/** Generate installment details with due dates on same day-of-month, +1 month each */
function generateInstallments(startDate: Date): any[] {
  const result: any[] = [];
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  for (let i = 0; i < NUM_INSTALLMENTS; i++) {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + i);
    result.push({
      month: `${months[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
      due_date: d.toISOString().slice(0, 10),
      paid: false,
    });
  }
  return result;
}

function InvestmentBlocksLedger() {
  const [showForm, setShowForm] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [totalValue, setTotalValue] = useState('15500');
  const [soldAt, setSoldAt] = useState(new Date().toISOString().slice(0, 10));
  const [firstPayDate, setFirstPayDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isOverbook, setIsOverbook] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingDue, setEditingDue] = useState<{ blockId: string; monthIdx: number } | null>(null);
  const [dueValue, setDueValue] = useState('');

  const { data: blocks, refetch } = useQuery({
    queryKey: ['investment-blocks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_blocks')
        .select('*')
        .order('sold_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  const handleAdd = async () => {
    if (!buyerName.trim() || !firstPayDate) {
      toast.error('Preencha o comprador e a data do 1º pagamento');
      return;
    }
    setIsSaving(true);
    try {
      const payStart = new Date(firstPayDate + 'T12:00:00');
      const autoDetails = generateInstallments(payStart);

      const { error } = await supabase.from('investment_blocks').insert({
        buyer_name: buyerName.trim(),
        total_value: parseFloat(totalValue) || 15500,
        sold_at: soldAt,
        notes: notes.trim() || null,
        overbook: isOverbook,
        installment_details: autoDetails,
      } as any);
      if (error) throw error;
      toast.success(`Bloco 2,5% registrado para ${buyerName} — parcelas a partir de ${firstPayDate}`);
      setBuyerName(''); setTotalValue('15500'); setFirstPayDate(''); setNotes(''); setIsOverbook(false); setShowForm(false);
      refetch();
    } catch (e: any) {
      toast.error('Erro: ' + (e.message || 'desconhecido'));
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('investment_blocks').delete().eq('id', id);
    if (error) toast.error('Erro ao remover');
    else { toast.success('Bloco removido'); refetch(); }
  };

  const handleSaveDueDate = async (blockId: string, monthIdx: number, dateStr: string) => {
    const block = blocks?.find((b: any) => b.id === blockId);
    if (!block) return;
    const details: any[] = Array.isArray((block as any).installment_details)
      ? [...(block as any).installment_details]
      : generateInstallments(new Date(block.sold_at + 'T12:00:00'));
    details[monthIdx] = { ...details[monthIdx], due_date: dateStr || null };
    await supabase.from('investment_blocks').update({ installment_details: details } as any).eq('id', blockId);
    setEditingDue(null); setDueValue(''); refetch();
  };

  const handleTogglePaid = async (blockId: string, monthIdx: number) => {
    const block = blocks?.find((b: any) => b.id === blockId);
    if (!block) return;
    const details: any[] = Array.isArray((block as any).installment_details)
      ? [...(block as any).installment_details]
      : generateInstallments(new Date(block.sold_at + 'T12:00:00'));
    details[monthIdx] = { ...details[monthIdx], paid: !details[monthIdx].paid };
    await supabase.from('investment_blocks').update({ installment_details: details } as any).eq('id', blockId);
    refetch();
  };

  const totalSold = blocks?.filter((b: any) => !(b as any).overbook).length || 0;
  const totalOverbook = blocks?.filter((b: any) => (b as any).overbook).length || 0;
  const totalPctSold = totalSold * 2.5;
  const totalPctRemaining = TARGET_PCT - totalPctSold;
  const totalValueSold = blocks?.filter((b: any) => !(b as any).overbook).reduce((s: number, b: any) => s + Number(b.total_value), 0) || 0;

  return (
    <div className="bg-background/60 rounded-lg p-3 border border-yellow-500/20 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
            📋 Blocos ({totalSold}) {totalOverbook > 0 && <span className="text-yellow-500">+ {totalOverbook} overbook</span>}
          </p>
          <p className="text-[9px] text-muted-foreground">
            Meta {TARGET_PCT}% · Vendido {totalPctSold}% · Falta {totalPctRemaining > 0 ? totalPctRemaining : 0}%
            {totalPctRemaining <= 0 && ' ✅'}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-3 w-3" /> Registrar venda
        </Button>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all" style={{ width: `${Math.min(100, (totalPctSold / TARGET_PCT) * 100)}%` }} />
      </div>

      {showForm && (
        <div className="bg-muted/20 rounded-lg p-2 space-y-2 border border-border/40">
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Comprador" value={buyerName} onChange={e => setBuyerName(e.target.value)} className="h-7 text-xs" />
            <Input type="number" placeholder="Valor R$" value={totalValue} onChange={e => setTotalValue(e.target.value)} className="h-7 text-xs" />
            <Input type="date" value={soldAt} onChange={e => setSoldAt(e.target.value)} className="h-7 text-xs" title="Data de fechamento" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-muted-foreground">1º Pagamento (gera 30 em 30)</span>
              <Input type="date" value={firstPayDate} onChange={e => setFirstPayDate(e.target.value)} className="h-7 text-xs" />
            </div>
            <Input placeholder="Obs" value={notes} onChange={e => setNotes(e.target.value)} className="h-7 text-xs" />
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={isOverbook} onChange={e => setIsOverbook(e.target.checked)} className="w-3 h-3" />
              Overbook
            </label>
            <Button size="sm" className="h-7 text-xs gap-1" onClick={handleAdd} disabled={isSaving || !buyerName.trim()}>
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Salvar
            </Button>
          </div>
        </div>
      )}

      {/* Spreadsheet table */}
      {blocks && blocks.length > 0 ? (() => {
        // Derive column headers from the first block's installment_details
        const firstDetails: any[] = Array.isArray(blocks[0]?.installment_details)
          ? blocks[0].installment_details
          : generateInstallments(new Date(blocks[0]?.sold_at + 'T12:00:00'));
        const colLabels = firstDetails.map((d: any) => d.month || '—');
        const numCols = firstDetails.length;

        return (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-[10px] min-w-[600px]">
            <thead>
              <tr className="border-b border-border/40">
                <th className="text-left py-1 px-1 text-muted-foreground font-medium">Comprador</th>
                <th className="text-center py-1 px-1 text-muted-foreground font-medium">R$/mês</th>
                {colLabels.map((m: string) => (
                  <th key={m} className="text-center py-1 px-1 text-muted-foreground font-medium whitespace-nowrap">{m}</th>
                ))}
                <th className="w-5"></th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((b: any) => {
                const details: any[] = Array.isArray(b.installment_details)
                  ? b.installment_details
                  : generateInstallments(new Date(b.sold_at + 'T12:00:00'));
                const parcelaVal = Number(b.total_value) / (b.installments || 6);
                return (
                  <tr key={b.id} className={cn("border-b border-border/20", b.overbook && "opacity-60 bg-yellow-500/5")}>
                    <td className="py-1.5 px-1">
                      <div className="flex items-center gap-1">
                        {b.overbook && <span className="text-[8px] text-yellow-500 font-bold">OB</span>}
                        <span className="font-medium text-foreground truncate max-w-[90px]">{b.buyer_name}</span>
                      </div>
                      {b.notes && <span className="text-[8px] text-muted-foreground block truncate max-w-[90px]">{b.notes}</span>}
                    </td>
                    <td className="text-center py-1.5 px-1 text-yellow-500 font-bold whitespace-nowrap">
                      {parcelaVal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </td>
                    {details.map((inst: any, idx: number) => {
                      const isEditing = editingDue?.blockId === b.id && editingDue?.monthIdx === idx;
                      return (
                        <td key={idx} className="text-center py-1 px-0.5">
                          <div
                            className={cn(
                              "rounded px-1 py-0.5 cursor-pointer text-[9px]",
                              inst.paid ? "bg-emerald-500/20 text-emerald-400" : inst.due_date ? "bg-muted/40 text-foreground" : "bg-muted/20 text-muted-foreground"
                            )}
                            onClick={() => handleTogglePaid(b.id, idx)}
                            title={inst.paid ? 'Pago ✅' : 'Marcar pago'}
                          >
                            {inst.paid ? '✅' : inst.due_date ? inst.due_date.slice(8, 10) + '/' + inst.due_date.slice(5, 7) : '—'}
                          </div>
                          {isEditing ? (
                            <Input
                              type="date" value={dueValue} onChange={e => setDueValue(e.target.value)}
                              onBlur={() => handleSaveDueDate(b.id, idx, dueValue)}
                              onKeyDown={e => e.key === 'Enter' && handleSaveDueDate(b.id, idx, dueValue)}
                              className="h-5 text-[9px] mt-0.5 w-full px-0.5" autoFocus
                            />
                          ) : (
                            <button className="text-[8px] text-primary/60 hover:text-primary mt-0.5 w-full" onClick={() => { setEditingDue({ blockId: b.id, monthIdx: idx }); setDueValue(inst.due_date || ''); }}>
                              {inst.due_date ? 'editar' : 'vcto'}
                            </button>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-1 px-0.5">
                      <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive/60 hover:text-destructive" onClick={() => handleDelete(b.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border/60">
                <td className="py-1.5 px-1 text-[10px] font-bold text-foreground">TOTAL</td>
                <td className="text-center py-1.5 px-1 text-[10px] font-bold text-yellow-500">
                  {blocks.reduce((s: number, b: any) => s + Number(b.total_value) / (b.installments || 6), 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </td>
                {Array.from({ length: numCols }).map((_, colIdx) => {
                  const colTotal = blocks.reduce((sum: number, b: any) => {
                    const det: any[] = Array.isArray(b.installment_details) ? b.installment_details : [];
                    if (colIdx >= det.length) return sum;
                    return sum + Number(b.total_value) / (b.installments || 6);
                  }, 0);
                  const paidTotal = blocks.reduce((sum: number, b: any) => {
                    const det: any[] = Array.isArray(b.installment_details) ? b.installment_details : [];
                    if (colIdx >= det.length || !det[colIdx]?.paid) return sum;
                    return sum + Number(b.total_value) / (b.installments || 6);
                  }, 0);
                  return (
                    <td key={colIdx} className="text-center py-1.5 px-0.5">
                      <div className="text-[9px] font-bold text-foreground">
                        {colTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                      </div>
                      {paidTotal > 0 && (
                        <div className="text-[8px] text-emerald-400">
                          ✅ {paidTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        );
      })() : (
        <p className="text-[10px] text-muted-foreground">Nenhum bloco vendido ainda</p>
      )}

      {totalSold > 0 && (
        <div className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-yellow-500/10 border border-yellow-500/20">
          <span className="text-muted-foreground font-medium">Captado</span>
          <span className="text-yellow-500 font-bold">{totalPctSold}% de {TARGET_PCT}% · R$ {totalValueSold.toLocaleString('pt-BR')}</span>
        </div>
      )}
      {totalOverbook > 0 && (
        <div className="flex items-center justify-between text-[10px] px-2 py-1 rounded bg-yellow-500/5 border border-yellow-500/10">
          <span className="text-muted-foreground">Overbook (análise posterior)</span>
          <span className="text-yellow-500">{totalOverbook} bloco(s) · {totalOverbook * 2.5}%</span>
        </div>
      )}
    </div>
  );
}

interface GuardianDashboardProps {
  onNavigateTab?: (tab: string) => void;
}

export function GuardianDashboard({ onNavigateTab }: GuardianDashboardProps) {
  const { data: stats, isLoading, error } = useDashboardStats();
  const { data: referralNodes } = useReferralTree();
  const { data: sboxTransactions } = useSkemaBoxTransactions();
  const { player } = useSupabasePlayer();
  const { codes, isLoading: isLoadingCodes, isAutoGenerating, unusedCount, usedCount, sharedCount, shareCode } = useInviteCodes(player?.id || null, player?.playerTier || null);
  const tierConfig = getTierEconomy(player?.playerTier || null);
  const costPerInvite = tierConfig.costPerInvite;
  const pendingEnergy = sharedCount * costPerInvite;
  const unusedEnergy = unusedCount * costPerInvite;
  const [copied, setCopied] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<{ codeId: string; code: string; type: 'code' | 'link' } | null>(null);
  const [inviteeName, setInviteeName] = useState('');
  const inviteeInputRef = useRef<HTMLInputElement>(null);
  const [showDonate, setShowDonate] = useState(false);
  const [donateAmount, setDonateAmount] = useState('');
  const [isDonating, setIsDonating] = useState(false);

  // Fetch detailed referral data with inviter/invited info
  const { data: detailedReferrals } = useQuery({
    queryKey: ['guardian-detailed-referrals'],
    queryFn: async () => {
      const { data: referrals, error: refErr } = await supabase
        .from('referrals')
        .select('inviter_id, invited_id, reward_amount, reward_credited, created_at');
      if (refErr) throw refErr;

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, player_tier');

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return referrals?.map(r => ({
        ...r,
        inviterName: profileMap.get(r.inviter_id)?.name || '?',
        inviterTier: profileMap.get(r.inviter_id)?.player_tier || '?',
        invitedName: profileMap.get(r.invited_id)?.name || '?',
        invitedTier: profileMap.get(r.invited_id)?.player_tier || '?',
        day: r.created_at.slice(0, 10),
      })) || [];
    },
    staleTime: 30_000,
  });

  // Fetch investor interest list
  const { data: investorInterest } = useQuery({
    queryKey: ['guardian-investor-interest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investor_interest')
        .select('id, player_id, player_name, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  // Fetch which generation colors are taken and by whom (include emoji)
  const { data: takenColors } = useQuery({
    queryKey: ['guardian-taken-colors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, generation_color, player_tier, emoji')
        .not('generation_color', 'is', null)
        .in('player_tier', ['Criador', 'guardiao']);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30_000,
  });

  const botCount = stats?.botTreasuryBotCount || 99;

  // Real-time online player count via presence
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlinePlayersList, setOnlinePlayersList] = useState<{ id: string; name: string; emoji: string; status: string }[]>([]);
  const channelRef = useRef<any>(null);

  const PRESENCE_TIMEOUT_MS = 120_000; // 2 minutos — presences mais velhas são consideradas fantasmas

  const extractLivePlayers = useCallback((state: Record<string, any>) => {
    const now = Date.now();
    const uniquePlayers = new Map<string, { id: string; name: string; emoji: string; status: string }>();
    console.log('[GUARDIAN-PRESENCE] Raw state keys:', Object.keys(state));
    Object.entries(state).forEach(([key, presences]: [string, any]) => {
      if (key === 'guardian' || key === 'guardian-watcher' || key.startsWith('guardian')) return;
      presences.forEach((p: any) => {
        if (p.id && !p.id.startsWith('guardian') && p.name) {
          const joinedAt = p.joinedAt ? new Date(p.joinedAt).getTime() : 0;
          const age = now - joinedAt;
          console.log(`[GUARDIAN-PRESENCE] Player: ${p.name}, key: ${key}, joinedAt: ${p.joinedAt}, age: ${Math.round(age/1000)}s`);
          if (joinedAt === 0) return; // sem timestamp = fantasma
          if (age < PRESENCE_TIMEOUT_MS) {
            uniquePlayers.set(p.id, { id: p.id, name: p.name, emoji: p.emoji || '🎮', status: p.status || 'online' });
          } else {
            console.log(`[GUARDIAN-PRESENCE] EXPIRED: ${p.name} (age ${Math.round(age/1000)}s > ${PRESENCE_TIMEOUT_MS/1000}s)`);
          }
        }
      });
    });
    return uniquePlayers;
  }, []);

  const refreshPresence = useCallback(() => {
    if (channelRef.current) {
      const state = channelRef.current.presenceState();
      const uniquePlayers = extractLivePlayers(state);
      setOnlineCount(uniquePlayers.size);
      setOnlinePlayersList(Array.from(uniquePlayers.values()));
    }
  }, [extractLivePlayers]);

  useEffect(() => {
    const channel = supabase.channel('skema-lobby', {
      config: { presence: { key: 'guardian-watcher' } },
    });
    channelRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const uniquePlayers = extractLivePlayers(state);
      setOnlineCount(uniquePlayers.size);
      setOnlinePlayersList(Array.from(uniquePlayers.values()));
    });

    channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ id: 'guardian', role: 'watcher', joinedAt: new Date().toISOString() });
      }
    });

    // Auto-refresh a cada 30s para limpar fantasmas
    const cleanupInterval = setInterval(refreshPresence, 30_000);

    return () => {
      clearInterval(cleanupInterval);
      channel.untrack().catch(() => {});
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, []);

  // Real-time new player growth tracker - listens for profile inserts
  const [newPlayersToday, setNewPlayersToday] = useState(0);
  const [recentJoins, setRecentJoins] = useState<{ name: string; emoji: string; tier: string; time: string }[]>([]);

  useEffect(() => {
    // Get local day boundaries in UTC for correct timezone filtering
    const localStart = new Date();
    localStart.setHours(0, 0, 0, 0);
    const todayStartUTC = localStart.toISOString();

    supabase
      .from('profiles')
      .select('id, name, emoji, player_tier, created_at')
      .neq('player_tier', 'master_admin')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) {
          const todayPlayers = data.filter(p => p.created_at >= todayStartUTC);
          setNewPlayersToday(todayPlayers.length);
          setRecentJoins(data.slice(0, 5).map(p => ({
            name: p.name, emoji: p.emoji,
            tier: p.player_tier === 'jogador' ? 'Ploft' : (p.player_tier || 'Ploft'),
            time: format(new Date(p.created_at), "dd/MM HH:mm", { locale: ptBR }),
          })));
        }
      });

    // Subscribe to realtime inserts
    const sub = supabase
      .channel('guardian-new-players')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
        const p = payload.new as any;
        if (p.player_tier !== 'master_admin') {
          setNewPlayersToday(prev => prev + 1);
          setRecentJoins(prev => [{
            name: p.name, emoji: p.emoji,
            tier: p.player_tier === 'jogador' ? 'Ploft' : (p.player_tier || 'Ploft'),
            time: format(new Date(), "HH:mm", { locale: ptBR }),
          }, ...prev].slice(0, 5));
        }
      })
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, []);

  const handleDonateToBots = useCallback(async () => {
    const totalAmount = parseFloat(donateAmount);
    if (!totalAmount || totalAmount <= 0 || !player?.id) return;
    
    if ((player.energy || 0) < totalAmount) {
      toast.error('Saldo insuficiente');
      return;
    }

    setIsDonating(true);
    try {
      // 1. Debit from admin
      const { error: debitErr } = await supabase.rpc('update_player_energy', {
        p_player_id: player.id,
        p_amount: -totalAmount,
      });
      if (debitErr) throw debitErr;

      // 2. Credit to Bot Treasury
      const { error: creditErr } = await supabase.rpc('update_bot_treasury', {
        p_amount: totalAmount,
        p_description: `Doação HX: k$ ${totalAmount.toFixed(2)} (${(totalAmount / botCount).toFixed(4)}/bot)`,
      });
      if (creditErr) throw creditErr;

      // 3. Update balance_per_bot
      const newBalance = (stats?.botTreasuryBalance || 0) + totalAmount;
      const perBot = Math.round((newBalance / botCount) * 100) / 100;
      await supabase.from('bot_treasury').update({ 
        balance_per_bot: perBot 
      }).eq('id', '00000000-0000-0000-0000-000000000002');

      toast.success(`Doado k$ ${totalAmount.toFixed(2)} para ${botCount} bots (k$ ${(totalAmount / botCount).toFixed(4)}/bot)`);
      setDonateAmount('');
      setShowDonate(false);
      // Refresh data
      window.location.reload();
    } catch (e: any) {
      toast.error('Erro ao doar: ' + (e.message || 'desconhecido'));
    } finally {
      setIsDonating(false);
    }
  }, [donateAmount, player, botCount, stats]);

  // Calculate total locked and available from all non-HX players
  const { totalLocked, totalAvailable } = (() => {
    if (!referralNodes) return { totalLocked: 0, totalAvailable: 0 };
    let locked = 0, available = 0;
    referralNodes.filter(n => n.player_tier !== 'master_admin').forEach(n => {
      const bal = calculateBalanceBreakdown(n.energy, n.player_tier, n.invites_sent);
      locked += bal.locked;
      available += bal.available;
    });
    return { totalLocked: locked, totalAvailable: available };
  })();

  const handleStartShare = (codeId: string, code: string, type: 'code' | 'link') => {
    setShareTarget({ codeId, code, type });
    setInviteeName('');
    setTimeout(() => inviteeInputRef.current?.focus(), 100);
  };

  const handleConfirmShare = async () => {
    if (!shareTarget) return;
    const name = inviteeName.trim();
    if (!name) {
      inviteeInputRef.current?.focus();
      return;
    }
    // Share (mark as shared with name)
    const codeObj = codes.find(c => c.id === shareTarget.codeId);
    if (codeObj && !codeObj.sharedAt) {
      const ok = await shareCode(shareTarget.codeId, name);
      if (!ok) {
        toast.error('Erro ao compartilhar convite');
        return;
      }
    }
    // Copy to clipboard
    try {
      const textToCopy = shareTarget.type === 'link' 
        ? buildInviteUrl(shareTarget.code) 
        : shareTarget.code;
      await navigator.clipboard.writeText(textToCopy);
      setCopied(shareTarget.type === 'link' ? `link-${shareTarget.code}` : shareTarget.code);
      toast.success(`${shareTarget.type === 'link' ? 'Link' : 'Código'} copiado! Convite para "${name}"`);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
    setShareTarget(null);
    setInviteeName('');
  };

  const handleCancelShare = () => {
    setShareTarget(null);
    setInviteeName('');
  };

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        Erro ao carregar métricas: {error.message}
      </div>
    );
  }

  const metrics = [
    {
      title: 'Jogadores',
      value: stats?.totalPlayers || 0,
      icon: Users,
      format: (v: number) => v.toString(),
      tab: 'users',
      clickable: true,
    },
    {
      title: 'Energia Circulando',
      value: stats?.totalEnergy || 0,
      icon: Zap,
      format: (v: number) => formatEnergyUtil(v),
      subtitle: `🔒 ${formatEnergyUtil(totalLocked)} bloq. | 🔓 ${formatEnergyUtil(totalAvailable)} livre`,
      tab: 'users',
      clickable: true,
    },
    {
      title: 'Skema Box',
      value: stats?.skemaBoxBalance || 0,
      icon: Box,
      format: (v: number) => formatEnergyUtil(v),
      subtitle: 'Rake acumulado de corridas',
      tab: 'skemabox',
      clickable: true,
    },
    {
      title: 'Convites',
      value: stats?.totalReferrals || 0,
      subtitle: `${stats?.creditedReferrals || 0} aceitos`,
      icon: Gift,
      format: (v: number) => v.toString(),
      tab: 'referrals',
      clickable: true,
    },
    {
      title: 'Distribuído',
      value: stats?.totalDistributed || 0,
      icon: ArrowDownRight,
      format: (v: number) => formatEnergyUtil(v),
      subtitle: 'k$ transferido via convites',
      tab: 'referrals',
      clickable: true,
    },
    {
      title: 'Corridas',
      value: stats?.totalRaces || 0,
      icon: Trophy,
      format: (v: number) => v.toString(),
      tab: 'races',
      clickable: true,
    },
  ];

  const systemTotal = stats?.systemTotal || 0;
  const calculatedTotal = (stats?.hxEnergy || 0) + (stats?.playersEnergy || 0) + (stats?.skemaBoxBalance || 0) + (stats?.botTreasuryBalance || 0);
  const systemDelta = calculatedTotal - 10_000_000;

  return (
    <div className="space-y-6">
      {/* Card de Auditoria Econômica */}
      <Card className="border border-border/60 bg-card/90 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Balanço do Sistema
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Distribuição total de k$ — energia só é transferida, nunca criada
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : (
            <>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="bg-background/60 rounded-lg p-3 border border-border/40">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Zap className="h-3 w-3" /> HX (Tesouro)
                </p>
                <p className="text-lg font-bold text-foreground">
                  {formatEnergyUtil(stats?.hxEnergy || 0)}
                </p>
              </div>
              <div className="bg-background/60 rounded-lg p-3 border border-border/40">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> Jogadores
                </p>
                <p className="text-lg font-bold text-foreground">
                  {formatEnergyUtil(stats?.playersEnergy || 0)}
                </p>
              </div>
              <div className="bg-background/60 rounded-lg p-3 border border-border/40">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  🤖 Bot Treasury
                </p>
                <p className="text-lg font-bold text-foreground">
                  {formatEnergyUtil(stats?.botTreasuryBalance || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatEnergyUtil((stats?.botTreasuryBalance || 0) / botCount)}/bot
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full h-7 text-xs gap-1"
                  onClick={() => setShowDonate(!showDonate)}
                >
                  <Heart className="h-3 w-3" />
                  Doar
                </Button>
              </div>
              <div className="bg-background/60 rounded-lg p-3 border border-border/40">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Box className="h-3 w-3" /> Skema Box
                </p>
                <p className="text-lg font-bold text-foreground">
                  {formatEnergyUtil(stats?.skemaBoxBalance || 0)}
                </p>
              </div>
              <div className="bg-primary/10 rounded-lg p-3 border border-primary/30 col-span-2">
                <p className="text-xs text-muted-foreground font-medium">
                  ∑ Total Sistema
                </p>
                <p className="text-lg font-bold text-primary">
                  {formatEnergyUtil(calculatedTotal)}
                </p>
                {systemDelta !== 0 && (
                  <p className={cn(
                    "text-[10px] font-medium mt-0.5",
                    systemDelta < 0 ? "text-destructive" : "text-primary"
                  )}>
                    {systemDelta > 0 ? '+' : ''}{formatEnergyUtil(systemDelta)} delta vs 10M
                  </p>
                )}
                {systemDelta === 0 && (
                  <p className="text-[10px] text-primary mt-0.5">✅ Soma zero exata</p>
                )}
              </div>
            </div>

            {/* Painel de Doação para Bots */}
            {showDonate && (
              <div className="mt-3 bg-background/60 rounded-lg p-3 border border-border/40 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Doar de HX → Bot Treasury (valor total, dividido por {botCount} bots)
                </p>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Valor total k$"
                    value={donateAmount}
                    onChange={e => setDonateAmount(e.target.value)}
                    className="h-8 text-sm"
                    min="0"
                    step="0.01"
                  />
                  <Button
                    size="sm"
                    className="h-8 gap-1"
                    onClick={handleDonateToBots}
                    disabled={isDonating || !donateAmount || parseFloat(donateAmount) <= 0}
                  >
                    {isDonating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Heart className="h-3 w-3" />}
                    Doar
                  </Button>
                </div>
                {donateAmount && parseFloat(donateAmount) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    = {formatEnergyUtil(parseFloat(donateAmount) / botCount)} por bot
                  </p>
                )}
              </div>
            )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Alerta Bot Treasury — meta de crescimento (110k) e alerta de baixa (50k) */}
      {!isLoading && (() => {
        const bal = stats?.botTreasuryBalance || 0;
        const growthTarget = 110_000;
        const dangerTarget = 50_000;

        // Acima de 110k = meta atingida! 🎉
        if (bal >= growthTarget) {
          return (
            <Card className="border border-emerald-500/50 bg-emerald-500/10 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-400">
                    🎯 Meta de 110k atingida! Bot Treasury: {formatEnergyUtil(bal)}
                  </p>
                  <p className="text-xs text-emerald-400/80">
                    Saldo ultrapassou k$ 110.000,00 — bots bem capitalizados
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        }

        // Entre 50k e 110k — barra de progresso rumo à meta
        if (bal > dangerTarget) {
          const pct = Math.max(0, Math.min(100, ((bal - dangerTarget) / (growthTarget - dangerTarget)) * 100));
          const barColor = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-orange-500';
          return (
            <Card className="border border-primary/30 bg-primary/5 backdrop-blur-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    📊 Bot Treasury: {formatEnergyUtil(bal)} — faltam {formatEnergyUtil(growthTarget - bal)} p/ meta de 110k
                  </p>
                  <div className="mt-2 w-full max-w-sm">
                    <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
                      <span>50k (perigo)</span>
                      <span>{Math.round(pct)}%</span>
                      <span>110k (meta)</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted/40 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }

        // ≤ 50k — PERIGO
        return (
          <Card className="border border-destructive/50 bg-destructive/10 backdrop-blur-sm animate-pulse">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  🚨 PERIGO — Bot Treasury: {formatEnergyUtil(bal)}
                </p>
                <p className="text-xs text-destructive/80">
                  Saldo abaixo de k$ 50.000,00 — doe do HX urgentemente para manter arenas
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Live Counters Strip */}
      <div className="grid grid-cols-3 gap-3">
        {/* Online agora */}
        <Card className="bg-card/90 backdrop-blur-sm border-border/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <Radio className="h-5 w-5 text-primary" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-ping" />
                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{onlineCount}</p>
                <p className="text-[10px] text-muted-foreground">online agora</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 ml-auto"
                onClick={refreshPresence}
                title="Atualizar lista"
              >
                <Radio className="h-3 w-3" />
              </Button>
            </div>
            {onlinePlayersList.length > 0 ? (
              <div className="space-y-0.5 max-h-24 overflow-y-auto">
                {onlinePlayersList.map((p) => (
                  <div key={p.id} className="flex items-center gap-1 text-[10px]">
                    <span>{p.emoji}</span>
                    <span className="text-foreground truncate">{p.name}</span>
                    <Badge variant="outline" className={cn(
                      "text-[8px] px-1 py-0 h-3.5 shrink-0",
                      p.status === 'playing' ? 'border-primary text-primary' : 'border-muted-foreground'
                    )}>
                      {p.status === 'playing' ? '🎮' : '🟢'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">Ninguém no lobby</p>
            )}
          </CardContent>
        </Card>

        {/* Novos hoje */}
        <Card className="bg-card/90 backdrop-blur-sm border-border/60">
          <CardContent className="p-3 flex items-center gap-3">
            <UserPlus className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-foreground">+{newPlayersToday}</p>
              <p className="text-[10px] text-muted-foreground">novos hoje</p>
            </div>
          </CardContent>
        </Card>

        {/* Crescimento recente */}
        <Card className="bg-card/90 backdrop-blur-sm border-border/60">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-[10px] text-muted-foreground">Últimos registros</span>
            </div>
            {recentJoins.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">Nenhum registro</p>
            ) : (
              <div className="space-y-0.5">
                {recentJoins.map((j, i) => (
                  <div key={i} className="flex items-center gap-1 text-[10px]">
                    <span>{j.emoji}</span>
                    <span className="text-foreground truncate">{j.name}</span>
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-3.5 shrink-0">{j.tier}</Badge>
                    <span className="text-muted-foreground ml-auto shrink-0">{j.time}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* (Investor interest moved to Visão Geral section) */}

      {/* Alerta: Jogadores que atingiram o limite de convites */}
      {referralNodes && (() => {
        const playersAtLimit = referralNodes
          .filter(n => n.player_tier !== 'master_admin' && n.player_tier !== 'jogador' && n.player_tier !== 'Ploft')
          .map(n => {
            const config = getTierEconomy(n.player_tier);
            if (config.maxInvites <= 0) return null;
            return {
              id: n.id,
              name: n.name,
              emoji: n.emoji,
              tier: n.player_tier,
              invitesSent: n.invites_sent,
              maxInvites: config.maxInvites,
              invitedTierLabel: config.invitedTierLabel,
            };
          })
          .filter((p): p is NonNullable<typeof p> => p !== null && p.invitesSent >= p.maxInvites);

        if (playersAtLimit.length === 0) return null;

        return (
          <Card className="border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                Jogadores com Slots Esgotados ({playersAtLimit.length})
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                Esses jogadores usaram todos os convites do tier — avaliar se devem receber mais slots
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-[200px] overflow-y-auto pr-1">
                {playersAtLimit.map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-muted/30">
                    <span>{p.emoji}</span>
                    <span className="font-medium text-foreground truncate flex-1">{p.name}</span>
                    <Badge variant="outline" className="text-[10px] shrink-0">{p.tier}</Badge>
                    <span className="text-amber-400 font-mono shrink-0">
                      {p.invitesSent}/{p.maxInvites} {p.invitedTierLabel}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Galeria PlanetFace — Cores de Geração */}
      <Card className="border border-border/60 bg-card/90 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Dna className="h-5 w-5 text-primary" />
            Cores de Geração — PlanetFace
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            10 cores disponíveis para Criadores. Cores escolhidas propagam para toda a linhagem.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {GENERATION_COLORS.map(color => {
              const owner = takenColors?.find(p => p.generation_color === color.id);
              const isTaken = !!owner;
              return (
                <div key={color.id} className={cn(
                  "relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                  isTaken 
                    ? "bg-muted/20 border-border/60" 
                    : "bg-background/40 border-border/30 opacity-60"
                )}>
                  {/* Both variants side by side */}
                  <div className="flex gap-2">
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", color.bg, color.glow)}>
                      <PlanetFace className={color.face} variant="open" size="w-8 h-8" />
                    </div>
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", color.bg, color.glow)}>
                      <PlanetFace className={color.face} variant="closed" size="w-8 h-8" />
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-foreground">{color.name}</span>
                  {isTaken ? (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 gap-1">
                      🔒 {owner.emoji} {owner.name}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 text-muted-foreground">
                      disponível
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Visão Geral */}
      <h2 className="text-xl font-semibold text-foreground">Visão Geral</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((metric) => (
          <Card 
            key={metric.title} 
            className={cn(
              "bg-card/90 backdrop-blur-sm border-border/60 transition-all",
              metric.clickable && onNavigateTab && "cursor-pointer hover:border-primary/40 hover:bg-card/95 hover:scale-[1.02]"
            )}
            onClick={() => metric.clickable && onNavigateTab?.(metric.tab)}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <metric.icon className="h-4 w-4" />
                {metric.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-foreground">
                    {metric.format(metric.value)}
                  </div>
                  {metric.subtitle && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {metric.subtitle}
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 1ª Rodada de Negociações — Painel Completo */}
      <Card className="border border-yellow-500/30 bg-yellow-500/5 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-yellow-500" />
            1ª Rodada de Negociações — 2,5%
          </CardTitle>
          <p className="text-[10px] text-muted-foreground">
            Valuation R$ 620.000 · Cota 2,5% = R$ 15.500 em 6 parcelas (Mar–Ago 2026)
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 1. Parcelas */}
          <div className="bg-background/60 rounded-lg p-3 border border-border/40">
            <p className="text-[10px] text-muted-foreground mb-2 font-medium">📅 Parcelas — 6x R$ 2.583,33</p>
            <div className="grid grid-cols-6 gap-1">
              {['Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'].map((mes) => (
                <div key={mes} className="text-center p-1.5 rounded bg-muted/30 border border-border/30">
                  <p className="text-[9px] text-muted-foreground">{mes}/26</p>
                  <p className="text-[10px] font-bold text-foreground">R$ 2.583</p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Blocos Vendidos + Interessados */}
          <InvestmentBlocksLedger />

          {/* Interessados em tempo real */}
          <div className="bg-background/60 rounded-lg p-3 border border-primary/20">
            <p className="text-[10px] text-muted-foreground mb-2 font-medium flex items-center gap-1">
              <Users className="h-3 w-3" /> Interessados ({investorInterest?.length || 0})
            </p>
            {investorInterest && investorInterest.length > 0 ? (
              <div className="space-y-1 max-h-[150px] overflow-y-auto pr-1">
                {investorInterest.map(inv => (
                  <div key={inv.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-muted/30">
                    <Briefcase className="h-3 w-3 text-primary shrink-0" />
                    <span className="font-medium text-foreground truncate flex-1">{inv.player_name}</span>
                    <span className="text-muted-foreground text-[10px] shrink-0">
                      {format(new Date(inv.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">Nenhum interessado ainda</p>
            )}
          </div>

          {/* 3. Valuation + Cota */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-background/60 rounded-lg p-2 border border-border/40 text-center">
              <p className="text-[10px] text-muted-foreground">6x parcelas</p>
              <p className="text-sm font-bold text-foreground">R$ 2.583,33</p>
            </div>
            <div className="bg-background/60 rounded-lg p-2 border border-border/40 text-center">
              <p className="text-[10px] text-muted-foreground">Cota 2,5%</p>
              <p className="text-sm font-bold text-yellow-500">R$ 15.500</p>
            </div>
            <div className="bg-background/60 rounded-lg p-2 border border-border/40 text-center">
              <p className="text-[10px] text-muted-foreground">Valuation</p>
              <p className="text-sm font-bold text-foreground">R$ 620.000</p>
            </div>
          </div>

          {/* Faixas de Ativação */}
          <div className="bg-background/60 rounded-lg p-3 border border-border/40">
            <p className="text-[10px] text-muted-foreground mb-1 font-medium">📈 Faixas de Ativação (cap. 7.810)</p>
            <div className="space-y-0.5 text-[11px]">
              {[
                { pct: '10%', players: 781, val: 899712 },
                { pct: '20%', players: 1562, val: 1799424 },
                { pct: '35%', players: 2734, val: 3149568 },
                { pct: '50%', players: 3905, val: 4499760 },
                { pct: '75%', players: 5858, val: 6748416 },
                { pct: '100%', players: 7810, val: 8997120 },
              ].map(f => (
                <div key={f.pct} className="flex items-center justify-between py-0.5 border-b border-border/20 last:border-0">
                  <span className="text-muted-foreground font-medium">{f.pct} ({f.players.toLocaleString('pt-BR')} pl.)</span>
                  <span className="text-muted-foreground">Val. R$ {f.val.toLocaleString('pt-BR')}</span>
                  <span className="text-yellow-500 font-medium">2,5% = R$ {Math.round(f.val * 0.025).toLocaleString('pt-BR')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Meta 600 */}
          <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
            <p className="text-[10px] text-emerald-400 mb-1 font-medium">🎯 Meta 600 Players — Retorno</p>
            <div className="space-y-0.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Valuation projetado</span><span className="text-emerald-400">R$ 691.200</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">2,5% valeria</span><span className="text-emerald-400">R$ 17.280</span></div>
              <div className="flex justify-between font-bold"><span className="text-foreground">Retorno</span><span className="text-emerald-400">+11,5%</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Evolução Diária de Convites */}
      {detailedReferrals && detailedReferrals.length > 0 && (
        <Card className="border border-border/60 bg-card/90 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Evolução Diária de Convites
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Convites aceitos por dia — quem convidou, quem entrou, tier e valor transferido
            </p>
          </CardHeader>
          <CardContent>
            {(() => {
              // Group by day
              const byDay = new Map<string, typeof detailedReferrals>();
              detailedReferrals.forEach(r => {
                const list = byDay.get(r.day) || [];
                list.push(r);
                byDay.set(r.day, list);
              });
              const sortedDays = [...byDay.keys()].sort().reverse();

              return (
                <div className="space-y-4">
                  {sortedDays.map(day => {
                    const refs = byDay.get(day)!;
                    const dayTotal = refs.reduce((s, r) => s + Number(r.reward_amount), 0);
                    // Count by invited tier
                    const tierCounts: Record<string, number> = {};
                    refs.forEach(r => {
                      const t = r.invitedTier === 'jogador' ? 'Ploft' : (r.invitedTier || 'Ploft');
                      tierCounts[t] = (tierCounts[t] || 0) + 1;
                    });

                    return (
                      <div key={day} className="bg-background/60 rounded-lg border border-border/40 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-mono">
                              {format(new Date(day + 'T12:00:00'), "dd/MM/yyyy (EEEE)", { locale: ptBR })}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {refs.length} convite(s)
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            {Object.entries(tierCounts).map(([tier, count]) => (
                              <span key={tier} className="text-[10px] text-muted-foreground">
                                {tier}: {count}
                              </span>
                            ))}
                            <Badge className="text-xs bg-primary/20 text-primary border-primary/30">
                              k$ {formatEnergyUtil(dayTotal)} transferido
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {refs.map((r, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-muted/30">
                              <span className="text-muted-foreground shrink-0">
                                {r.inviterTier === 'master_admin' ? 'HX' : r.inviterName}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-medium text-foreground">{r.invitedName}</span>
                              <Badge variant="outline" className="text-[10px] shrink-0">
                                {r.invitedTier === 'jogador' ? 'Ploft' : r.invitedTier}
                              </Badge>
                              <span className="ml-auto font-mono text-foreground shrink-0">
                                k$ {formatEnergyUtil(Number(r.reward_amount))}
                              </span>
                              {r.reward_credited ? (
                                <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                              ) : (
                                <span className="text-[9px] text-orange-400 shrink-0">pendente</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Extrato de Transações — Taxas Administrativas */}
      {sboxTransactions && sboxTransactions.length > 0 && (
        <Card className="border border-border/60 bg-card/90 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Extrato de Taxas & Receitas (Skema Box)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Todas as taxas administrativas na fonte — arenas (9,09%), transferências (6,43%) e corridas (k$ 0,10)
            </p>
          </CardHeader>
          <CardContent>
            {(() => {
              // Group by type and summarize
              const byType: Record<string, { count: number; total: number }> = {};
              sboxTransactions.forEach(t => {
                if (!byType[t.type]) byType[t.type] = { count: 0, total: 0 };
                byType[t.type].count++;
                byType[t.type].total += t.amount;
              });

              const typeLabels: Record<string, string> = {
                arena_rake: '🎮 Rake de Arenas (9,09%)',
                transfer_tax: '💸 Taxa de Transferência (6,43%)',
                official_rake: '🏆 Taxa de Corrida Oficial (k$ 0,10)',
                correction: '🔧 Correção/Ajuste',
              };

              return (
                <div className="space-y-3">
                  {/* Resumo por tipo */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    {Object.entries(byType).map(([type, data]) => (
                      <div key={type} className="bg-background/60 rounded-lg p-2 border border-border/40 text-center">
                        <p className="text-[10px] text-muted-foreground">{typeLabels[type] || type}</p>
                        <p className="text-sm font-bold text-foreground">{formatEnergyUtil(data.total)}</p>
                        <p className="text-[10px] text-muted-foreground">{data.count} operação(ões)</p>
                      </div>
                    ))}
                  </div>

                  {/* Lista detalhada (últimas 20) */}
                  <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                    {sboxTransactions.slice(0, 30).map(t => (
                      <div key={t.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-muted/30">
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          {format(new Date(t.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                        <Badge variant="outline" className={cn("text-[10px] shrink-0", 
                          t.type === 'transfer_tax' ? 'border-amber-400/30 text-amber-400' :
                          t.type === 'arena_rake' ? 'border-blue-400/30 text-blue-400' :
                          t.type === 'official_rake' ? 'border-purple-400/30 text-purple-400' :
                          'border-border'
                        )}>
                          {t.type === 'transfer_tax' ? '💸 Transf.' :
                           t.type === 'arena_rake' ? '🎮 Arena' :
                           t.type === 'official_rake' ? '🏆 Corrida' : t.type}
                        </Badge>
                        <span className="text-muted-foreground truncate flex-1">
                          {t.description || '-'}
                        </span>
                        <span className="font-mono font-medium text-emerald-400 shrink-0">
                          +{formatEnergyUtil(t.amount)}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                          saldo: {formatEnergyUtil(t.balance_after)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Seção de Códigos DNA Únicos */}
      <Card className="bg-gradient-to-r from-primary/20 to-primary/5 border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Dna className="h-5 w-5 text-primary" />
              Códigos DNA de Convite
            </CardTitle>
            <div className="flex items-center gap-2">
              {isAutoGenerating && (
                <Badge variant="outline" className="text-xs animate-pulse border-primary/40 text-primary">
                  Gerando...
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs">
                {unusedCount} livres / {codes.length} total
              </Badge>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Cada código é único e de uso único — compartilhe individualmente
          </p>
          {/* Energy breakdown for pending invites */}
          {costPerInvite > 0 && (pendingEnergy > 0 || unusedEnergy > 0) && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {pendingEnergy > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-amber-400">⏳ Em trânsito</p>
                  <p className="text-sm font-bold text-amber-300">{formatEnergyUtil(pendingEnergy)}</p>
                  <p className="text-[9px] text-amber-400/70">{sharedCount} convite(s) aguardando</p>
                </div>
              )}
              {unusedEnergy > 0 && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-muted-foreground">🔒 Reservado</p>
                  <p className="text-sm font-bold text-primary">{formatEnergyUtil(unusedEnergy)}</p>
                  <p className="text-[9px] text-muted-foreground">{unusedCount} código(s) disponíveis</p>
                </div>
              )}
              <div className="bg-muted/20 border border-border/40 rounded-lg p-2 text-center">
                <p className="text-[10px] text-muted-foreground">✅ Aceitos</p>
                <p className="text-sm font-bold text-foreground">{formatEnergyUtil(usedCount * costPerInvite)}</p>
                <p className="text-[9px] text-muted-foreground">{usedCount} convite(s) aceito(s)</p>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoadingCodes ? (
            <Skeleton className="h-20 w-full" />
          ) : codes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum código disponível para seu tier
            </p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {codes.map((code) => {
                const isUsed = !!code.usedById;
                const isPending = !isUsed && !!code.sharedAt;
                const isShareOpen = shareTarget?.codeId === code.id;
                return (
                  <div
                    key={code.id}
                    className={cn(
                      "rounded-lg px-3 py-2 border transition-colors",
                      isUsed
                        ? "bg-muted/30 border-border/30 opacity-60"
                        : isPending
                          ? "bg-amber-500/10 border-amber-500/20"
                          : "bg-background/80 border-primary/20 hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 font-mono text-sm font-bold tracking-wider">
                        <span className={isUsed ? "text-muted-foreground line-through" : isPending ? "text-amber-200" : "text-primary"}>
                          {code.code}
                        </span>
                        {isPending && code.sharedToName && (
                          <span className="text-xs font-sans font-normal text-amber-400/80 ml-2">
                            ⏳ para <span className="font-semibold">{code.sharedToName}</span>
                            {costPerInvite > 0 && <span className="ml-1 text-amber-300/70">({formatEnergyUtil(costPerInvite)})</span>}
                          </span>
                        )}
                        {isPending && !code.sharedToName && (
                          <span className="text-xs font-sans font-normal text-amber-400/60 ml-2">
                            ⏳ compartilhado {costPerInvite > 0 && `(${formatEnergyUtil(costPerInvite)})`}
                          </span>
                        )}
                        {!isUsed && !isPending && costPerInvite > 0 && (
                          <span className="text-xs font-sans font-normal text-muted-foreground/60 ml-2">
                            🔒 {formatEnergyUtil(costPerInvite)}
                          </span>
                        )}
                      </div>
                      {isUsed ? (
                        <Badge variant="outline" className="text-xs border-muted text-muted-foreground">
                          ✓ {code.usedByName || 'usado'}
                        </Badge>
                      ) : !isPending ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleStartShare(code.id, code.code, 'code')}
                            title="Copiar código"
                          >
                            {copied === code.code ? (
                              <Check className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleStartShare(code.id, code.code, 'link')}
                            title="Copiar link"
                          >
                            {copied === `link-${code.code}` ? (
                              <Check className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Link className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    {/* Input para nome do convidado */}
                    {isShareOpen && (
                      <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/30">
                        <UserPlus className="w-3.5 h-3.5 text-primary shrink-0" />
                        <Input
                          ref={inviteeInputRef}
                          type="text"
                          placeholder="Nome do convidado..."
                          value={inviteeName}
                          onChange={(e) => setInviteeName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleConfirmShare();
                            if (e.key === 'Escape') handleCancelShare();
                          }}
                          className="h-7 text-xs flex-1"
                        />
                        <Button size="sm" className="h-7 text-xs px-2" onClick={handleConfirmShare}>
                          <Check className="w-3 h-3 mr-1" /> OK
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={handleCancelShare}>
                          ✕
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
            🧬 Cada código DNA é exclusivo do seu perfil. Convidados herdam tier e saldo baseado na hierarquia SKEMA.
          </p>
        </CardContent>
      </Card>

      {/* Descendência Direta — quem o player já convidou */}
      {(() => {
        const myInviteCode = player?.inviteCode;
        const descendants = referralNodes?.filter(n => n.invited_by === myInviteCode) || [];
        if (descendants.length === 0) return null;
        return (
          <Card className="border border-border/60 bg-card/90 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                <TreePine className="h-5 w-5 text-primary" />
                Descendência Direta
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {descendants.length} jogador(es) convidado(s) por você
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {descendants.map(d => (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-background/60 border border-border/40"
                  >
                    <span className="text-xl">{d.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.player_tier || 'Ploft'} · k$ {formatEnergyUtil(d.energy)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {d.total_invited > 0 && `${d.total_invited} convite(s)`}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {d.invite_code}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

    </div>
  );
}
