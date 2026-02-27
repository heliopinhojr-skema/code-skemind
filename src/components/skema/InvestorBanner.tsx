import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import investorImg from '@/assets/skema-negociacoes.jpeg';
import skemaEmojis from '@/assets/skema-emojis.jpeg';

interface InvestorBannerProps {
  playerId: string;
  playerName: string;
  playerStatus?: string;
}

const FAIXAS = [
  { label: '10%', players: 781, valuation: 899712 },
  { label: '20%', players: 1562, valuation: 1799424 },
  { label: '35%', players: 2734, valuation: 3149568 },
  { label: '50%', players: 3905, valuation: 4499760 },
  { label: '75%', players: 5858, valuation: 6748416 },
  { label: '100%', players: 7810, valuation: 8997120 },
];

export function InvestorBanner({ playerId, playerName, playerStatus }: InvestorBannerProps) {
  const [count, setCount] = useState(0);
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [soldBlocks, setSoldBlocks] = useState<{ sold_at: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const [{ count: total }, { data: mine }, { data: blocks }] = await Promise.all([
        supabase.from('investor_interest').select('*', { count: 'exact', head: true }),
        supabase.from('investor_interest').select('id').eq('player_id', playerId).maybeSingle(),
        supabase.from('investment_blocks').select('sold_at, overbook').eq('overbook', false).order('sold_at', { ascending: false }),
      ]);
      setCount(total || 0);
      setRegistered(!!mine);
      setSoldBlocks(blocks || []);
    };
    fetchData();
  }, [playerId]);

  useEffect(() => {
    const channel = supabase
      .channel('investor-interest-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investor_interest' }, () => {
        supabase.from('investor_interest').select('*', { count: 'exact', head: true }).then(({ count: c }) => {
          setCount(c || 0);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const isPenalized = playerStatus === 'penalized';

  const handleToggle = async () => {
    if (isPenalized) {
      toast.error('Acesso negado à Oportunidade Skema');
      return;
    }
    setLoading(true);
    try {
      if (registered) {
        await supabase.from('investor_interest').delete().eq('player_id', playerId);
        setRegistered(false);
        toast.success('Interesse removido');
      } else {
        await supabase.from('investor_interest').insert({ player_id: playerId, player_name: playerName } as any);
        setRegistered(true);
        toast.success('Interesse registrado!');
      }
    } catch {
      toast.error('Erro ao processar');
    }
    setLoading(false);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 cursor-pointer bg-yellow-500/10 border border-yellow-500/30 rounded-full px-3 py-1"
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="w-5 h-5 rounded-full overflow-hidden flex-shrink-0"
          >
            <img src={skemaEmojis} alt="" className="w-full h-full object-cover" />
          </motion.div>
          <span className="text-[10px] font-bold text-yellow-200/80 whitespace-nowrap">
            Conheça oportunidades
          </span>
          <motion.span
            key={count}
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-xs font-black text-yellow-300"
          >
            {count}
          </motion.span>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="bg-transparent border-none shadow-none p-0 max-w-md max-h-[90vh] overflow-y-auto">
        <div className="relative rounded-2xl overflow-hidden border border-yellow-500/40">
          <img src={investorImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/80" />
          <div className="relative z-10 p-5 text-center space-y-3">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xs uppercase tracking-[0.3em] text-yellow-400/60 font-semibold"
            >
              Universo Skema
            </motion.div>
            <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300">
              1️⃣ RODADA — Negociações
            </h2>

            {/* Dados financeiros da 1ª Rodada */}
            <div className="bg-white/5 border border-yellow-500/30 rounded-xl p-3 space-y-2 text-left">
              <div className="text-center">
                <span className="text-xs text-yellow-400/70 uppercase tracking-wider">Valuation atual</span>
                <div className="text-2xl font-black text-yellow-300">R$ 620.000</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-black/30 rounded-lg p-2">
                  <span className="text-[10px] text-white/50">Cota 2,5%</span>
                  <div className="text-sm font-bold text-yellow-300">R$ 15.500</div>
                </div>
                <div className="bg-black/30 rounded-lg p-2">
                  <span className="text-[10px] text-white/50">Parcelamento</span>
                  <div className="text-sm font-bold text-yellow-300">6x R$ 2.583,33</div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-white/50">
                <Calendar className="w-3.5 h-3.5 text-yellow-400/70" />
                <span>Mar · Abr · Mai · Jun · Jul · Ago 2026</span>
              </div>
            </div>

            {/* Premissa */}
            <div className="bg-white/5 border border-yellow-500/20 rounded-xl p-3 space-y-1 text-left text-[11px]">
              <div className="text-xs font-semibold text-yellow-300 mb-1">📊 Premissa Financeira</div>
              <div className="flex justify-between text-white/60">
                <span>Receita/player/mês</span>
                <span className="text-white/80 font-medium">R$ 24</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Receita anual/player</span>
                <span className="text-white/80 font-medium">R$ 288</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Múltiplo (4x)</span>
                <span className="text-white/80 font-medium">R$ 1.152/player</span>
              </div>
            </div>

            {/* Meta 600 players */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-3 text-[11px] text-left">
              <div className="text-xs font-semibold text-emerald-300 mb-1">🎯 Meta 600 Players</div>
              <div className="flex justify-between text-white/60">
                <span>Valuation projetado</span>
                <span className="text-emerald-300 font-medium">R$ 691.200</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>2,5% valeria</span>
                <span className="text-emerald-300 font-medium">R$ 17.280</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Retorno sobre investimento</span>
                <span className="text-emerald-300 font-bold">+11,5%</span>
              </div>
            </div>

            {/* Botão Conhecer o Skema */}
            <Button
              variant="outline"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10 text-xs"
              size="sm"
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              {showDetails ? 'Ocultar faixas de ativação' : 'Conhecer o Skema — Faixas de Ativação'}
            </Button>

            {/* Faixas de ativação expandíveis */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white/5 border border-yellow-500/20 rounded-xl p-3 space-y-1 text-[10px]">
                    <div className="text-xs font-semibold text-yellow-300 mb-2">📈 Faixas de Ativação (cap. 7.810)</div>
                    {FAIXAS.map(f => (
                      <div key={f.label} className="flex items-center justify-between text-white/60 py-0.5 border-b border-white/5 last:border-0">
                        <span className="font-medium text-white/80">{f.label} ({f.players.toLocaleString('pt-BR')} players)</span>
                        <span>Val. R$ {f.valuation.toLocaleString('pt-BR')}</span>
                        <span className="text-yellow-300 font-medium">2,5% = R$ {Math.round(f.valuation * 0.025).toLocaleString('pt-BR')}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Blocos já negociados */}
            {soldBlocks.length > 0 && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3">
                <div className="text-[10px] uppercase tracking-wider text-yellow-400/60 mb-2 font-semibold">
                  Blocos negociados ({soldBlocks.length})
                </div>
                <div className="space-y-1">
                  {soldBlocks.map((b, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-yellow-300 font-medium">🔒 Bloco {i + 1} — 2,5%</span>
                      <span className="text-white/40 text-[10px]">{new Date(b.sold_at + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-[10px] text-yellow-400/50 text-center">
                  {soldBlocks.length * 2.5}% já captado de 25% disponíveis
                </div>
              </div>
            )}

            {/* Contador em tempo real */}
            <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-3">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Users className="w-4 h-4 text-yellow-400" />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={count}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 10, opacity: 0 }}
                    className="text-2xl font-black text-yellow-300"
                  >
                    {count}
                  </motion.span>
                </AnimatePresence>
                <span className="text-sm text-yellow-200/70">participantes interessados</span>
              </div>
            </div>

            {/* Botão de registro de interesse */}
            <Button
              onClick={handleToggle}
              disabled={loading || isPenalized}
              className={isPenalized
                ? "w-full bg-red-900/30 border border-red-500/30 text-red-400/60 cursor-not-allowed"
                : registered 
                  ? "w-full bg-green-600/30 border border-green-500/50 text-green-300 hover:bg-red-600/30 hover:border-red-500/50 hover:text-red-300"
                  : "w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold"
              }
              size="lg"
            >
              {isPenalized ? '🚫 Acesso negado' : loading ? 'Processando...' : registered ? (
                <span>✓ Interesse registrado — clique para cancelar</span>
              ) : (
                <span>Tenho interesse em investir</span>
              )}
            </Button>

            <p className="text-[11px] text-white/40 leading-relaxed">
              Mais detalhes serão divulgados em breve.<br/>Fique atento ao universo.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
