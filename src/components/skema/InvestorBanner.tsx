import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Calendar, Clock, Users, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import investorImg from '@/assets/skema-investor.jpeg';
import skemaEmojis from '@/assets/skema-emojis.jpeg';

interface InvestorBannerProps {
  playerId: string;
  playerName: string;
}

export function InvestorBanner({ playerId, playerName }: InvestorBannerProps) {
  const [count, setCount] = useState(0);
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      const [{ count: total }, { data: mine }] = await Promise.all([
        supabase.from('investor_interest').select('*', { count: 'exact', head: true }),
        supabase.from('investor_interest').select('id').eq('player_id', playerId).maybeSingle(),
      ]);
      setCount(total || 0);
      setRegistered(!!mine);
    };
    fetchData();
  }, [playerId]);

  // Realtime subscription
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

  const handleToggle = async () => {
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
            Oportunidades s<span className="text-orange-400">k</span>ema
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
      <DialogContent className="bg-transparent border-none shadow-none p-0 max-w-md">
        <div className="relative rounded-2xl overflow-hidden border border-yellow-500/40">
          <img src={investorImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/75" />
          <div className="relative z-10 p-6 text-center space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className="text-5xl"
            >
              🚀
            </motion.div>
            <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300">
              1ª Rodada de Negociações
            </h2>
            <p className="text-xs text-white/60">Universo s<span className="text-orange-400 font-bold">k</span>ema — Oportunidades para investidores</p>
            
            <div className="bg-white/5 border border-yellow-500/30 rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4 text-yellow-400" />
                <span className="text-xl font-black text-yellow-300">03 / 03 / 2026</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <span className="text-lg font-bold text-yellow-300">13:00h</span>
              </div>
            </div>

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
              disabled={loading}
              className={registered 
                ? "w-full bg-green-600/30 border border-green-500/50 text-green-300 hover:bg-red-600/30 hover:border-red-500/50 hover:text-red-300"
                : "w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 text-white font-bold"
              }
              size="lg"
            >
              {loading ? 'Processando...' : registered ? (
                <span className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Interesse registrado — clique para cancelar</span>
              ) : (
                <span className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> Tenho interesse em investir!</span>
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