/**
 * SkemaLobby - Hub principal do jogador SKEMA (PokerStars-style)
 * 
 * Layout:
 * - Header com perfil e saldo
 * - Tabs: Sit & Go (arenas) | Torneios (corridas agendadas) | Treinar
 * - Tabela de mesas/arenas com buy-in, jogadores, pool, ação
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { formatEnergy, calculateBalanceBreakdown } from '@/lib/tierEconomy';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Zap, Trophy, Users, Clock, Brain, Swords, Target,
  Rocket, Sparkles, Calendar, Crown, AlertCircle, LogOut, UserCheck, Bot,
  Coins, Loader2, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SkemaPlayer, getSkemaHour, PlayerTier } from '@/hooks/useSupabasePlayer';
import { useOfficialRaces } from '@/hooks/useOfficialRace';
import { useOpenArenas, ArenaListing } from '@/hooks/useArenaListings';
import { calculateArenaPool, getScaledArenaPrize } from '@/lib/arenaPayouts';
import { OnlinePlayer } from '@/hooks/useOnlinePlayers';
import { ReferralHistoryPanel } from './ReferralHistoryPanel';
import { getColorConfig } from './GenerationColorPicker';
import { CreatorDescendancyPanel } from './CreatorDescendancyPanel';
import { TransferPanel } from './TransferPanel';
import { PlayerGameHistory } from './PlayerGameHistory';
import { GenerationColorPicker } from './GenerationColorPicker';
import universeBg from '@/assets/universe-bg.jpg';
import skemaNebula from '@/assets/skema-nebula.jpeg';

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
  onDeductEnergy: (amount: number) => boolean;
  onAddEnergy: (amount: number) => void;
  onLogout: () => void;
  onlinePresence: OnlinePresenceData;
  onProcessReferralRewards: () => Promise<{ processed: number; total_reward: number }>;
  onRefreshProfile: () => void;
  skemaBox: SkemaBoxData;
}

const COUNTDOWN_SECONDS = 10;

// Helper component to display player tier badge
function TierBadge({ tier }: { tier: PlayerTier }) {
  const config: Record<string, { emoji: string; label: string; className: string }> = {
    master_admin: { 
      emoji: '🔴', label: 'CD HX', 
      className: 'bg-gradient-to-r from-red-500/30 to-rose-500/30 border-red-500/50 text-red-300' 
    },
    'Criador': { 
      emoji: '⭐', label: 'Criador', 
      className: 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-amber-500/50 text-amber-300' 
    },
    guardiao: { 
      emoji: '⭐', label: 'Criador', 
      className: 'bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-amber-500/50 text-amber-300' 
    },
    'Grão Mestre': { 
      emoji: '👑', label: 'Grão Mestre', 
      className: 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-500/50 text-purple-300' 
    },
    grao_mestre: { 
      emoji: '👑', label: 'Grão Mestre', 
      className: 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 border-purple-500/50 text-purple-300' 
    },
    'Mestre': { 
      emoji: '⚔️', label: 'Mestre', 
      className: 'bg-gradient-to-r from-blue-500/30 to-cyan-500/30 border-blue-500/50 text-blue-300' 
    },
    mestre: { 
      emoji: '⚔️', label: 'Mestre', 
      className: 'bg-gradient-to-r from-blue-500/30 to-cyan-500/30 border-blue-500/50 text-blue-300' 
    },
    'Boom': { 
      emoji: '🚀', label: 'Boom', 
      className: 'bg-gradient-to-r from-green-500/30 to-emerald-500/30 border-green-500/50 text-green-300' 
    },
    'Ploft': { 
      emoji: '🎮', label: 'Ploft', 
      className: 'bg-gradient-to-r from-slate-500/30 to-gray-500/30 border-slate-500/50 text-slate-300' 
    },
    jogador: { 
      emoji: '🎮', label: 'Ploft', 
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
// Contador global compacto para o grid de stats
function UniversePlayerCounter() {
  const { data: count } = useQuery({
    queryKey: ['universe-player-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .neq('player_tier', 'master_admin');
      return count || 0;
    },
    staleTime: 30_000,
  });

  return (
    <>
      <motion.div
        key={count}
        initial={{ scale: 1.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-lg font-bold text-purple-300"
      >
        {count ?? '...'}
      </motion.div>
      <div className="text-[10px] text-purple-300/60">Universo</div>
    </>
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
  onDeductEnergy,
  onAddEnergy,
  onLogout,
  onlinePresence,
  onProcessReferralRewards,
  onRefreshProfile,
  skemaBox,
}: SkemaLobbyProps) {
  const { races: officialRaces, isLoading: racesLoading, refresh: refreshRaces } = useOfficialRaces();
  const { data: openArenas, isLoading: arenasLoading } = useOpenArenas();
  const { onlinePlayers, isConnected, updateStatus, onlineCount } = onlinePresence;
  const skemaHour = getSkemaHour();
  
  const [activeTab, setActiveTab] = useState<string>('sitgo');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

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

  // removed single-race vars, now handled per-race in the list

  // Default arena (k$0.55)
  const DEFAULT_ENTRY_CENTS = 55;
  const canAffordDefaultArena = Math.round(player.energy * 100) >= DEFAULT_ENTRY_CENTS;

  const handleStartCountdownForAction = useCallback((action: () => void) => {
    if (isStarting) return;
    setIsStarting(true);
    setPendingAction(() => action);
    setCountdown(COUNTDOWN_SECONDS);
  }, [isStarting]);

  const handleCancelCountdown = useCallback(() => {
    setIsStarting(false);
    setCountdown(null);
    setPendingAction(null);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown === null || countdown < 0) return;
    
    if (countdown === 0) {
      updateStatus('playing');
      if (pendingAction) {
        pendingAction();
      }
      setIsStarting(false);
      setPendingAction(null);
      return;
    }
    
    const timer = setTimeout(() => {
      setCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown, pendingAction, updateStatus]);

  // Handle arena click (custom or default)
  const handleJoinArena = useCallback((buyIn: number, rakeFee: number, botCount: number) => {
    const canAfford = Math.round(player.energy * 100) >= Math.round(buyIn * 100);
    if (!canAfford) {
      setError('Saldo insuficiente');
      return;
    }
    handleStartCountdownForAction(() => {
      onStartBotRace(buyIn, rakeFee, botCount).then(result => {
        if (!result.success) {
          setError(result.error || 'Erro ao iniciar');
          updateStatus('online');
        }
      });
    });
  }, [player.energy, handleStartCountdownForAction, onStartBotRace, updateStatus]);

  // Handle training
  const handleTraining = useCallback(() => {
    handleStartCountdownForAction(() => {
      onStartTraining();
    });
  }, [handleStartCountdownForAction, onStartTraining]);

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Background */}
      <div className="fixed inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${universeBg})` }} />
      <div className="fixed inset-0 bg-black/70" />
      
      {/* Estrelas */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {stars.map(star => (
          <motion.div
            key={star.id}
            className="absolute rounded-full bg-white"
            style={{ left: `${star.x}%`, top: `${star.y}%`, width: star.size, height: star.size }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.5, 1] }}
            transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: star.delay }}
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
            <Rocket className="w-16 h-16 text-primary mx-auto mb-4 animate-bounce" />
            <div className="text-2xl text-muted-foreground mb-4">LANÇAMENTO EM</div>
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-primary to-purple-500 tabular-nums">
                {countdown}
              </div>
            </motion.div>
            <Button variant="ghost" onClick={handleCancelCountdown} className="mt-8 text-muted-foreground hover:text-white">
              Cancelar
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Conteúdo */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header - Perfil */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 border-b border-white/10 backdrop-blur-sm bg-black/30"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {(() => {
                const genColor = getColorConfig(player.generationColor);
                return (
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    genColor 
                      ? `${genColor.bg} ${genColor.glow}` 
                      : 'bg-gradient-to-br from-primary to-purple-500'
                  }`}>
                    {player.emoji}
                  </div>
                );
              })()}

              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white">{player.name}</h1>
                  <TierBadge tier={player.playerTier} />
                </div>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Calendar className="w-3 h-3" />
                  <span>Ano {skemaYear} • Dia {skemaDay} • {String(skemaHour).padStart(2, '0')}h</span>
                  <span className="text-white/30">•</span>
                  <span className="flex items-center gap-1">
                    {isConnected ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                    )}
                    <span>{onlineCount} online</span>
                  </span>
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
                <span className="font-bold text-yellow-400">{formatEnergy(player.energy)}</span>
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
              <Button variant="ghost" size="icon" onClick={onLogout} className="text-white/50 hover:text-white">
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
          
          {/* Stats rápidos + contador universo */}
          <div className="grid grid-cols-4 gap-2">
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
            <div className="bg-gradient-to-br from-purple-500/15 to-indigo-500/15 rounded-lg p-2 text-center border border-purple-500/20">
              <UniversePlayerCounter />
            </div>
          </div>
          {player.playerTier === 'master_admin' && (
            <div className="mt-2 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg p-2 text-center border border-yellow-500/30">
              <div className="text-lg font-bold text-yellow-400">k${skemaBox.balance.toFixed(2)}</div>
              <div className="text-xs text-yellow-400/70">Skema Box</div>
            </div>
          )}
        </motion.header>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto pb-6">
          {/* Banner SKEMA - compacto no topo */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="relative mx-4 mt-3 rounded-xl overflow-hidden h-20"
          >
            <div 
              className="absolute inset-0 bg-cover bg-center" 
              style={{ backgroundImage: `url(${skemaNebula})` }} 
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/70" />
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
              <h2 className="text-xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-white to-purple-300">
                SKEMA
              </h2>
              <p className="text-[9px] tracking-[0.12em] uppercase text-purple-200/70 font-light mt-0.5">
                Cada escolha uma renúncia, uma consequência...
              </p>
            </div>
          </motion.div>

          {/* ═══════════════════════════════════════════
              LOBBY POKERSTARS-STYLE — Tabs (logo abaixo do banner)
              ═══════════════════════════════════════════ */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mx-4 mt-3"
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full bg-white/5 border border-white/10 h-11">
                <TabsTrigger value="sitgo" className="flex-1 gap-1.5 data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
                  <Swords className="w-4 h-4" />
                  Sit & Go
                </TabsTrigger>
                <TabsTrigger value="tournaments" className="flex-1 gap-1.5 data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400">
                  <Crown className="w-4 h-4" />
                  Torneios
                </TabsTrigger>
                <TabsTrigger value="practice" className="flex-1 gap-1.5 data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                  <Brain className="w-4 h-4" />
                  Treinar
                </TabsTrigger>
              </TabsList>

              {/* ─── Sit & Go (Arenas) ─── */}
              <TabsContent value="sitgo" className="mt-3 space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/50">Mesas disponíveis</span>
                  <span className="text-xs text-white/30">25 ITM • Poker-Style Payouts</span>
                </div>

                {/* Header da tabela */}
                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 py-1.5 text-[10px] text-white/40 uppercase tracking-wider border-b border-white/10">
                  <span>Mesa</span>
                  <span className="text-right w-16">Buy-in</span>
                  <span className="text-right w-14">Bots</span>
                  <span className="text-right w-20">Pool</span>
                  <span className="w-16"></span>
                </div>

                {/* Arena padrão k$0.55 */}
                <motion.div
                  whileHover={{ scale: 1.005 }}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-primary/30 transition-colors"
                >
                  <div>
                    <span className="text-sm font-medium text-white">🎯 Arena Padrão</span>
                    <div className="text-[10px] text-white/40 mt-0.5">1º {formatEnergy(getScaledArenaPrize(1, 50))}</div>
                  </div>
                  <div className="text-right w-16">
                    <span className="text-xs font-bold text-yellow-400">k$ 0,55</span>
                  </div>
                  <div className="text-right w-14">
                    <span className="text-xs text-white/60">99</span>
                  </div>
                  <div className="text-right w-20">
                    <span className="text-xs text-green-400 font-medium">{formatEnergy(50)}</span>
                  </div>
                  <div className="w-16">
                    <Button
                      size="sm"
                      onClick={() => handleJoinArena(0.55, 0.05, 99)}
                      disabled={!canAffordDefaultArena || isStarting}
                      className="h-7 w-full text-xs"
                    >
                      Jogar
                    </Button>
                  </div>
                </motion.div>

                {/* Arenas customizadas do banco (ordenadas por buy-in desc) */}
                {arenasLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                  </div>
                ) : (
                  [...(openArenas || [])].sort((a, b) => Number(b.buy_in) - Number(a.buy_in)).map((arena) => {
                    const pool = calculateArenaPool(Number(arena.buy_in), Number(arena.rake_fee), arena.bot_count);
                    const first = getScaledArenaPrize(1, pool);
                    const canAfford = Math.round(player.energy * 100) >= Math.round(Number(arena.buy_in) * 100);
                    return (
                      <motion.div
                        key={arena.id}
                        whileHover={{ scale: 1.005 }}
                        className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center px-3 py-2.5 rounded-lg bg-gradient-to-r from-orange-500/5 to-red-500/5 border border-orange-500/20 hover:border-orange-500/40 transition-colors"
                      >
                        <div>
                          <span className="text-sm font-medium text-white">{arena.creator_emoji} {arena.name}</span>
                          <div className="text-[10px] text-white/40 mt-0.5">1º {formatEnergy(first)} • por {arena.creator_name}</div>
                        </div>
                        <div className="text-right w-16">
                          <span className="text-xs font-bold text-yellow-400">{formatEnergy(Number(arena.buy_in))}</span>
                        </div>
                        <div className="text-right w-14">
                          <span className="text-xs text-white/60">{arena.bot_count}</span>
                        </div>
                        <div className="text-right w-20">
                          <span className="text-xs text-green-400 font-medium">{formatEnergy(pool)}</span>
                        </div>
                        <div className="w-16">
                          <Button
                            size="sm"
                            onClick={() => handleJoinArena(Number(arena.buy_in), Number(arena.rake_fee), arena.bot_count)}
                            disabled={!canAfford || isStarting}
                            className="h-7 w-full text-xs"
                          >
                            Jogar
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })
                )}

                {!arenasLoading && (!openArenas || openArenas.length === 0) && (
                  <div className="text-center py-3 text-xs text-white/30">
                    Nenhuma arena customizada aberta
                  </div>
                )}
              </TabsContent>

              {/* ─── Torneios (Corridas Oficiais) ─── */}
              <TabsContent value="tournaments" className="mt-3 space-y-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white/50">Torneios agendados ({officialRaces.length})</span>
                  <span className="text-xs text-white/30">Multiplayer</span>
                </div>

                {racesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-white/30" />
                  </div>
                ) : officialRaces.length > 0 ? (
                  officialRaces.map((race) => {
                    const isRegistered = race.registeredPlayers.some(p => p.id === player.id);
                    const canAfford = Math.round(player.energy * 100) >= Math.round(race.entryFee * 100);
                    const pool = race.registeredPlayers.length * race.prizePerPlayer;
                    const timeUntil = (() => {
                      const diff = race.scheduledDate.getTime() - Date.now();
                      if (diff <= 0) return 'Iniciando...';
                      const d = Math.floor(diff / 86400000);
                      const h = Math.floor((diff % 86400000) / 3600000);
                      const m = Math.floor((diff % 3600000) / 60000);
                      if (d > 0) return `${d}d ${h}h`;
                      if (h > 0) return `${h}h ${m}m`;
                      return `${m}m`;
                    })();

                    return (
                      <div key={race.id} className="rounded-xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-lg font-bold text-white flex items-center gap-2">
                              <Crown className="w-5 h-5 text-yellow-400" />
                              {race.name}
                            </div>
                            <div className="text-sm text-white/60">
                              {race.scheduledDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-white/50">Início em</div>
                            <div className="text-lg font-bold text-yellow-400 tabular-nums">{timeUntil}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-black/30 rounded-lg p-2 text-center">
                            <div className="text-xs text-white/50">Buy-in</div>
                            <div className="font-bold text-white">k${race.entryFee.toFixed(2)}</div>
                          </div>
                          <div className="bg-black/30 rounded-lg p-2 text-center">
                            <div className="text-xs text-white/50">Prêmio/Player</div>
                            <div className="font-bold text-green-400">k${race.prizePerPlayer.toFixed(2)}</div>
                          </div>
                          <div className="bg-black/30 rounded-lg p-2 text-center">
                            <div className="text-xs text-white/50">Rake</div>
                            <div className="font-bold text-purple-400">k${race.skemaBoxFee.toFixed(2)}</div>
                          </div>
                        </div>

                        <div className="bg-black/30 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-400" />
                            <span className="text-white/80">Pote Atual</span>
                          </div>
                          <span className="text-xl font-bold text-yellow-400">k${pool.toFixed(2)}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-white/60" />
                            <span className="text-sm text-white/80">
                              {race.registeredPlayers.length}/{race.maxPlayers} inscritos
                            </span>
                          </div>
                          {race.registeredPlayers.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {race.registeredPlayers.map((p) => (
                                <span key={p.id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${p.id === player.id ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-white/10 text-white/70'}`}>
                                  {p.emoji} {p.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {!isRegistered ? (
                          <Button
                            onClick={async () => {
                              if (!canAfford) { setError('Energia insuficiente'); return; }
                              const fee = Math.round(race.entryFee * 100) / 100;
                              const sbFee = Math.round(race.skemaBoxFee * 100) / 100;
                              const deducted = onDeductEnergy(fee);
                              if (!deducted) { setError('Falha ao deduzir energia'); return; }
                              const { error: regErr } = await supabase
                                .from('race_registrations')
                                .insert({ race_id: race.id, player_id: player.id });
                              if (regErr) {
                                onAddEnergy(fee);
                                setError(regErr.message);
                              } else {
                                await skemaBox.addToBox(sbFee, 'official_rake');
                                refreshRaces();
                              }
                            }}
                            disabled={!canAfford}
                            className="w-full"
                          >
                            <UserCheck className="w-4 h-4 mr-2" />
                            Inscrever-se (k${race.entryFee.toFixed(2)})
                          </Button>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
                              <UserCheck className="w-5 h-5" />
                              <span className="font-medium">Você está inscrito!</span>
                            </div>
                            <Button
                              onClick={async () => {
                                const fee = Math.round(race.entryFee * 100) / 100;
                                const sbFee = Math.round(race.skemaBoxFee * 100) / 100;
                                const { error: delErr } = await supabase
                                  .from('race_registrations')
                                  .delete()
                                  .eq('race_id', race.id)
                                  .eq('player_id', player.id);
                                if (!delErr) {
                                  onAddEnergy(fee);
                                  await skemaBox.subtractFromBox(sbFee, 'official_refund');
                                  refreshRaces();
                                  setError(null);
                                } else {
                                  setError(delErr.message || 'Erro ao cancelar');
                                }
                              }}
                              variant="outline"
                              className="w-full text-red-400 border-red-500/30 hover:bg-red-500/10"
                            >
                              Cancelar Inscrição (+k${race.entryFee.toFixed(2)})
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-white/30">
                    <Crown className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhum torneio agendado no momento</p>
                  </div>
                )}
              </TabsContent>

              {/* ─── Treinar ─── */}
              <TabsContent value="practice" className="mt-3">
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 p-5 text-center space-y-4"
                >
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/20 mx-auto flex items-center justify-center">
                    <Brain className="w-8 h-8 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Treino Solo</h3>
                    <p className="text-sm text-white/60 mt-1">Pratique sem gastar energia. Sem prêmios, sem pressão.</p>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-xs text-white/50">
                    <span><Users className="w-3 h-3 inline mr-1" />Solo</span>
                    <span className="text-green-400 font-medium">Grátis</span>
                    <span><Clock className="w-3 h-3 inline mr-1" />3 min</span>
                  </div>
                  <Button
                    onClick={handleTraining}
                    disabled={isStarting}
                    className="w-full bg-blue-600 hover:bg-blue-500"
                    size="lg"
                  >
                    <Brain className="w-5 h-5 mr-2" />
                    Iniciar Treino
                  </Button>
                </motion.div>
              </TabsContent>
            </Tabs>
          </motion.section>

          {/* Cor de Geração (Criador sem cor escolhida) */}
          {['Criador', 'guardiao'].includes(player.playerTier) && !player.generationColor && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }} className="mx-4 mt-4">
              <GenerationColorPicker playerId={player.id} onColorChosen={() => onRefreshProfile()} />
            </motion.section>
          )}

          {/* Descendência (Criador+) */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mx-4 mt-4">
            <CreatorDescendancyPanel playerId={player.id} playerTier={player.playerTier} />
          </motion.section>

          {/* Convites */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.27 }} className="mx-4 mt-3">
            <ReferralHistoryPanel
              playerId={player.id}
              inviteCode={player.inviteCode}
              playerTier={player.playerTier}
              onProcessRewards={onProcessReferralRewards}
              onRefreshProfile={onRefreshProfile}
            />
          </motion.section>

          {/* Transferências */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.29 }} className="mx-4 mt-3">
            <TransferPanel
              playerId={player.id}
              playerName={player.name}
              playerTier={player.playerTier}
              energy={player.energy}
              referralsCount={player.referrals.length}
              onTransferComplete={onRefreshProfile}
            />
          </motion.section>

          {/* Extrato */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.31 }} className="mx-4 mt-3">
            <PlayerGameHistory playerId={player.id} />
          </motion.section>

          {/* Taxa */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.33 }} className="mx-4 mt-3 flex items-center gap-2 text-xs text-white/40">
            <AlertCircle className="w-3 h-3" />
            <span>Taxa de transferência: {(transferTax * 100).toFixed(2)}%</span>
          </motion.div>
          
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
      </div>
    </div>
  );
}
