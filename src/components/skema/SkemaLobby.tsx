/**
 * SkemaLobby - Hub principal do jogador SKEMA
 * 
 * Mostra:
 * - Perfil, energia, stats
 * - Convites compactos com links únicos
 * - Modos de jogo
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Trophy, Users, Clock, Brain, Swords, Target,
  Rocket, Sparkles, Gift, Check,
  Calendar, Crown, AlertCircle, LogOut, Copy, UserCheck, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkemaPlayer, getSkemaHour, PendingInvite } from '@/hooks/useSkemaPlayer';
import { useOfficialRace } from '@/hooks/useOfficialRace';
import universeBg from '@/assets/universe-bg.jpg';

interface SkemaLobbyProps {
  player: SkemaPlayer;
  skemaYear: number;
  skemaDay: number;
  remainingReferralRewards: number;
  transferTax: number;
  pendingInvites: PendingInvite[];
  onStartTraining: () => void;
  onStartBotRace: (buyIn: number, fee: number) => { success: boolean; error?: string };
  onStartOfficialRace: (raceId: string, buyIn: number, fee: number) => { success: boolean; error?: string };
  onDeductEnergy: (amount: number) => boolean;
  onAddEnergy: (amount: number) => void;
  onGenerateInvite: () => { success: boolean; code?: string; error?: string };
  onLogout: () => void;
}

type GameMode = 'training' | 'bots' | 'official';

const COUNTDOWN_SECONDS = 10;

export function SkemaLobby({
  player,
  skemaYear,
  skemaDay,
  remainingReferralRewards,
  transferTax,
  pendingInvites,
  onStartTraining,
  onStartBotRace,
  onStartOfficialRace,
  onDeductEnergy,
  onAddEnergy,
  onGenerateInvite,
  onLogout,
}: SkemaLobbyProps) {
  const officialRace = useOfficialRace();
  const skemaHour = getSkemaHour();
  
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const canAffordOfficial = officialRace.isLoaded ? player.energy >= officialRace.constants.entryFee : false;
  const isPlayerRegisteredInRace = officialRace.race ? officialRace.actions.isPlayerRegistered(player.id) : false;

  // Stats de convites
  const usedInvitesCount = pendingInvites.filter(p => p.used).length;
  const pendingUnused = pendingInvites.filter(p => !p.used);
  const lastPendingCode = pendingUnused.length > 0 ? pendingUnused[pendingUnused.length - 1].code : null;

  // Gera link de convite - SEMPRE usa domínio publicado para evitar login Lovable
  const PUBLISHED_ORIGIN = 'https://skemind-code-guess.lovable.app';
  
  const getInviteLink = useCallback((code: string) => {
    // IMPORTANTE: Links de convite DEVEM usar o domínio publicado.
    // Se usar preview, visitantes veem tela de login Google/GitHub do Lovable.
    // O código SKINV precisa ser gerado no mesmo domínio publicado para funcionar.
    return `${PUBLISHED_ORIGIN}/?convite=${encodeURIComponent(code)}`;
  }, []);

  const handleCopyInvite = useCallback(async (code: string) => {
    try {
      const link = getInviteLink(code);
      await navigator.clipboard.writeText(link);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (e) {
      console.error('Erro ao copiar:', e);
    }
  }, [getInviteLink]);

  const handleGenerateNewInvite = useCallback(() => {
    const result = onGenerateInvite();
    if (!result.success) {
      setError(result.error || 'Erro ao gerar convite');
    }
  }, [onGenerateInvite]);

  const handleSelectMode = useCallback((mode: GameMode) => {
    setSelectedMode(mode);
    setError(null);
  }, []);

  // Arena entry fee
  const ARENA_ENTRY_FEE = 0.55;
  const canAffordArena = player.energy >= ARENA_ENTRY_FEE;

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
    }
  }, [selectedMode, isStarting, canAffordOfficial, canAffordArena]);

  const handleCancelCountdown = useCallback(() => {
    setIsStarting(false);
    setCountdown(null);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown === null || countdown < 0) return;
    
    if (countdown === 0) {
      if (selectedMode === 'training') {
        onStartTraining();
      } else if (selectedMode === 'bots') {
        // Deduz entrada da arena antes de iniciar
        const deducted = onDeductEnergy(ARENA_ENTRY_FEE);
        if (!deducted) {
          setError('Falha ao deduzir energia');
          setIsStarting(false);
          setCountdown(null);
          return;
        }
        const result = onStartBotRace(ARENA_ENTRY_FEE, 0);
        if (!result.success) {
          onAddEnergy(ARENA_ENTRY_FEE); // Reembolsa
          setError(result.error || 'Erro ao iniciar');
          setIsStarting(false);
          setCountdown(null);
        }
      } else if (selectedMode === 'official') {
        const { prizePerPlayer, skemaBoxFee } = officialRace.constants;
        const result = onStartOfficialRace('official-race-2026-03-03', prizePerPlayer, skemaBoxFee);
        if (!result.success) {
          setError(result.error || 'Erro ao iniciar');
          setIsStarting(false);
          setCountdown(null);
        }
      }
      return;
    }
    
    const timer = setTimeout(() => {
      setCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown, selectedMode, onStartTraining, onStartBotRace, onStartOfficialRace, officialRace.constants]);

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
        {/* Header - Perfil */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 border-b border-white/10 backdrop-blur-sm bg-black/30"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-2xl">
                {player.emoji}
              </div>
              <div>
                <h1 className="text-base font-bold text-white">{player.name}</h1>
                <div className="flex items-center gap-1 text-xs text-white/60">
                  <Calendar className="w-3 h-3" />
                  <span>Ano {skemaYear} • Dia {skemaDay} • {skemaHour}h</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 px-3 py-1.5 rounded-full border border-yellow-500/50">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-bold text-yellow-400">k${player.energy.toFixed(2)}</span>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={onLogout}
                className="text-white/50 hover:text-white h-8 w-8"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Stats compactos */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 rounded-lg px-2 py-1.5 text-center">
              <div className="text-sm font-bold text-green-400">{player.stats.wins}</div>
              <div className="text-[10px] text-white/50">Vitórias</div>
            </div>
            <div className="bg-white/5 rounded-lg px-2 py-1.5 text-center">
              <div className="text-sm font-bold text-blue-400">{player.stats.races}</div>
              <div className="text-[10px] text-white/50">Corridas</div>
            </div>
            <div className="bg-white/5 rounded-lg px-2 py-1.5 text-center">
              <div className="text-sm font-bold text-purple-400">
                {player.stats.bestTime ? `${Math.floor(player.stats.bestTime / 60)}:${String(player.stats.bestTime % 60).padStart(2, '0')}` : '-'}
              </div>
              <div className="text-[10px] text-white/50">Melhor</div>
            </div>
          </div>
        </motion.header>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto pb-28">
          {/* Convites - UI Compacta */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-4 mt-4"
          >
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-3">
              {/* Header compacto */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-white">Convites</span>
                </div>
                <span className="text-xs text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full">
                  {usedInvitesCount}/10 usados • +k$10 cada
                </span>
              </div>
              
              {/* Código atual ou gerar novo */}
              <div className="flex items-center gap-2">
                {lastPendingCode ? (
                  <>
                    <div className="flex-1 bg-black/30 border border-white/20 rounded-lg px-3 py-2 font-mono text-sm text-primary tracking-wider">
                      {lastPendingCode}
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCopyInvite(lastPendingCode)}
                      className="shrink-0 h-9 px-3 touch-manipulation"
                    >
                      {copiedCode === lastPendingCode ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    {usedInvitesCount < 10 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleGenerateNewInvite}
                        className="shrink-0 h-9 px-2 text-purple-400 hover:text-purple-300"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    onClick={handleGenerateNewInvite}
                    className="w-full h-10"
                    variant="secondary"
                    disabled={usedInvitesCount >= 10}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Gerar Primeiro Convite
                  </Button>
                )}
              </div>
              
              {/* Histórico compacto */}
              {pendingInvites.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {pendingInvites.slice(-5).map((inv) => (
                    <span 
                      key={inv.code}
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        inv.used 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-white/10 text-white/50'
                      }`}
                    >
                      {inv.used ? `✓${inv.usedBy?.slice(0,6)}` : inv.code.slice(-4)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.section>
          
          {/* Taxa de transferência */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mx-4 mt-2 flex items-center gap-2 text-[10px] text-white/40"
          >
            <AlertCircle className="w-3 h-3" />
            <span>Taxa de transferência: {(transferTax * 100).toFixed(2)}%</span>
          </motion.div>
          
          {/* Modos de Jogo */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mx-4 mt-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-white/80">Escolha seu Modo</span>
            </div>
            
            <div className="space-y-2">
              {/* Treinar (Solo) */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectMode('training')}
                className={`
                  w-full text-left p-3 rounded-xl border transition-all touch-manipulation
                  ${selectedMode === 'training' 
                    ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border-primary/50 ring-2 ring-primary/30' 
                    : 'bg-white/5 border-white/10 active:bg-white/10'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-black/30 text-blue-400">
                    <Brain className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-sm">Treinar</h3>
                      <span className="text-xs font-medium text-green-400">Grátis</span>
                    </div>
                    <p className="text-xs text-white/60">Pratique sozinho</p>
                  </div>
                </div>
              </motion.button>
              
              {/* Arena x Bots - k$0.55 entrada */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectMode('bots')}
                className={`
                  w-full text-left p-3 rounded-xl border transition-all touch-manipulation
                  ${selectedMode === 'bots' 
                    ? 'bg-gradient-to-br from-orange-500/20 to-red-500/20 border-primary/50 ring-2 ring-primary/30' 
                    : 'bg-white/5 border-white/10 active:bg-white/10'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-black/30 text-orange-400">
                    <Swords className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-sm">Arena</h3>
                      <span className="text-xs font-medium text-yellow-400">k$0.55</span>
                    </div>
                    <p className="text-xs text-white/60">9 bots • Pote k$5 • Top 3 ITM</p>
                  </div>
                </div>
                {/* Info economia poker */}
                {selectedMode === 'bots' && (
                  <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-4 gap-1 text-center text-[10px]">
                    <div>
                      <div className="text-white/40">Entrada</div>
                      <div className="text-white font-medium">k$0.55</div>
                    </div>
                    <div>
                      <div className="text-white/40">1º</div>
                      <div className="text-green-400 font-medium">k$2.50</div>
                    </div>
                    <div>
                      <div className="text-white/40">2º</div>
                      <div className="text-blue-400 font-medium">k$1.50</div>
                    </div>
                    <div>
                      <div className="text-white/40">3º</div>
                      <div className="text-purple-400 font-medium">k$1.00</div>
                    </div>
                  </div>
                )}
              </motion.button>
              
              {/* Corrida Oficial */}
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSelectMode('official')}
                className={`
                  w-full text-left p-3 rounded-xl border transition-all touch-manipulation
                  ${selectedMode === 'official' 
                    ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-primary/50 ring-2 ring-primary/30' 
                    : 'bg-white/5 border-white/10 active:bg-white/10'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-black/30 text-yellow-400">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white text-sm">Corrida Oficial</h3>
                      <span className="text-xs font-medium text-yellow-400">
                        k${officialRace.constants.entryFee.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-white/60">{officialRace.formattedDate}</p>
                  </div>
                  {isPlayerRegisteredInRace && (
                    <div className="shrink-0">
                      <UserCheck className="w-4 h-4 text-green-400" />
                    </div>
                  )}
                </div>
              </motion.button>
            </div>
          </motion.section>
          
          {/* Detalhes da Corrida Oficial - FORA do AnimatePresence para fix mobile */}
          {selectedMode === 'official' && officialRace.race && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mx-4 mt-3"
            >
              <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-3">
                {/* Info compacta */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm font-bold text-white">{officialRace.race.name}</div>
                    <div className="text-xs text-white/60">{officialRace.formattedDate}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-white/50">Restante</div>
                    <div className="text-sm font-bold text-yellow-400">{officialRace.timeUntilRace}</div>
                  </div>
                </div>
                
                {/* Economia compacta */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  <div className="bg-black/30 rounded-lg p-1.5 text-center">
                    <div className="text-[10px] text-white/50">Entrada</div>
                    <div className="text-xs font-bold text-white">k${officialRace.constants.entryFee.toFixed(2)}</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-1.5 text-center">
                    <div className="text-[10px] text-white/50">Prêmio</div>
                    <div className="text-xs font-bold text-green-400">k${officialRace.constants.prizePerPlayer.toFixed(2)}</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-1.5 text-center">
                    <div className="text-[10px] text-white/50">Pote</div>
                    <div className="text-xs font-bold text-yellow-400">k${officialRace.prizePool.toFixed(2)}</div>
                  </div>
                </div>
                
                {/* Inscritos */}
                <div className="mb-3">
                  <div className="flex items-center gap-1 mb-1.5 text-xs text-white/60">
                    <Users className="w-3 h-3" />
                    <span>{officialRace.race.registeredPlayers.length} inscritos</span>
                  </div>
                  
                  {officialRace.race.registeredPlayers.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {officialRace.race.registeredPlayers.map((p) => (
                        <div 
                          key={p.id}
                          className={`
                            flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px]
                            ${p.id === player.id ? 'bg-green-500/20 border border-green-500/50 text-green-400' : 'bg-white/10 text-white/80'}
                          `}
                        >
                          <span>{p.emoji}</span>
                          <span>{p.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Botão de inscrição - GRANDE para mobile */}
                {!isPlayerRegisteredInRace ? (
                  <Button
                    onClick={() => {
                      if (!canAffordOfficial) {
                        setError('Energia insuficiente');
                        return;
                      }
                      
                      const deducted = onDeductEnergy(officialRace.constants.entryFee);
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
                        onAddEnergy(officialRace.constants.entryFee);
                        setError(result.error || 'Erro ao inscrever');
                      }
                    }}
                    disabled={!canAffordOfficial}
                    className="w-full h-12 text-base touch-manipulation"
                    variant="default"
                  >
                    <UserCheck className="w-5 h-5 mr-2" />
                    Inscrever-se (k${officialRace.constants.entryFee.toFixed(2)})
                  </Button>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                      <UserCheck className="w-4 h-4" />
                      <span>Inscrito!</span>
                    </div>
                    <Button
                      onClick={() => {
                        const result = officialRace.actions.unregisterPlayer(player.id);
                        if (result.success) {
                          onAddEnergy(officialRace.constants.entryFee);
                          setError(null);
                        } else {
                          setError(result.error || 'Erro ao cancelar');
                        }
                      }}
                      variant="outline"
                      className="w-full h-10 text-red-400 border-red-500/30 hover:bg-red-500/10 touch-manipulation"
                    >
                      Cancelar (+k${officialRace.constants.entryFee.toFixed(2)})
                    </Button>
                  </div>
                )}
              </div>
            </motion.section>
          )}
          
          {/* Erro */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mx-4 mt-3 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Botão fixo - GRANDE para mobile */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent z-20">
          <Button
            onClick={handleStartCountdown}
            disabled={
              !selectedMode || 
              isStarting || 
              (selectedMode === 'bots' && !canAffordArena) ||
              (selectedMode === 'official' && !isPlayerRegisteredInRace)
            }
            className="w-full h-14 text-lg font-bold touch-manipulation"
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
                {canAffordArena ? 'Entrar na Arena (k$0.55)' : 'Saldo insuficiente'}
              </>
            )}
            {selectedMode === 'official' && (
              <>
                <Crown className="w-5 h-5 mr-2" />
                Entrar na Corrida
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
