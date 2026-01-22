/**
 * TournamentLobby - Hub central do jogador
 * 
 * Mostra:
 * - Status e saldo do jogador (K$ 1000 inicial)
 * - Corridas em andamento
 * - Modos de jogo disponíveis
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Trophy, Coins, Play, Zap, Target, 
  Rocket, Timer, Swords, Brain, Sparkles,
  TrendingUp, Medal, Clock
} from 'lucide-react';
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

type GameMode = 'training' | 'solo' | 'arena';

interface GameModeConfig {
  id: GameMode;
  name: string;
  description: string;
  icon: typeof Brain;
  entryFee: number;
  prizeMultiplier: number;
  players: string;
  color: string;
  gradient: string;
  disabled?: boolean;
}

const GAME_MODES: GameModeConfig[] = [
  {
    id: 'training',
    name: 'Treinamento',
    description: 'Pratique sem custo',
    icon: Brain,
    entryFee: 0,
    prizeMultiplier: 0,
    players: 'Solo',
    color: 'text-blue-400',
    gradient: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    id: 'solo',
    name: 'Contra Si',
    description: 'Desafie seu melhor tempo',
    icon: Target,
    entryFee: 50,
    prizeMultiplier: 2,
    players: 'Solo',
    color: 'text-purple-400',
    gradient: 'from-purple-500/20 to-pink-500/20',
  },
  {
    id: 'arena',
    name: 'Arena',
    description: 'Compita contra 9 bots',
    icon: Swords,
    entryFee: 100,
    prizeMultiplier: 10,
    players: '10 jogadores',
    color: 'text-orange-400',
    gradient: 'from-orange-500/20 to-red-500/20',
  },
];

// Corridas simuladas em andamento
const ONGOING_RACES = [
  { id: 1, name: 'Arena #42', players: 8, status: 'Em andamento', timeLeft: '2:34' },
  { id: 2, name: 'Arena #43', players: 10, status: 'Iniciando', timeLeft: '0:10' },
];

const COUNTDOWN_SECONDS = 10;

export function TournamentLobby({
  players,
  credits,
  entryFee,
  prizePool,
  onStart,
}: TournamentLobbyProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
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
  
  const selectedModeConfig = GAME_MODES.find(m => m.id === selectedMode);
  const canAfford = selectedModeConfig ? credits >= selectedModeConfig.entryFee : false;
  
  const handleSelectMode = useCallback((mode: GameMode) => {
    setSelectedMode(mode);
  }, []);
  
  const handleStartCountdown = useCallback(() => {
    if (!selectedModeConfig || !canAfford || isStarting) return;
    setIsStarting(true);
    setCountdown(COUNTDOWN_SECONDS);
  }, [selectedModeConfig, canAfford, isStarting]);
  
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
  
  // Estatísticas do jogador
  const playerStats = {
    wins: 7,
    races: 12,
    bestTime: '1:24',
    rank: 'Bronze',
  };
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background do universo */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${universeBg})` }}
      />
      
      {/* Overlay escuro */}
      <div className="absolute inset-0 bg-black/70" />
      
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
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Conteúdo principal */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header - Status do jogador */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 border-b border-white/10 backdrop-blur-sm bg-black/30"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-2xl">
                👤
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Piloto</h1>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Medal className="w-3 h-3 text-yellow-500" />
                  {playerStats.rank}
                </div>
              </div>
            </div>
            
            <motion.div 
              className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 px-4 py-2 rounded-full border border-yellow-500/50"
              whileHover={{ scale: 1.05 }}
            >
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="font-bold text-yellow-400">{credits.toLocaleString()} K$</span>
            </motion.div>
          </div>
          
          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-green-400">{playerStats.wins}</div>
              <div className="text-xs text-white/50">Vitórias</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-blue-400">{playerStats.races}</div>
              <div className="text-xs text-white/50">Corridas</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-purple-400">{playerStats.bestTime}</div>
              <div className="text-xs text-white/50">Melhor</div>
            </div>
          </div>
        </motion.header>
        
        {/* Corridas em andamento */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mx-4 mt-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-white/80">Corridas em Andamento</span>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2">
            {ONGOING_RACES.map((race) => (
              <motion.div
                key={race.id}
                whileHover={{ scale: 1.02 }}
                className="flex-shrink-0 bg-white/5 border border-white/10 rounded-xl p-3 min-w-[140px]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-white/60">{race.status}</span>
                </div>
                <div className="text-sm font-medium text-white">{race.name}</div>
                <div className="flex items-center justify-between mt-2 text-xs text-white/50">
                  <span><Users className="w-3 h-3 inline mr-1" />{race.players}</span>
                  <span className="text-primary">{race.timeLeft}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>
        
        {/* Modos de Jogo */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mx-4 mt-6 flex-1"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-white/80">Escolha seu Modo</span>
          </div>
          
          <div className="space-y-3">
            {GAME_MODES.map((mode, index) => {
              const Icon = mode.icon;
              const isSelected = selectedMode === mode.id;
              const canAffordMode = credits >= mode.entryFee;
              
              return (
                <motion.button
                  key={mode.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  onClick={() => handleSelectMode(mode.id)}
                  disabled={!canAffordMode}
                  className={`
                    w-full text-left p-4 rounded-2xl border transition-all
                    ${isSelected 
                      ? `bg-gradient-to-br ${mode.gradient} border-primary/50 ring-2 ring-primary/30` 
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }
                    ${!canAffordMode ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl bg-black/30 ${mode.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-white">{mode.name}</h3>
                        <div className="flex items-center gap-1">
                          {mode.entryFee > 0 ? (
                            <>
                              <Coins className="w-4 h-4 text-yellow-400" />
                              <span className="text-sm font-medium text-yellow-400">{mode.entryFee} K$</span>
                            </>
                          ) : (
                            <span className="text-sm font-medium text-green-400">Grátis</span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-white/60 mt-1">{mode.description}</p>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                        <span><Users className="w-3 h-3 inline mr-1" />{mode.players}</span>
                        {mode.prizeMultiplier > 0 && (
                          <span className="text-green-400">
                            <TrendingUp className="w-3 h-3 inline mr-1" />
                            Prêmio x{mode.prizeMultiplier}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                      >
                        <Play className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.section>
        
        {/* Preview do modo selecionado */}
        <AnimatePresence>
          {selectedMode === 'arena' && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-4 mt-4 overflow-hidden"
            >
              <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-5 h-5 text-yellow-400" />
                  <span className="font-semibold text-white">Premiação Arena</span>
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-center text-sm">
                  {[
                    { pos: '🥇', value: 500, color: 'from-yellow-400 to-yellow-600' },
                    { pos: '🥈', value: 250, color: 'from-gray-300 to-gray-500' },
                    { pos: '🥉', value: 150, color: 'from-orange-400 to-orange-600' },
                    { pos: '4º', value: 100, color: 'from-slate-400 to-slate-600' },
                  ].map((prize, i) => (
                    <motion.div
                      key={i}
                      whileHover={{ scale: 1.05 }}
                      className={`bg-gradient-to-b ${prize.color} rounded-xl py-2 px-1`}
                    >
                      <div className="text-lg">{prize.pos}</div>
                      <div className="font-bold text-white text-xs">{prize.value} K$</div>
                    </motion.div>
                  ))}
                </div>
                
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/60">Oponentes</span>
                    <span className="text-white">9 Bots IQ80</span>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
        
        {/* Botão de iniciar */}
        <div className="p-4 mt-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={handleStartCountdown}
              disabled={!selectedMode || !canAfford || isStarting}
              className={`
                w-full h-14 text-lg font-bold border-0 shadow-lg transition-all
                ${selectedMode 
                  ? 'bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 hover:from-purple-700 hover:via-pink-600 hover:to-orange-600 shadow-purple-500/30' 
                  : 'bg-white/10 text-white/50'
                }
              `}
            >
              {!selectedMode ? (
                'Selecione um modo'
              ) : canAfford ? (
                <>
                  <Rocket className="w-6 h-6 mr-2" />
                  ENTRAR {selectedModeConfig && selectedModeConfig.entryFee > 0 
                    ? `(-${selectedModeConfig.entryFee} K$)` 
                    : '(Grátis)'
                  }
                </>
              ) : (
                'Créditos insuficientes'
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
