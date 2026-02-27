import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users, TrendingUp, ShoppingCart, FileText, CheckCircle2 } from 'lucide-react';
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

const CENARIOS = [
  { label: '600', players: 600, pct: '7,9%', valuation: 691200, color: 'text-yellow-300' },
  { label: '781', players: 781, pct: '10,3%', valuation: 899712, color: 'text-yellow-200' },
  { label: '1.562', players: 1562, pct: '20,6%', valuation: 1799424, color: 'text-emerald-300' },
  { label: '2.734', players: 2734, pct: '36%', valuation: 3149568, color: 'text-emerald-400' },
  { label: '3.905', players: 3905, pct: '51,4%', valuation: 4499760, color: 'text-cyan-300' },
  { label: '5.858', players: 5858, pct: '77,1%', valuation: 6748416, color: 'text-cyan-400' },
  { label: '7.600', players: 7600, pct: '100%', valuation: 8755200, color: 'text-green-400' },
];

const SCP_CLAUSES = [
  { title: 'CLÁUSULA 1 — OBJETO', content: 'O presente contrato tem por objeto a constituição de Sociedade em Conta de Participação (SCP), nos termos dos artigos 991 a 996 do Código Civil Brasileiro, destinada ao financiamento, expansão e desenvolvimento da plataforma Skemania — Projeto Planeta Skema 1, com meta operacional de até 70.000 (setenta mil) jogadores ativos.' },
  { title: 'CLÁUSULA 2 — NATUREZA DA SCP', items: ['2.1 A SCP não possui personalidade jurídica.', '2.2 A DASET atua como sócia ostensiva, respondendo integralmente perante terceiros.', '2.3 O INVESTIDOR atua como sócio participante oculto, sem representação externa.'] },
  { title: 'CLÁUSULA 3 — APORTE DE CAPITAL', items: ['3.1 O INVESTIDOR realizará aporte no valor de: R$ 15.500 em 6 parcelas.', '3.2 Cada bloco de investimento corresponde a: R$ 15.500 = 2,5% de participação econômica.', '3.3 O aporte não possui natureza de empréstimo.'] },
  { title: 'CLÁUSULA 4 — PARTICIPAÇÃO NOS RESULTADOS', items: ['4.1 O INVESTIDOR fará jus a 2,5% dos resultados líquidos da SCP para cada bloco integral de R$ 15.500 investido.', '4.2 A participação será proporcional ao número de blocos adquiridos.', '4.3 A apuração ocorrerá conforme cronograma interno.', '4.4 Não há garantia mínima de retorno.'] },
  { title: 'CLÁUSULA 5 — RATEIO MENSAL POR BLOCO', items: ['5.1 Cada quota ("Bloco"), correspondente a 2,5% da participação econômica, participará proporcionalmente do custeio operacional do Mês 0 ao Mês 6.', '5.2 Valor por parcela: R$ 2.600/mês. Total por Bloco: R$ 15.500,00.', '5.3 Orçamento global do ciclo inicial: R$ 155.000, distribuído entre 10 Blocos.', '5.5 Recursos destinados exclusivamente a despesas Operacionais, Técnicas, Tecnológicas, Estruturais, Administrativas e Estratégicas.', '5.6 Os valores possuem natureza de investimento operacional estruturado, não configurando mútuo, empréstimo ou obrigação de restituição automática.'] },
  { title: 'CLÁUSULA 6 — RISCO DO INVESTIMENTO', items: ['6.1 O investimento envolve risco; pode haver perda parcial ou total; não há promessa de rentabilidade.', '6.2 A DASET não garante resultados.'] },
  { title: 'CLÁUSULA 7 — GESTÃO', items: ['7.1 A administração é exclusiva da DASET.', '7.2 O INVESTIDOR não possui poderes decisórios.'] },
  { title: 'CLÁUSULA 8 — PRESTAÇÃO DE CONTAS', items: ['8.1 A DASET fornecerá relatórios consolidados.', '8.2 Informações estratégicas são confidenciais.'] },
  { title: 'CLÁUSULA 9 — CONFIDENCIALIDADE', items: ['9.1 O INVESTIDOR manterá sigilo absoluto.', '9.2 É vedada divulgação de dados internos.'] },
  { title: 'CLÁUSULA 10 — PRAZO', items: ['10.1 Prazo inicial: 180 dias.', '10.2 Renovável mediante aditivo.'] },
  { title: 'CLÁUSULA 11 — SAÍDA E RESGATE', items: ['11.1 O INVESTIDOR poderá solicitar saída mediante aviso prévio mínimo de 45 dias.', '11.2 O resgate observará: Política de Liquidez, Fila interna, Disponibilidade financeira.', '11.3 Não há resgate imediato garantido.'] },
  { title: 'CLÁUSULA 12 — RESPONSABILIDADE', items: ['12.1 A responsabilidade externa é exclusiva da DASET.', '12.2 O INVESTIDOR não responde perante terceiros.'] },
  { title: 'CLÁUSULA 13 — NATUREZA PRIVADA', items: ['13.1 Este contrato é privado.', '13.2 Não constitui oferta pública de valores mobiliários.'] },
  { title: 'CLÁUSULA 14 — TRIBUTAÇÃO', items: ['14.1 Cada parte é responsável por seus tributos.', '14.2 Retenções serão feitas quando exigidas por lei.'] },
  { title: 'CLÁUSULA 15 — RESCISÃO', items: ['15.1 Poderá ocorrer por: Descumprimento, Fraude, Violação contratual, Força maior, Determinação legal.', '15.2 Haverá apuração de haveres.'] },
  { title: 'CLÁUSULA 16 — FORÇA MAIOR', content: 'Eventos fora de controle afastam responsabilidade.' },
  { title: 'CLÁUSULA 17 — ALTERAÇÕES', content: 'Somente por escrito e assinadas.' },
  { title: 'CLÁUSULA 18 — COMUNICAÇÕES', content: 'Preferencialmente por meio eletrônico.' },
  { title: 'CLÁUSULA 19 — INDEPENDÊNCIA DAS PARTES', content: 'Não gera vínculo trabalhista, previdenciário, societário formal ou representativo.' },
  { title: 'CLÁUSULA 20 — INTEGRALIDADE', content: 'Este documento constitui o acordo completo entre as partes.' },
  { title: 'CLÁUSULA 21 — LEI E FORO', content: 'Aplica-se a legislação brasileira. Fica eleito o foro da sede da DASET.' },
];

