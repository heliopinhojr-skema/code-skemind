/**
 * GuardianInvitePanel - Permite guardiões gerarem convites para qualquer tier
 * Usa a RPC guardian_generate_invite_code com target_tier
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { buildInviteUrl } from '@/lib/inviteUrl';
import { formatEnergy } from '@/lib/tierEconomy';
import { copyToClipboard } from '@/lib/clipboardFallback';
import { toast } from 'sonner';
import { Plus, Copy, Send, Trash2, Star, Crown, Swords, Rocket, Gamepad2, ExternalLink, Zap } from 'lucide-react';

const TIERS = [
  { value: 'Criador', label: 'Criador', cost: 200_000, icon: <Star className="h-3 w-3" />, color: 'text-amber-400' },
  { value: 'Grão Mestre', label: 'Grão Mestre', cost: 15_000, icon: <Crown className="h-3 w-3" />, color: 'text-purple-400' },
  { value: 'Mestre', label: 'Mestre', cost: 1_300, icon: <Swords className="h-3 w-3" />, color: 'text-blue-400' },
  { value: 'Boom', label: 'Boom', cost: 130, icon: <Rocket className="h-3 w-3" />, color: 'text-green-400' },
  { value: 'Ploft', label: 'Ploft', cost: 10, icon: <Gamepad2 className="h-3 w-3" />, color: 'text-muted-foreground' },
];

interface GuardianInvite {
  id: string;
  code: string;
  target_tier: string | null;
  created_at: string;
  used_by_id: string | null;
  shared_at: string | null;
  shared_to_name: string | null;
  used_by_name?: string;
}

export function GuardianInvitePanel() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>('Grão Mestre');
  const [invites, setInvites] = useState<GuardianInvite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Get current user's profile ID
  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (data) setProfileId(data.id);
    };
    getProfile();
  }, []);

  const fetchInvites = useCallback(async () => {
    if (!profileId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .select(`
          id, code, target_tier, created_at, used_by_id, shared_at, shared_to_name,
          used_by:profiles!invite_codes_used_by_id_fkey(name)
        `)
        .eq('creator_id', profileId)
        .not('target_tier', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvites((data || []).map((r: any) => ({
        ...r,
        used_by_name: r.used_by?.name || undefined,
      })));
    } catch (e: any) {
      console.error('[GUARDIAN_INVITE] Fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [profileId]);

  useEffect(() => { fetchInvites(); }, [fetchInvites]);

  const handleGenerate = async () => {
    if (!profileId || !selectedTier) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.rpc('guardian_generate_invite_code', {
        p_creator_profile_id: profileId,
        p_target_tier: selectedTier,
      });
      if (error) throw error;
      toast.success(`Convite ${selectedTier} gerado: ${data}`);
      await fetchInvites();
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (code: string) => {
    const url = buildInviteUrl(code);
    const ok = await copyToClipboard(url);
    toast.success(ok ? 'Link copiado!' : 'Selecione e copie manualmente');
  };

  const handleWhatsApp = (code: string) => {
    const url = buildInviteUrl(code);
    const text = `🌌 Você foi convidado para o SKEMA Universe!\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleDelete = async (codeId: string) => {
    try {
      const { error } = await supabase.rpc('admin_cancel_invite_code', {
        p_code_id: codeId,
      });
      if (error) throw error;
      toast.success('Convite removido');
      await fetchInvites();
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    }
  };

  const tierCost = TIERS.find(t => t.value === selectedTier)?.cost || 0;
  const unusedInvites = invites.filter(i => !i.used_by_id);
  const usedInvites = invites.filter(i => !!i.used_by_id);

  return (
    <Card className="bg-card/90 backdrop-blur-sm border-border/60">
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Gerar Convite (Qualquer Tier)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generator */}
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 space-y-1.5">
            <label className="text-xs text-muted-foreground">Tier do convidado</label>
            <Select value={selectedTier} onValueChange={setSelectedTier}>
              <SelectTrigger className="bg-background/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIERS.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      <span className={t.color}>{t.icon}</span>
                      {t.label}
                      <span className="text-muted-foreground text-xs">
                        ({formatEnergy(t.cost)})
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-center space-y-1">
            <span className="text-[10px] text-muted-foreground block">Custo ao aceitar</span>
            <Badge variant="outline" className="font-mono text-xs">
              <Zap className="h-3 w-3 mr-1" />
              {formatEnergy(tierCost)}
            </Badge>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !profileId}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-1" />
            {isGenerating ? 'Gerando...' : 'Gerar Convite'}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground">
          O débito de {formatEnergy(tierCost)} ocorre no seu saldo somente quando o convidado aceita.
        </p>

        {/* Active invites */}
        {isLoading ? (
          <div className="space-y-2">
            {[1,2].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <>
            {unusedInvites.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Disponíveis ({unusedInvites.length})
                </h4>
                {unusedInvites.map(inv => {
                  const tier = TIERS.find(t => t.value === inv.target_tier);
                  const url = buildInviteUrl(inv.code);
                  return (
                    <div key={inv.id} className="p-2.5 rounded-lg border border-border/40 bg-card/50 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] ${tier?.color || ''}`}>
                          {tier?.icon} {inv.target_tier}
                        </Badge>
                        <code className="text-xs font-mono text-foreground/80">{inv.code}</code>
                        <div className="ml-auto flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopy(inv.code)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-green-500" onClick={() => handleWhatsApp(inv.code)}>
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive" onClick={() => handleDelete(inv.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {/* Full URL visible */}
                      <Input
                        readOnly
                        value={url}
                        className="text-[9px] font-mono h-7 bg-muted/30 select-all cursor-text"
                        onFocus={(e) => e.target.select()}
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {usedInvites.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Aceitos ({usedInvites.length})
                </h4>
                {usedInvites.map(inv => {
                  const tier = TIERS.find(t => t.value === inv.target_tier);
                  return (
                    <div key={inv.id} className="p-2 rounded-lg border border-border/30 bg-card/30 flex items-center gap-2 opacity-70">
                      <Badge variant="outline" className={`text-[10px] ${tier?.color || ''}`}>
                        {tier?.icon} {inv.target_tier}
                      </Badge>
                      <code className="text-[10px] font-mono">{inv.code}</code>
                      <span className="text-xs text-emerald-400">✅ {inv.used_by_name || 'aceito'}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {invites.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum convite guardian gerado ainda
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
