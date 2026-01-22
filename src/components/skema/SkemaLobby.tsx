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
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Trophy, Users, Clock, Brain, Swords, Target,
  Rocket, Timer, Sparkles, Gift, Copy, Check,
  Calendar, Crown, Lock, AlertCircle, LogOut, Share2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkemaPlayer } from '@/hooks/useSkemaPlayer';
import { useRaceSchedule, BuyInOption } from '@/hooks/useRaceSchedule';
import universeBg from '@/assets/universe-bg.jpg';

interface SkemaLobbyProps {
  player: SkemaPlayer;
  skemaYear: number;
  skemaDay: number;
  remainingReferralRewards: number;
  transferTax: number;
  onStartTraining: () => void;
  onStartBotRace: (buyIn: number, fee: number) => { success: boolean; error?: string };
  onStartOfficialRace: (raceId: string, buyIn: number, fee: number) => { success: boolean; error?: string };
  onLogout: () => void;
}

type GameMode = 'training' | 'bots' | 'official';

const COUNTDOWN_SECONDS = 10;
// URL pública (publicada) do app para convites — evita link de preview/sandbox que pode pedir login.
const PUBLISHED_APP_ORIGIN = 'https://skemind-code-guess.lovable.app';

export function SkemaLobby({
  player,
  skemaYear,
  skemaDay,
  remainingReferralRewards,
  transferTax,
  onStartTraining,
  onStartBotRace,
  onStartOfficialRace,
  onLogout,
}: SkemaLobbyProps) {
  const raceSchedule = useRaceSchedule();
  
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [selectedBuyIn, setSelectedBuyIn] = useState<BuyInOption | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
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

  const canAffordBots = player.energy >= 0; // Treinar x Bots é grátis
  const canAffordOfficial = (buyIn: BuyInOption) => player.energy >= buyIn.total;

  // Gera link de convite (usa a HOME com query param para evitar 404/login em links profundos)
  // Ex.: https://.../?convite=SEUCODIGO
  const inviteLink = useMemo(() => {
    const origin = window.location.origin;

    // Qualquer domínio de preview/sandbox do Lovable pode exigir login. Para convites, sempre use o publicado.
    const isLovablePreview =
      origin.includes('lovableproject.com') ||
      origin.includes('id-preview--') ||
      origin.includes('lovable.app');

    // Se você tiver um domínio próprio no futuro, pode trocar esta regra.
    const baseUrl = isLovablePreview ? PUBLISHED_APP_ORIGIN : origin;

    const code = encodeURIComponent(player.inviteCode);
    return `${baseUrl}/?convite=${code}`;
  }, [player.inviteCode]);

  const handleCopyInviteCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(player.inviteCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      console.error('Erro ao copiar:', e);
    }
  }, [player.inviteCode]);

  const handleCopyInviteLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      console.error('Erro ao copiar:', e);
    }
  }, [inviteLink]);

  const handleSelectMode = useCallback((mode: GameMode) => {
    setSelectedMode(mode);
    setSelectedBuyIn(null);
    setError(null);
  }, []);

  const handleStartCountdown = useCallback(() => {
    if (isStarting) return;
    
    if (selectedMode === 'training') {
      setIsStarting(true);
      setCountdown(COUNTDOWN_SECONDS);
    } else if (selectedMode === 'bots') {
      setIsStarting(true);
      setCountdown(COUNTDOWN_SECONDS);
    } else if (selectedMode === 'official' && selectedBuyIn) {
      if (!canAffordOfficial(selectedBuyIn)) {
        setError('Energia insuficiente');
        return;
      }
      setIsStarting(true);
      setCountdown(COUNTDOWN_SECONDS);
    }
  }, [selectedMode, selectedBuyIn, isStarting]);

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
        const result = onStartBotRace(0, 0);
        if (!result.success) {
          setError(result.error || 'Erro ao iniciar');
          setIsStarting(false);
          setCountdown(null);
        }
      } else if (selectedMode === 'official' && selectedBuyIn) {
        const result = onStartOfficialRace('race-1', selectedBuyIn.buyIn, selectedBuyIn.fee);
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
  }, [countdown, selectedMode, selectedBuyIn, onStartTraining, onStartBotRace, onStartOfficialRace]);

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
                <h1 className="text-lg font-bold text-white">{player.name}</h1>
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Calendar className="w-3 h-3" />
                  <span>Ano {skemaYear} • Dia {skemaDay}</span>
                </div>
                {player.invitedByName && (
                  <div className="text-xs text-purple-300 mt-0.5">
                    🔗 Convidado por <span className="font-medium">{player.invitedByName}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <motion.div 
                className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 px-4 py-2 rounded-full border border-yellow-500/50"
                whileHover={{ scale: 1.05 }}
              >
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="font-bold text-yellow-400">k${player.energy.toFixed(2)}</span>
              </motion.div>
              
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
          <div className="grid grid-cols-3 gap-2">
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
          </div>
        </motion.header>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto pb-28">
          {/* Missão de Convites */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-4 mt-4"
          >
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-purple-400" />
                  <span className="font-medium text-white">Missão: Convide Amigos</span>
                </div>
                <span className="text-sm text-purple-300">
                  {10 - remainingReferralRewards}/10 convites
                </span>
              </div>
              
              <p className="text-sm text-white/60 mb-3">
                Ganhe +k$10 para cada amigo que entrar com seu link!
              </p>
              
              {/* Link de convite */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-xs text-white/70 truncate">
                  {inviteLink}
                </div>
                <Button
                  variant="secondary"
                  size="icon"
                  onClick={handleCopyInviteLink}
                  className="shrink-0"
                  title="Copiar link"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              
              {/* Botão WhatsApp destacado */}
              <Button
                className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-medium"
                onClick={() => {
                  const msg = `🎮 Bora jogar SKEMA comigo!\n\n👉 ${inviteLink}\n\n📋 Código: ${player.inviteCode}`;
                  const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                  window.open(url, '_blank');
                }}
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 mr-2 fill-current">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Convidar via WhatsApp
              </Button>
              
              {/* Código alternativo para copiar manual */}
              <div className="text-xs text-white/40 text-center mt-2">
                Código: <button onClick={handleCopyInviteCode} className="font-mono text-white/60 hover:text-white underline">{player.inviteCode}</button>
              </div>
            </div>
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
              
              {/* Treinar x Bots */}
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
                      <h3 className="font-bold text-white">Treinar x Bots</h3>
                      <span className="text-sm font-medium text-green-400">Grátis</span>
                    </div>
                    <p className="text-sm text-white/60 mt-1">Enfrente 9 bots IA em mesa de 10</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                      <span><Users className="w-3 h-3 inline mr-1" />10 jogadores</span>
                      <span><Clock className="w-3 h-3 inline mr-1" />24h disponível</span>
                    </div>
                  </div>
                </div>
              </motion.button>
              
              {/* Corridas Oficiais */}
              <motion.button
                whileHover={{ scale: raceSchedule.isRaceTime ? 1.01 : 1 }}
                onClick={() => raceSchedule.isRaceTime && handleSelectMode('official')}
                disabled={!raceSchedule.isRaceTime}
                className={`
                  w-full text-left p-4 rounded-2xl border transition-all
                  ${selectedMode === 'official' 
                    ? 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-primary/50 ring-2 ring-primary/30' 
                    : 'bg-white/5 border-white/10'
                  }
                  ${!raceSchedule.isRaceTime ? 'opacity-60' : 'hover:bg-white/10'}
                `}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-black/30 ${raceSchedule.isRaceTime ? 'text-yellow-400' : 'text-white/40'}`}>
                    {raceSchedule.isRaceTime ? <Crown className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-white">Corridas Oficiais</h3>
                      {raceSchedule.isRaceTime ? (
                        <span className="text-sm font-medium text-green-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                          ABERTO
                        </span>
                      ) : (
                        <span className="text-sm text-white/40">
                          Abre em {raceSchedule.raceHoursIn}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/60 mt-1">Competição real com jogadores de verdade</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                      <span><Users className="w-3 h-3 inline mr-1" />2-16 jogadores</span>
                      <span><Clock className="w-3 h-3 inline mr-1" />{raceSchedule.raceScheduleText}</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            </div>
          </motion.section>
          
          {/* Opções de Buy-in (Corridas Oficiais) */}
          <AnimatePresence>
            {selectedMode === 'official' && raceSchedule.isRaceTime && (
              <motion.section
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mx-4 mt-4 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span className="text-sm font-medium text-white/80">Escolha o Buy-in</span>
                </div>
                
                <div className="space-y-2">
                  {raceSchedule.buyInOptions.map((option) => {
                    const canAfford = canAffordOfficial(option);
                    const isSelected = selectedBuyIn?.total === option.total;
                    
                    return (
                      <motion.button
                        key={option.total}
                        whileHover={canAfford ? { scale: 1.01 } : {}}
                        onClick={() => canAfford && setSelectedBuyIn(option)}
                        disabled={!canAfford}
                        className={`
                          w-full text-left p-3 rounded-xl border transition-all
                          ${isSelected 
                            ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50' 
                            : 'bg-white/5 border-white/10'
                          }
                          ${!canAfford ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/10'}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">k${option.buyIn.toFixed(2)}</span>
                              <span className="text-xs text-white/40">+ k${option.fee.toFixed(2)} fee</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-green-400">Prêmio: {option.prize}</div>
                            <div className="text-xs text-white/40">Total: k${option.total.toFixed(2)}</div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
                
                {/* Próximas corridas */}
                {raceSchedule.upcomingRaces.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs text-white/50 mb-2">Próxima corrida em: {raceSchedule.nextRaceIn}</div>
                  </div>
                )}
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
            disabled={!selectedMode || isStarting || (selectedMode === 'official' && !selectedBuyIn)}
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
