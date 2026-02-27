import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Users, TrendingUp, ShoppingCart, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import investorImg from '@/assets/skema-negociacoes.jpeg';
import skemaEmojis from '@/assets/skema-emojis.jpeg';

interface InvestorBannerProps {
  playerId: string;
  playerName: string;
  playerStatus?: string;
}

const TOTAL_BLOCKS = 10;
const BLOCK_PCT = 2.5;

const FAIXAS = [
  { label: '10%', players: 781, valuation: 899712 },
  { label: '20%', players: 1562, valuation: 1799424 },
  { label: '35%', players: 2734, valuation: 3149568 },
  { label: '50%', players: 3905, valuation: 4499760 },
  { label: '75%', players: 5858, valuation: 6748416 },
  { label: '100%', players: 7810, valuation: 8997120 },
];

export function InvestorBanner({ playerId, playerName, playerStatus }: InvestorBannerProps) {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [soldBlocks, setSoldBlocks] = useState<{ sold_at: string }[]>([]);
  const [myReservation, setMyReservation] = useState<{ id: string; blocks_wanted: number; status: string } | null>(null);
  const [reserving, setReserving] = useState(false);
  const [blocksWanted, setBlocksWanted] = useState(1);

  const fetchData = async () => {
    const [{ count: total }, { data: mine }, { data: blocks }, { data: reservation }] = await Promise.all([
      supabase.from('investor_interest').select('*', { count: 'exact', head: true }),
      supabase.from('investor_interest').select('id').eq('player_id', playerId).maybeSingle(),
      supabase.from('investment_blocks').select('sold_at, overbook').eq('overbook', false).order('sold_at', { ascending: false }),
      supabase.from('block_reservations').select('id, blocks_wanted, status').eq('player_id', playerId).eq('status', 'pending').maybeSingle(),
    ]);
    setCount(total || 0);
    setRegistered(!!mine);
    setSoldBlocks(blocks || []);
    setMyReservation(reservation || null);
  };

  useEffect(() => { fetchData(); }, [playerId]);

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
  const availableBlocks = TOTAL_BLOCKS - soldBlocks.length;

  const handleToggle = async () => {
    if (isPenalized) { toast.error('Acesso negado à Oportunidade Skema'); return; }
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
    } catch { toast.error('Erro ao processar'); }
    setLoading(false);
  };

  const handleReserve = async () => {
    if (isPenalized) { toast.error('Acesso negado'); return; }
    setReserving(true);
    try {
      const { error } = await supabase.from('block_reservations').insert({
        player_id: playerId,
        player_name: playerName,
        blocks_wanted: blocksWanted,
      } as any);
      if (error) throw error;
      toast.success(`Reserva de ${blocksWanted} bloco(s) enviada! Aguarde aprovação.`);
      await fetchData();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao reservar');
    }
    setReserving(false);
  };

  const handleCancelReservation = async () => {
    if (!myReservation) return;
    setReserving(true);
    try {
      await supabase.from('block_reservations').update({ status: 'cancelled' } as any).eq('id', myReservation.id);
      toast.success('Reserva cancelada');
      setMyReservation(null);
      await fetchData();
    } catch { toast.error('Erro ao cancelar'); }
    setReserving(false);
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
      <DialogContent className="bg-transparent border-none shadow-none p-0 max-w-md max-h-[90vh] overflow-y-auto [&>button]:text-white [&>button]:bg-black/60 [&>button]:rounded-full [&>button]:p-1 [&>button]:hover:bg-black/80 [&>button]:z-20">
        <DialogTitle className="sr-only">Oportunidade Skema</DialogTitle>
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
              Oportunidade Skema — SCP
            </h2>

            {/* Blocos disponíveis visual */}
            <div className="bg-white/5 border border-yellow-500/30 rounded-xl p-3 space-y-2">
              <div className="text-xs text-yellow-400/70 uppercase tracking-wider font-semibold">
                Blocos de 2,5% — {availableBlocks} de {TOTAL_BLOCKS} disponíveis
              </div>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: TOTAL_BLOCKS }).map((_, i) => {
                  const isSold = i < soldBlocks.length;
                  return (
                    <div
                      key={i}
                      className={`h-6 rounded ${isSold ? 'bg-yellow-500/60 border border-yellow-400/40' : 'bg-white/10 border border-white/20'}`}
                      title={isSold ? `Bloco ${i + 1} — vendido` : `Bloco ${i + 1} — disponível`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-white/40">
                <span>🔒 {soldBlocks.length} vendido(s)</span>
                <span>🟢 {availableBlocks} disponível(eis)</span>
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
                <span className="text-emerald-300 font-medium">R$ {Math.round(691200 * 0.025).toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Retorno sobre investimento</span>
                <span className="text-emerald-300 font-bold">+11,5%</span>
              </div>
            </div>

            {/* Botão Faixas */}
            <Button
              variant="outline"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10 text-xs"
              size="sm"
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              {showDetails ? 'Ocultar faixas de ativação' : 'Conhecer o Skema — Faixas de Ativação'}
            </Button>

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
                <span className="text-sm text-yellow-200/70">interessados</span>
              </div>
            </div>

            {/* Registro de interesse */}
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

            {/* Reservar bloco — só aparece para quem já registrou interesse */}
            {registered && availableBlocks > 0 && (
              <div className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/30 rounded-xl p-3 space-y-2">
                {myReservation ? (
                  <div className="space-y-2">
                    <div className="text-xs text-orange-300 font-semibold">
                      📋 Reserva pendente: {myReservation.blocks_wanted} bloco(s) de 2,5%
                    </div>
                    <Button
                      onClick={handleCancelReservation}
                      disabled={reserving}
                      variant="outline"
                      size="sm"
                      className="w-full border-red-500/30 text-red-300 hover:bg-red-500/10 text-xs"
                    >
                      Cancelar reserva
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="text-xs font-semibold text-orange-300">
                      🛒 Reservar Blocos — R$ 15.500 por bloco (6× de R$ 2.583,33)
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 border-white/20 text-white/60"
                        onClick={() => setBlocksWanted(Math.max(1, blocksWanted - 1))}
                      >−</Button>
                      <span className="text-lg font-black text-orange-300 min-w-[2ch] text-center">{blocksWanted}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 border-white/20 text-white/60"
                        onClick={() => setBlocksWanted(Math.min(availableBlocks, blocksWanted + 1))}
                      >+</Button>
                    </div>
                    <div className="text-[10px] text-white/50">
                      {blocksWanted} × 2,5% = {(blocksWanted * BLOCK_PCT).toFixed(1)}% · Total: R$ {(blocksWanted * 15500).toLocaleString('pt-BR')}
                    </div>
                    <Button
                      onClick={handleReserve}
                      disabled={reserving || isPenalized}
                      className="w-full bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-500 hover:to-yellow-500 text-white font-bold"
                      size="sm"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                      {reserving ? 'Enviando...' : `Reservar ${blocksWanted} bloco(s)`}
                    </Button>
                    <p className="text-[10px] text-white/30">
                      Sua reserva será analisada pelo Guardião. Sem compromisso até aprovação.
                    </p>
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => navigate('/contrato-scp')}
              className="flex items-center justify-center gap-1.5 text-[11px] text-yellow-400/70 hover:text-yellow-300 underline underline-offset-2 transition-colors mx-auto"
            >
              <FileText className="w-3.5 h-3.5" />
              Termos e Contrato SCP
            </button>
            <p className="text-[10px] text-white/30 leading-relaxed">
              Sociedade em Conta de Participação (SCP) — DASET.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
