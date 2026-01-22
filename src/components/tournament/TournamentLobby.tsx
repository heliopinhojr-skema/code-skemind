/**
 * TournamentLobby - Lobby estilo corrida espacial
 * 
 * Visual:
 * - Fundo de universo em expansão
 * - Participantes em grid estilo corrida
 * - Estatísticas de eliminados e pontuação
 * - Countdown dramático
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trophy, Coins, Play, Zap, Skull, Star, Rocket, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TournamentPlayer } from '@/hooks/useTournament';
import universeBg from '@/assets/universe-bg.jpg';

interface TournamentLobbyProps {
  players: TournamentPlayer[];
  credits: number;
  entryFee: number;
  prizePool: number;
  onStart: () => { success: boolean; error?: string; humanSecretCode?: string[] };
}

const COUNTDOWN_SECONDS = 10;

// Estatísticas simuladas da última rodada
const LAST_ROUND_STATS = {
  totalPlayers: 10,
  eliminated: 6,
  eliminationReasons: [
    { reason: 'Tempo esgotado', count: 3, icon: Timer },
    { reason: 'Tentativas máximas', count: 2, icon: Skull },
    { reason: 'Desistência', count: 1, icon: Zap },
  ],
  avgScore: 1850,
  topScore: 3200,
};

export function TournamentLobby({
  players,
  credits,
  entryFee,
  prizePool,
  onStart,
}: TournamentLobbyProps) {
  const canAfford = credits >= entryFee;
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  
  // Efeito de estrelas animadas
  const stars = useMemo(() => 
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 3,
    })), []
  );
  
  const handleStartCountdown = useCallback(() => {
    if (!canAfford || isStarting) return;
    setIsStarting(true);
    setCountdown(COUNTDOWN_SECONDS);
  }, [canAfford, isStarting]);
  
  const handleCancelCountdown = useCallback(() => {
    setIsStarting(false);
    setCountdown(null);
  }, []);
  
  useEffect(() => {
    if (countdown === null || countdown < 0) return;
    
    if (countdown === 0) {
      const result = onStart();
      if (!result.success && result.error) {
        console.error(result.error);
        setIsStarting(false);
        setCountdown(null);
      }
      return;
    }
    
    const timer = setTimeout(() => {
      setCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown, onStart]);
  
  const survivors = LAST_ROUND_STATS.totalPlayers - LAST_ROUND_STATS.eliminated;
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background do universo */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${universeBg})` }}
      />
      
      {/* Overlay escuro */}
      <div className="absolute inset-0 bg-black/60" />
      
      {/* Estrelas animadas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {stars.map(star => (
          <motion.div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: star.size,
              height: star.size,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: star.delay,
            }}
          />
        ))}
      </div>
      
      {/* Countdown overlay */}
      <AnimatePresence>
        {isStarting && countdown !== null && countdown > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <Rocket className="w-16 h-16 text-primary mx-auto mb-4 animate-bounce" />
              <div className="text-2xl text-muted-foreground mb-4">LANÇAMENTO EM</div>
            </motion.div>
            
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="relative"
            >
              <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-primary to-purple-500 tabular-nums">
                {countdown}
              </div>
              <motion.div
                className="absolute inset-0 text-9xl font-black text-primary/20 blur-xl"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                {countdown}
              </motion.div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-8"
            >
              <Button
                variant="ghost"
                onClick={handleCancelCountdown}
                className="text-muted-foreground hover:text-white"
              >
                Cancelar
              </Button>
            </motion.div>
            
            {/* Barra de progresso circular */}
            <svg className="absolute bottom-20 w-24 h-24">
              <circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="4"
              />
              <motion.circle
                cx="48"
                cy="48"
                r="40"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={251.2}
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: 251.2 }}
                transition={{ duration: COUNTDOWN_SECONDS, ease: 'linear' }}
                style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Conteúdo principal */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 flex items-center justify-between border-b border-white/10 backdrop-blur-sm bg-black/20"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">CORRIDA CÓSMICA</h1>
              <p className="text-xs text-white/60">Rodada #42</p>
            </div>
          </div>
          
          <motion.div 
            className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 px-4 py-2 rounded-full border border-yellow-500/50"
            whileHover={{ scale: 1.05 }}
          >
            <Coins className="w-5 h-5 text-yellow-400" />
            <span className="font-bold text-yellow-400">{credits.toLocaleString()} K$</span>
          </motion.div>
        </motion.header>
        
        {/* Stats da última rodada */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="mx-4 mt-4 p-4 rounded-2xl bg-gradient-to-br from-red-500/20 to-purple-500/20 border border-white/10 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2 mb-3">
            <Skull className="w-5 h-5 text-red-400" />
            <span className="font-semibold text-white">Última Rodada</span>
          </div>
          
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center p-2 rounded-xl bg-black/30">
              <div className="text-2xl font-bold text-green-400">{survivors}</div>
              <div className="text-xs text-white/60">Sobreviventes</div>
            </div>
            <div className="text-center p-2 rounded-xl bg-black/30">
              <div className="text-2xl font-bold text-red-400">{LAST_ROUND_STATS.eliminated}</div>
              <div className="text-xs text-white/60">Eliminados</div>
            </div>
            <div className="text-center p-2 rounded-xl bg-black/30">
              <div className="text-2xl font-bold text-yellow-400">{LAST_ROUND_STATS.topScore}</div>
              <div className="text-xs text-white/60">Top Score</div>
            </div>
          </div>
          
          {/* Motivos de eliminação */}
          <div className="space-y-2">
            <div className="text-xs text-white/60 mb-1">Por que caíram:</div>
            {LAST_ROUND_STATS.eliminationReasons.map((reason, i) => (
              <motion.div
                key={reason.reason}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-center justify-between bg-black/20 rounded-lg px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <reason.icon className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-white/80">{reason.reason}</span>
                </div>
                <span className="text-sm font-bold text-red-400">{reason.count}x</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        {/* Prêmios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-4 mt-4 p-4 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/80">Taxa de entrada</span>
            <span className="font-bold text-red-400">-{entryFee} K$</span>
          </div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/80">Premiação total</span>
            <span className="font-bold text-green-400">{prizePool.toLocaleString()} K$</span>
          </div>
          
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
            {[
              { pos: '🥇', pct: 0.5, color: 'from-yellow-400 to-yellow-600' },
              { pos: '🥈', pct: 0.25, color: 'from-gray-300 to-gray-500' },
              { pos: '🥉', pct: 0.15, color: 'from-orange-400 to-orange-600' },
              { pos: '4º', pct: 0.1, color: 'from-slate-400 to-slate-600' },
            ].map((prize, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.05 }}
                className={`bg-gradient-to-b ${prize.color} rounded-xl py-2 px-1`}
              >
                <div className="text-lg">{prize.pos}</div>
                <div className="font-bold text-white text-xs">{Math.floor(prizePool * prize.pct)}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        {/* Grid de participantes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex-1 mx-4 mt-4 mb-24 overflow-y-auto"
        >
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-semibold text-white">Pilotos ({players.length}/10)</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {players.map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className={`
                  relative overflow-hidden rounded-xl border backdrop-blur-sm
                  ${player.isBot 
                    ? 'bg-white/5 border-white/10' 
                    : 'bg-gradient-to-br from-primary/30 to-purple-500/30 border-primary/50'
                  }
                `}
              >
                {/* Número da posição de largada */}
                <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
                  <span className="text-xs font-bold text-white/80">{index + 1}</span>
                </div>
                
                <div className="p-3 flex items-center gap-3">
                  <div className="text-3xl">{player.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${player.isBot ? 'text-white/90' : 'text-primary'}`}>
                      {player.name}
                    </div>
                    {player.isBot ? (
                      <div className="flex items-center gap-1 text-xs text-white/50">
                        <Zap className="w-3 h-3" />
                        IQ {player.iq}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-primary/80">
                        <Star className="w-3 h-3" />
                        Você
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
        
        {/* Botão fixo */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={handleStartCountdown}
              disabled={!canAfford || isStarting}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 hover:from-purple-700 hover:via-pink-600 hover:to-orange-600 border-0 shadow-lg shadow-purple-500/30"
            >
              <Rocket className="w-6 h-6 mr-2" />
              {canAfford 
                ? `INICIAR CORRIDA (-${entryFee} K$)` 
                : 'Créditos insuficientes'
              }
            </Button>
            
            {!canAfford && (
              <p className="text-center text-sm text-red-400 mt-2">
                Você precisa de {entryFee} K$ para participar
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}