/**
 * SkemaLobby - Hub principal do jogador SKEMA
 * 
 * Mostra:
 * - Emoji, nome, Ano/Dia Skema, energia
 * - Modos: Treinar, Treinar x Bots, Corridas Oficiais
 * - Missão de convites
 * - Taxa de transferência
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { formatEnergy, calculateBalanceBreakdown } from '@/lib/tierEconomy';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Trophy, Users, Clock, Brain, Swords, Target,
  Rocket, Sparkles, Calendar, Crown, AlertCircle, LogOut, UserCheck, PartyPopper, Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SkemaPlayer, getSkemaHour, PlayerTier } from '@/hooks/useSupabasePlayer';
import { useOfficialRace } from '@/hooks/useOfficialRace';
import { useOpenArenas, ArenaListing } from '@/hooks/useArenaListings';
import { calculateArenaPool, getScaledArenaPrize } from '@/lib/arenaPayouts';
import { OnlinePlayer } from '@/hooks/useOnlinePlayers';
import { RegisteredPlayersPanel } from './RegisteredPlayersPanel';
import { ReferralHistoryPanel } from './ReferralHistoryPanel';
import { OnlinePlayersPanel } from './OnlinePlayersPanel';
import { PlayerGameHistory } from './PlayerGameHistory';
import universeBg from '@/assets/universe-bg.jpg';

// Type for online presence passed from parent
interface OnlinePresenceData {
  onlinePlayers: OnlinePlayer[];
  isConnected: boolean;
  updateStatus: (status: 'online' | 'playing' | 'away') => void;
  onlineCount: number;
}

// Type for Skema Box Cloud hook
interface SkemaBoxData {
  balance: number;
  isLoading: boolean;
  addToBox: (amount: number, type: 'arena_rake' | 'official_rake' | 'party_rake', description?: string) => Promise<number | null>;
  subtractFromBox: (amount: number, type: 'official_refund' | 'adjustment', description?: string) => Promise<number | null>;
  resetBalance: () => Promise<boolean>;
  refreshBalance: () => Promise<void>;
}

interface SkemaLobbyProps {
  player: SkemaPlayer;
  skemaYear: number;
  skemaDay: number;
  remainingReferralRewards: number;
  transferTax: number;
  onStartTraining: () => void;
  onStartBotRace: (buyIn: number, fee: number, botCount?: number) => Promise<{ success: boolean; error?: string }>;
  onStartOfficialRace: (raceId: string, buyIn: number, fee: number) => Promise<{ success: boolean; error?: string }>;
  onStartParty: () => void;
  onDeductEnergy: (amount: number) => boolean;
  onAddEnergy: (amount: number) => void;
  onLogout: () => void;
  onlinePresence: OnlinePresenceData;
  onProcessReferralRewards: () => Promise<{ processed: number; total_reward: number }>;
  onRefreshProfile: () => void;
  skemaBox: SkemaBoxData;
}

type GameMode = 'training' | 'bots' | 'official' | 'party';

const COUNTDOWN_SECONDS = 10;

// Helper component to display player tier badge
function TierBadge({ tier }: { tier: PlayerTier }) {
  const config: Record<string, { emoji: string; label: string; className: string }> = {
    master_admin: { 
      emoji: '🔴', 
      label: 'CD HX', 
      className: 'bg-gradient-to-r from-red-500/30 to-rose-500/30 border-red-500/50 text-red-300' 
    },
    'Criador': { 
      emoji: '⭐', 
      label: 'Criador', 
      className: 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-amber-500/50 text-amber-300' 
    },
    guardiao: { 
      emoji: '⭐', 
      label: 'Criador', 
      className: 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-amber-500/50 text-amber-300' 
    },
    'Grão Mestre': { 
      emoji: '👑', 
      label: 'Grão Mestre', 
      className: 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-500/50 text-purple-300' 
    },
    grao_mestre: { 
      emoji: '👑', 
      label: 'Grão Mestre', 
      className: 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-500/50 text-purple-300' 
    },
    'Mestre': { 
      emoji: '⚔️', 
      label: 'Mestre', 
      className: 'bg-gradient-to-r from-blue-500/30 to-cyan-500/30 border-blue-500/50 text-blue-300' 
    },
    mestre: { 
      emoji: '⚔️', 
      label: 'Mestre', 
      className: 'bg-gradient-to-r from-blue-500/30 to-cyan-500/30 border-blue-500/50 text-blue-300' 
    },
    'Boom': { 
      emoji: '🚀', 
      label: 'Boom', 
      className: 'bg-gradient-to-r from-green-500/30 to-emerald-500/30 border-green-500/50 text-green-300' 
    },
    'Ploft': { 
      emoji: '🎮', 
      label: 'Ploft', 
      className: 'bg-gradient-to-r from-slate-500/30 to-gray-500/30 border-slate-500/50 text-slate-300' 
    },
    jogador: { 
      emoji: '🎮', 
      label: 'Ploft', 
      className: 'bg-gradient-to-r from-slate-500/30 to-gray-500/30 border-slate-500/50 text-slate-300' 
    },
  };
  
  const { emoji, label, className } = config[tier] || config.jogador;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium ${className}`}>
      <span>{emoji}</span>
      <span>{label}</span>
    </span>
  );
}

export function SkemaLobby({
  player,
  skemaYear,
  skemaDay,
  remainingReferralRewards,
  transferTax,
  onStartTraining,
  onStartBotRace,
  onStartOfficialRace,
  onStartParty,
  onDeductEnergy,
  onAddEnergy,
  onLogout,
  onlinePresence,
  onProcessReferralRewards,
  onRefreshProfile,
  skemaBox,
}: SkemaLobbyProps) {
  const officialRace = useOfficialRace();
  const { data: openArenas } = useOpenArenas();
  const { onlinePlayers, isConnected, updateStatus, onlineCount } = onlinePresence;
  const skemaHour = getSkemaHour();
  
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingArenaConfig, setPendingArenaConfig] = useState<{ buyIn: number; rakeFee: number; botCount: number } | null>(null);

  // Estrelas animadas
  const stars = useMemo(() => 
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 3,
    })), []
  );

  // Espera corrida carregar para mostrar lobby completo
  const canAffordOfficial = officialRace.isLoaded ? Math.round(player.energy * 100) >= Math.round(officialRace.constants.entryFee * 100) : false;
  const isPlayerRegisteredInRace = officialRace.race ? officialRace.actions.isPlayerRegistered(player.id) : false;

  const handleSelectMode = useCallback((mode: GameMode) => {
    setSelectedMode(mode);
    setError(null);
  }, []);

  // Constantes do Arena x Bots (centavos → k$)
  const ARENA_ENTRY_FEE_CENTS = 55; // 50 pool + 5 rake
  const ARENA_ENTRY_FEE = ARENA_ENTRY_FEE_CENTS / 100; // 0.55
  const canAffordArena = Math.round(player.energy * 100) >= ARENA_ENTRY_FEE_CENTS;

  const handleStartCountdown = useCallback(() => {
    if (isStarting) return;
    
    if (selectedMode === 'training') {
      setIsStarting(true);
      setCountdown(COUNTDOWN_SECONDS);
    } else if (selectedMode === 'bots') {
      if (!canAffordArena) {
        setError('Energia insuficiente (k$0.55)');
        return;
      }
      setIsStarting(true);
      setCountdown(COUNTDOWN_SECONDS);
    } else if (selectedMode === 'official') {
      if (!canAffordOfficial) {
        setError('Energia insuficiente');
        return;
      }
      setIsStarting(true);
      setCountdown(COUNTDOWN_SECONDS);
    } else if (selectedMode === 'party') {
      // Modo Festa: vai direto para setup sem countdown
      onStartParty();
      return;
    }
  }, [selectedMode, isStarting, canAffordOfficial, canAffordArena, onStartParty]);

  const handleCancelCountdown = useCallback(() => {
    setIsStarting(false);
    setCountdown(null);
    setPendingArenaConfig(null);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown === null || countdown < 0) return;
    
    if (countdown === 0) {
      // Update presence status to 'playing' when game starts
      updateStatus('playing');
      
      if (selectedMode === 'training') {
        onStartTraining();
      } else if (selectedMode === 'bots') {
        // Use pending arena config if available (custom arena), otherwise default
        const buyIn = pendingArenaConfig ? pendingArenaConfig.buyIn : 50 / 100;
        const fee = pendingArenaConfig ? pendingArenaConfig.rakeFee : 5 / 100;
        const botCount = pendingArenaConfig ? pendingArenaConfig.botCount : undefined;
        
        onStartBotRace(buyIn, fee, botCount).then(result => {
          if (!result.success) {
            setError(result.error || 'Erro ao iniciar');
            setIsStarting(false);
            setCountdown(null);
            setPendingArenaConfig(null);
            updateStatus('online');
          }
        });
      } else if (selectedMode === 'official') {
        const { entryFee, prizePerPlayer, skemaBoxFee } = officialRace.constants;
        onStartOfficialRace('official-race-2026-03-03', prizePerPlayer, skemaBoxFee).then(result => {
          if (!result.success) {
            setError(result.error || 'Erro ao iniciar');
            setIsStarting(false);
            setCountdown(null);
            updateStatus('online');
          }
        });
      }
      return;
    }
    
    const timer = setTimeout(() => {
      setCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown, selectedMode, onStartTraining, onStartBotRace, onStartOfficialRace, officialRace.constants, updateStatus, pendingArenaConfig]);

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${universeBg})` }}
      />
      <div className="fixed inset-0 bg-black/70" />
      
      {/* Estrelas */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
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
      
      {/* Conteúdo */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header - Perfil do jogador */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 border-b border-white/10 backdrop-blur-sm bg-black/30"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-3xl">
                {player.emoji}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white">{player.name}</h1>
                  <TierBadge tier={player.playerTier} />
                </div>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Calendar className="w-3 h-3" />
                  <span>Ano {skemaYear} • Dia {skemaDay} • {String(skemaHour).padStart(2, '0')}h</span>
                </div>
                {player.invitedByName && (
                  <div className="text-xs text-purple-300 mt-0.5">
                    🔗 Convidado por <span className="font-medium">{player.invitedByName}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <motion.div 
                className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 px-4 py-2 rounded-full border border-yellow-500/50"
                whileHover={{ scale: 1.05 }}
              >
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="font-bold text-yellow-400">
                  {formatEnergy(player.energy)}
                </span>
              </motion.div>
              {(() => {
                const bal = calculateBalanceBreakdown(player.energy, player.playerTier, player.referrals.length);
                return bal.locked > 0 ? (
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-orange-400/80">🔒 {formatEnergy(bal.locked)}</span>
                    <span className="text-emerald-400/80">🔓 {formatEnergy(bal.available)}</span>
                  </div>
                ) : null;
              })()}
              
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                className="text-white/50 hover:text-white"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Stats rápidos */}
          <div className={`grid gap-2 ${player.id === 'guardian-skema-universe' ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-green-400">{player.stats.wins}</div>
              <div className="text-xs text-white/50">Vitórias</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-blue-400">{player.stats.races}</div>
              <div className="text-xs text-white/50">Corridas</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-purple-400">
                {player.stats.bestTime ? `${Math.floor(player.stats.bestTime / 60)}:${String(player.stats.bestTime % 60).padStart(2, '0')}` : '-'}
              </div>
              <div className="text-xs text-white/50">Melhor</div>
            </div>
            {/* Skema Box - só master_admin vê */}
            {player.playerTier === 'master_admin' && (
              <div 
                className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg p-2 text-center border border-yellow-500/30 cursor-pointer hover:border-yellow-500/50 transition-colors"
                title="Skema Box (Cloud)"
              >
                <div className="text-lg font-bold text-yellow-400">k${skemaBox.balance.toFixed(2)}</div>
                <div className="text-xs text-yellow-400/70">Skema Box</div>
              </div>
            )}
          </div>
        </motion.header>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto pb-28">
          {/* Painel de Convites */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-4 mt-4"
          >
            <ReferralHistoryPanel
              playerId={player.id}
              inviteCode={player.inviteCode}
              playerTier={player.playerTier}
              onProcessRewards={onProcessReferralRewards}
              onRefreshProfile={onRefreshProfile}
            />
          </motion.section>

          {/* Extrato de Jogos */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mx-4 mt-3"
          >
            <PlayerGameHistory playerId={player.id} />
          </motion.section>
          
          {/* Taxa de transferência */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mx-4 mt-3 flex items-center gap-2 text-xs text-white/40"
          >
            <AlertCircle className="w-3 h-3" />
            <span>Taxa de transferência entre jogadores: {(transferTax * 100).toFixed(2)}%</span>
          </motion.div>
          
          {/* Jogadores Online */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
            className="mx-4 mt-4"
          >
            <OnlinePlayersPanel 
              players={onlinePlayers} 
              currentPlayerId={player.id}
              isConnected={isConnected}
            />
          </motion.section>
          
          {/* Modos de Jogo */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-4 mt-6"
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-white/80">Escolha seu Modo</span>
            </div>
            
            <div className="space-y-3">
              {/* Treinar (Solo) */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                onClick={() => handleSelectMode('training')}
                className={`
                  w-full text-left p-4 rounded-2xl border transition-all
                  ${selectedMode === 'training' 
                    ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-primary/50 ring-2 ring-primary/30' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-black/30 text-blue-400">
                    <Brain className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white">Treinar</h3>
                      <span className="text-sm font-medium text-green-400">Grátis</span>
                    </div>
                    <p className="text-sm text-white/60 mt-1">Pratique sozinho, sem gastar energia</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                      <span><Users className="w-3 h-3 inline mr-1" />Solo</span>
                      <span><Clock className="w-3 h-3 inline mr-1" />24h disponível</span>
                    </div>
                  </div>
                </div>
              </motion.button>
              
              {/* Treinar x Bots (Pago) */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                onClick={() => handleSelectMode('bots')}
                className={`
                  w-full text-left p-4 rounded-2xl border transition-all
                  ${selectedMode === 'bots' 
                    ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20 border-primary/50 ring-2 ring-primary/30' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-black/30 text-orange-400">
                    <Swords className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white">Arena x Bots</h3>
                      <span className="text-sm font-medium text-yellow-400">k$0.55</span>
                    </div>
                    <p className="text-sm text-white/60 mt-1">Enfrente 99 bots IA • 25 ITM</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                      <span><Users className="w-3 h-3 inline mr-1" />100 jogadores</span>
                      <span><Trophy className="w-3 h-3 inline mr-1" />ITM 25%: 1º k$13.50 • 2º k$8 • 3º k$5</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-green-400">Pool: k$50.00</span>
                      <span className="text-purple-400">Rake: k$5.00</span>
                      <span className="text-blue-400">Min-cash: k$0.55</span>
                    </div>
                  </div>
                </div>
              </motion.button>
              
              {/* Corrida Oficial Agendada */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                onClick={() => handleSelectMode('official')}
                className={`
                  w-full text-left p-4 rounded-2xl border transition-all
                  ${selectedMode === 'official' 
                    ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-primary/50 ring-2 ring-primary/30' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-black/30 text-yellow-400">
                    <Crown className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white">Corrida Oficial</h3>
                      <span className="text-sm font-medium text-yellow-400">
                        k${officialRace.constants.entryFee.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-sm text-white/60 mt-1">
                      {officialRace.race?.name || 'Corrida Inaugural SKEMA'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                      <span><Calendar className="w-3 h-3 inline mr-1" />{officialRace.formattedDate}</span>
                      <span><Users className="w-3 h-3 inline mr-1" />{officialRace.race?.registeredPlayers.length || 0} inscritos</span>
                    </div>
                    {isPlayerRegisteredInRace && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-green-400">
                        <UserCheck className="w-3 h-3" />
                        Você está inscrito!
                      </div>
                    )}
                  </div>
                </div>
              </motion.button>
              
              {/* Modo Festa (Party) */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                onClick={() => handleSelectMode('party')}
                className={`
                  w-full text-left p-4 rounded-2xl border transition-all
                  ${selectedMode === 'party' 
                    ? 'bg-gradient-to-br from-pink-500/20 to-purple-500/20 border-primary/50 ring-2 ring-primary/30' 
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                  }
                `}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-xl bg-black/30 text-pink-400">
                    <PartyPopper className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white">Modo Festa</h3>
                      <span className="text-sm font-medium text-yellow-400">k$1.10</span>
                    </div>
                    <p className="text-sm text-white/60 mt-1">Torneio presencial com amigos!</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                      <span><Users className="w-3 h-3 inline mr-1" />Até 10 jogadores</span>
                      <span><Trophy className="w-3 h-3 inline mr-1" />Top 4 premiam</span>
                    </div>
                    <div className="mt-2 text-xs text-pink-300">
                      🎯 Cada um joga no seu celular
                    </div>
                  </div>
                </div>
              </motion.button>
            </div>
          </motion.section>
          
          {/* Arenas Abertas */}
          {openArenas && openArenas.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="mx-4 mt-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium text-white/80">Arenas Abertas</span>
                <Badge variant="outline" className="text-[10px] border-orange-400/30 text-orange-400">
                  {openArenas.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {openArenas.map((arena) => {
                  const pool = calculateArenaPool(Number(arena.buy_in), Number(arena.rake_fee), arena.bot_count);
                  const first = getScaledArenaPrize(1, pool);
                  const canAfford = Math.round(player.energy * 100) >= Math.round(Number(arena.buy_in) * 100);
                  return (
                    <motion.div
                      key={arena.id}
                      whileHover={{ scale: 1.01 }}
                      className="p-3 rounded-xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex-1">
                          <span className="font-bold text-white text-sm">{arena.creator_emoji} {arena.name}</span>
                          <div className="flex items-center gap-3 text-[10px] text-white/50 mt-1">
                            <span><Bot className="w-3 h-3 inline mr-0.5" />{arena.bot_count} bots</span>
                            <span><Trophy className="w-3 h-3 inline mr-0.5" />Pool: {formatEnergy(pool)}</span>
                            <span>1º: {formatEnergy(first)}</span>
                          </div>
                          <div className="text-[10px] text-white/30 mt-0.5">por {arena.creator_name}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <span className="text-xs text-yellow-400 font-bold">
                              k${Number(arena.buy_in).toFixed(2)}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => {
                              if (!canAfford || isStarting) return;
                              setPendingArenaConfig({
                                buyIn: Number(arena.buy_in),
                                rakeFee: Number(arena.rake_fee),
                                botCount: arena.bot_count,
                              });
                              setSelectedMode('bots');
                              setIsStarting(true);
                              setCountdown(COUNTDOWN_SECONDS);
                            }}
                            disabled={!canAfford || isStarting}
                            className="h-8 px-3"
                          >
                            <Swords className="w-3 h-3 mr-1" />
                            Jogar
                          </Button>
                        </div>
                      </div>
                      {!canAfford && (
                        <div className="text-[10px] text-red-400 mt-1">⚠️ Saldo insuficiente</div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.section>
          )}
          
          {/* Painel de Jogadores Registrados - sempre visível */}
          {officialRace.race && (
            <RegisteredPlayersPanel
              tournamentPlayers={officialRace.race.registeredPlayers}
              currentPlayerId={player.id}
              maxPlayers={officialRace.constants.maxPlayers}
            />
          )}
          
          {/* Detalhes da Corrida Oficial */}
          <AnimatePresence>
            {selectedMode === 'official' && officialRace.race && (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mx-4 mt-4 overflow-hidden"
              >
                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-4">
                  {/* Info da corrida */}
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-lg font-bold text-white">{officialRace.race.name}</div>
                      <div className="text-sm text-white/60">{officialRace.formattedDate}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/50">Tempo restante</div>
                      <div className="text-lg font-bold text-yellow-400">{officialRace.timeUntilRace}</div>
                    </div>
                  </div>
                  
                  {/* Economia */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    <div className="bg-black/30 rounded-lg p-2 text-center">
                      <div className="text-xs text-white/50">Entrada</div>
                      <div className="font-bold text-white">k${officialRace.constants.entryFee.toFixed(2)}</div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-2 text-center">
                      <div className="text-xs text-white/50">Prêmio/Player</div>
                      <div className="font-bold text-green-400">k${officialRace.constants.prizePerPlayer.toFixed(2)}</div>
                    </div>
                    <div className="bg-black/30 rounded-lg p-2 text-center">
                      <div className="text-xs text-white/50">Caixa Skema</div>
                      <div className="font-bold text-purple-400">k${officialRace.constants.skemaBoxFee.toFixed(2)}</div>
                    </div>
                  </div>
                  
                  {/* Pote atual */}
                  <div className="bg-black/30 rounded-lg p-3 mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-400" />
                      <span className="text-white/80">Pote Atual</span>
                    </div>
                    <span className="text-xl font-bold text-yellow-400">k${officialRace.prizePool.toFixed(2)}</span>
                  </div>
                  
                  {/* Lista de inscritos */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-white/60" />
                      <span className="text-sm text-white/80">
                        Jogadores Inscritos ({officialRace.race.registeredPlayers.length}/{officialRace.constants.maxPlayers})
                      </span>
                    </div>
                    
                    {officialRace.race.registeredPlayers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {officialRace.race.registeredPlayers.map((p) => (
                          <div 
                            key={p.id}
                            className={`
                              flex items-center gap-1 px-2 py-1 rounded-full text-xs
                              ${p.id === player.id ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-white/10 text-white/80'}
                            `}
                          >
                            <span>{p.emoji}</span>
                            <span>{p.name}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-white/40 italic">Nenhum jogador inscrito ainda</div>
                    )}
                  </div>
                  
                  {/* Botão de inscrição / cancelamento */}
                  {!isPlayerRegisteredInRace ? (
                    <Button
                      onClick={async () => {
                        if (!canAffordOfficial) {
                          setError('Energia insuficiente para inscrição');
                          return;
                        }
                        
                        // Converte para centavos para aritmética segura
                        const entryFeeCents = Math.round(officialRace.constants.entryFee * 100);
                        const skemaBoxFeeCents = Math.round(officialRace.constants.skemaBoxFee * 100);
                        const entryFee = entryFeeCents / 100;
                        const skemaBoxFee = skemaBoxFeeCents / 100;
                        
                        // Deduz energia PRIMEIRO
                        const deducted = onDeductEnergy(entryFee);
                        if (!deducted) {
                          setError('Falha ao deduzir energia');
                          return;
                        }
                        
                        const result = officialRace.actions.registerPlayer({
                          id: player.id,
                          name: player.name,
                          emoji: player.emoji,
                        });
                        if (!result.success) {
                          // Se falhou inscrição, devolve energia
                          onAddEnergy(entryFee);
                          setError(result.error || 'Erro ao inscrever');
                        } else {
                          // INSCRIÇÃO OK: credita rake no Skema Box (Cloud)
                          const newBal = await skemaBox.addToBox(skemaBoxFee, 'official_rake');
                          console.log(`[OFFICIAL] 💰 Rake Cloud k$${skemaBoxFee.toFixed(2)} → Skema Box: k$${(newBal ?? 0).toFixed(2)}`);
                          if (newBal === null) {
                            console.error('[OFFICIAL] ❌ Falha ao creditar rake no Skema Box!');
                          }
                        }
                      }}
                      disabled={!canAffordOfficial}
                      className="w-full"
                      variant="default"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Inscrever-se (k${(Math.round(officialRace.constants.entryFee * 100) / 100).toFixed(2)})
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
                        <UserCheck className="w-5 h-5" />
                        <span className="font-medium">Você está inscrito!</span>
                      </div>
                      <Button
                        onClick={async () => {
                          // Centavos para aritmética segura
                          const entryFee = Math.round(officialRace.constants.entryFee * 100) / 100;
                          const skemaBoxFee = Math.round(officialRace.constants.skemaBoxFee * 100) / 100;
                          
                          const result = officialRace.actions.unregisterPlayer(player.id);
                          if (result.success) {
                            // Devolve energia ao jogador
                            onAddEnergy(entryFee);
                            // Remove rake do Skema Box (Cloud)
                            const newBal = await skemaBox.subtractFromBox(skemaBoxFee, 'official_refund');
                            console.log(`[OFFICIAL] ↩️ Rake Cloud devolvido k$${skemaBoxFee.toFixed(2)} → Skema Box: k$${(newBal ?? 0).toFixed(2)}`);
                            setError(null);
                          } else {
                            setError(result.error || 'Erro ao cancelar inscrição');
                          }
                        }}
                        variant="outline"
                        className="w-full text-red-400 border-red-500/30 hover:bg-red-500/10"
                      >
                        Cancelar Inscrição (+k${(Math.round(officialRace.constants.entryFee * 100) / 100).toFixed(2)})
                      </Button>
                    </div>
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
          
          {/* Erro */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mx-4 mt-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3"
              >
                <AlertCircle className="w-4 h-4" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Botão fixo */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent z-20">
          <Button
            onClick={handleStartCountdown}
            disabled={!selectedMode || isStarting || (selectedMode === 'official' && !isPlayerRegisteredInRace)}
            className="w-full h-14 text-lg font-bold"
            size="lg"
          >
            {selectedMode === 'training' && (
              <>
                <Brain className="w-5 h-5 mr-2" />
                Iniciar Treino
              </>
            )}
            {selectedMode === 'bots' && (
              <>
                <Swords className="w-5 h-5 mr-2" />
                Entrar na Arena
              </>
            )}
            {selectedMode === 'official' && (
              <>
                <Crown className="w-5 h-5 mr-2" />
                Entrar na Corrida
              </>
            )}
            {selectedMode === 'party' && (
              <>
                <PartyPopper className="w-5 h-5 mr-2" />
                Criar Torneio Festa
              </>
            )}
            {!selectedMode && (
              <>
                <Target className="w-5 h-5 mr-2" />
                Selecione um Modo
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