export function InvestorBanner({ playerId, playerName, playerStatus }: InvestorBannerProps) {
  const [count, setCount] = useState(0);
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showContract, setShowContract] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
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
  const negotiatedCount = soldBlocks.length;

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

  const handleAcceptTerms = () => {
    setTermsAccepted(true);
    setShowContract(false);
    toast.success('Termos aceitos! Agora você pode reservar seu bloco.');
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
            {negotiatedCount > 0 ? `${negotiatedCount} cota${negotiatedCount > 1 ? 's' : ''} negociada${negotiatedCount > 1 ? 's' : ''}` : 'Conheça oportunidades'}
          </span>
          {negotiatedCount > 0 && (
            <span className="text-[9px] text-emerald-400 font-semibold">✅</span>
          )}
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
      <DialogContent className="bg-transparent border-none shadow-none p-0 max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto [&>button]:text-white [&>button]:bg-black/60 [&>button]:rounded-full [&>button]:p-1 [&>button]:hover:bg-black/80 [&>button]:z-20">
        <DialogTitle className="sr-only">Oportunidade Skema</DialogTitle>
        <div className="relative rounded-2xl overflow-hidden border border-yellow-500/40">
          <img src={investorImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/80" />
          <div className="relative z-10 p-3 sm:p-5 text-center space-y-2.5 sm:space-y-3">
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
                      className={`h-6 rounded ${isSold ? 'bg-emerald-500/70 border border-emerald-400/50' : 'bg-white/10 border border-white/20'}`}
                      title={isSold ? `Bloco ${i + 1} — negociado` : `Bloco ${i + 1} — disponível`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between text-[10px] text-white/40">
                <span className="text-emerald-400/80">✅ {soldBlocks.length} negociado(s)</span>
                <span>🟡 {availableBlocks} disponível(eis)</span>
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

            {/* Cenários de Crescimento */}
            <Button
              variant="outline"
              onClick={() => setShowDetails(!showDetails)}
              className="w-full border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10 text-xs"
              size="sm"
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
              {showDetails ? 'Ocultar projeções' : 'Projeções de Crescimento'}
            </Button>

            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-white/5 border border-yellow-500/20 rounded-xl p-3 space-y-1.5 text-[10px]">
                    <div className="text-xs font-semibold text-yellow-300 mb-2">📊 Se chegarmos a X players em 6 meses (cap. 7.600)</div>
                    <div className="grid grid-cols-4 gap-0 text-[9px] text-white/40 font-semibold border-b border-white/10 pb-1 mb-1">
                      <span>Players</span>
                      <span className="text-center">% do cap</span>
                      <span className="text-center">Valuation</span>
                      <span className="text-right">2,5% vale</span>
                    </div>
                    {CENARIOS.map(c => (
                      <div key={c.label} className="grid grid-cols-4 gap-0 text-white/60 py-0.5 border-b border-white/5 last:border-0 items-center">
                        <span className={`font-medium ${c.color} text-[10px]`}>{c.label}</span>
                        <span className="text-center">{c.pct}</span>
                        <span className="text-center">R$ {(c.valuation / 1000).toFixed(0)}k</span>
                        <span className={`text-right font-bold ${c.color}`}>R$ {Math.round(c.valuation * 0.025).toLocaleString('pt-BR')}</span>
                      </div>
                    ))}
                    <div className="text-[9px] text-white/30 mt-1 pt-1 border-t border-white/5">
                      * Valuation = players × R$ 1.152 (4× receita anual de R$ 288/player). Investimento por bloco: R$ 15.500.
                    </div>
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
            {!registered ? (
              <Button
                onClick={handleToggle}
                disabled={loading || isPenalized}
                className={isPenalized
                  ? "w-full bg-red-900/30 border border-red-500/30 text-red-400/60 cursor-not-allowed"
                  : "w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold"
                }
                size="lg"
              >
                {isPenalized ? '🚫 Acesso negado' : loading ? 'Processando...' : 'Tenho interesse em investir'}
              </Button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold py-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Interesse registrado
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleToggle}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-red-500/30 text-red-300 hover:bg-red-500/10 text-xs"
                  >
                    {loading ? '...' : 'Cancelar interesse'}
                  </Button>
                  <Button
                    onClick={() => { setShowContract(true); }}
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-orange-600 to-yellow-600 hover:from-orange-500 hover:to-yellow-500 text-white font-bold text-xs"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                    Reservar bloco
                  </Button>
                </div>
              </div>
            )}

            {/* Termos e Contrato SCP — toggle inline */}
            <Button
              variant="outline"
              onClick={() => setShowContract(!showContract)}
              className="w-full border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10 text-xs"
              size="sm"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5" />
              {showContract ? 'Ocultar contrato SCP' : 'Termos e Contrato SCP'}
              {termsAccepted && <CheckCircle2 className="w-3.5 h-3.5 ml-1.5 text-emerald-400" />}
            </Button>

            <AnimatePresence>
              {showContract && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-black/60 border border-yellow-500/20 rounded-xl p-4 space-y-3 text-left">
                    {/* Header */}
                    <div className="text-center space-y-1">
                      <div className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300">
                        CONTRATO DE SOCIEDADE EM CONTA DE PARTICIPAÇÃO (SCP)
                      </div>
                      <div className="text-[10px] text-yellow-400/60 uppercase tracking-widest">
                        SKEMANIA — PLANETA SKEMA 1 · DASET — SÓCIA OSTENSIVA
                      </div>
                      <div className="text-[9px] text-white/30">Versão Final Oficial · Última Atualização: 26/02/2026</div>
                    </div>

                    <hr className="border-yellow-500/20" />

                    {/* PARTES */}
                    <div className="text-[10px] space-y-1">
                      <div className="text-[11px] font-bold text-yellow-300">PARTES</div>
                      <p className="text-white/60"><span className="font-semibold text-white/80">SÓCIA OSTENSIVA:</span> DaSet, pessoa jurídica responsável pela operação da plataforma Skemania.</p>
                      <p className="text-white/60"><span className="font-semibold text-white/80">SÓCIO PARTICIPANTE (INVESTIDOR):</span> Dados a serem preenchidos na formalização.</p>
                    </div>

                    <hr className="border-white/5" />

                    {/* Cláusulas */}
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                      {SCP_CLAUSES.map((c, i) => (
                        <div key={i} className="text-[10px] space-y-0.5">
                          <div className="text-[10px] font-bold text-yellow-300/80">{c.title}</div>
                          {c.content && <p className="text-white/50">{c.content}</p>}
                          {c.items && c.items.map((item, j) => (
                            <p key={j} className="text-white/50 pl-2">{item}</p>
                          ))}
                        </div>
                      ))}
                    </div>

                    <hr className="border-yellow-500/20" />

                    {/* Aceite */}
                    {!termsAccepted ? (
                      <Button
                        onClick={handleAcceptTerms}
                        className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold text-xs"
                        size="sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Li e aceito os Termos e Condições SCP
                      </Button>
                    ) : (
                      <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        Termos aceitos
                      </div>
                    )}
                    <p className="text-[9px] text-white/25 text-center">
                      Ao aceitar, você confirma a leitura integral do contrato SCP e poderá reservar blocos.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reservar bloco — só aparece após aceite dos termos + interesse registrado */}
            {registered && termsAccepted && availableBlocks > 0 && (
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

            {/* Mensagem se ainda não aceitou termos mas já tem interesse */}
            {registered && !termsAccepted && availableBlocks > 0 && (
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-2 text-[10px] text-yellow-300/70 text-center">
                📄 Para reservar blocos, leia e aceite o <button onClick={() => setShowContract(true)} className="underline font-semibold hover:text-yellow-200">Contrato SCP</button> acima.
              </div>
            )}

            <p className="text-[10px] text-white/30 leading-relaxed">
              Sociedade em Conta de Participação (SCP) — DASET.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
