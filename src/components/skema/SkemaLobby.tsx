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
  Rocket, Sparkles, Gift, Check,
  Calendar, Crown, AlertCircle, LogOut, Share2, UserCheck, PartyPopper
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SkemaPlayer, getSkemaHour } from '@/hooks/useSkemaPlayer';
import { useOfficialRace } from '@/hooks/useOfficialRace';
import { RegisteredPlayersPanel } from './RegisteredPlayersPanel';
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
  onStartParty: () => void;
  onDeductEnergy: (amount: number) => boolean;
  onAddEnergy: (amount: number) => void;
  onLogout: () => void;
}

type GameMode = 'training' | 'bots' | 'official' | 'party';

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
  onStartParty,
  onDeductEnergy,
  onAddEnergy,
  onLogout,
}: SkemaLobbyProps) {
  const officialRace = useOfficialRace();
  const skemaHour = getSkemaHour();
  
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Saldo do Skema Box (conta mãe) - usa state para atualizar em tempo real
  const [skemaBoxBalance, setSkemaBoxBalance] = useState(() => {
    const stored = localStorage.getItem('skema_box_balance');
    return stored ? parseFloat(stored) : 0;
  });
  
  // Atualiza o saldo do Skema Box quando o componente fica visível (volta ao lobby)
  useEffect(() => {
    const updateBalance = () => {
      const stored = localStorage.getItem('skema_box_balance');
      const newBalance = stored ? parseFloat(stored) : 0;
      setSkemaBoxBalance(newBalance);
      console.log('[SKEMA BOX] 📦 Saldo atualizado:', newBalance);
    };
    
    // Atualiza imediatamente
    updateBalance();
    
    // Também atualiza quando a janela ganha foco (volta de outra aba)
    window.addEventListener('focus', updateBalance);
    return () => window.removeEventListener('focus', updateBalance);
  }, []);

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
  const canAffordOfficial = officialRace.isLoaded ? player.energy >= officialRace.constants.entryFee : false;
  const isPlayerRegisteredInRace = officialRace.race ? officialRace.actions.isPlayerRegistered(player.id) : false;

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
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      console.error('Erro ao copiar:', e);
    }
  }, [inviteLink]);

  const handleSelectMode = useCallback((mode: GameMode) => {
    setSelectedMode(mode);
    setError(null);
  }, []);

  // Constantes do Arena x Bots
  const ARENA_ENTRY_FEE = 0.55; // Total: 0.50 pool + 0.05 rake
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
    } else if (selectedMode === 'party') {
      // Modo Festa: vai direto para setup sem countdown
      onStartParty();
      return;
    }
  }, [selectedMode, isStarting, canAffordOfficial, canAffordArena, onStartParty]);

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
        // Arena x Bots: k$0.50 pool + k$0.05 rake
        const result = onStartBotRace(0.50, 0.05);
        if (!result.success) {
          setError(result.error || 'Erro ao iniciar');
          setIsStarting(false);
          setCountdown(null);
        }
      } else if (selectedMode === 'official') {
        const { entryFee, prizePerPlayer, skemaBoxFee } = officialRace.constants;
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
                  <span>Ano {skemaYear} • Dia {skemaDay} • {String(skemaHour).padStart(2, '0')}h</span>
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
            {/* Skema Box - só Guardian vê */}
            {player.id === 'guardian-skema-universe' && (
              <div 
                className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg p-2 text-center border border-yellow-500/30 cursor-pointer hover:border-yellow-500/50 transition-colors"
                onClick={() => {
                  if (confirm('Zerar o Skema Box?')) {
                    localStorage.setItem('skema_box_balance', '0');
                    window.location.reload();
                  }
                }}
                title="Clique para zerar"
              >
                <div className="text-lg font-bold text-yellow-400">k${skemaBoxBalance.toFixed(2)}</div>
                <div className="text-xs text-yellow-400/70">Skema Box</div>
              </div>
            )}
          </div>
        </motion.header>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto pb-28">
          {/* Convite Geral SKEMA */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mx-4 mt-4"
          >
            <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Gift className="w-5 h-5 text-purple-400" />
                <span className="font-medium text-white">Convide para o SKEMA</span>
              </div>
              
              {/* Ancestralidade */}
              {player.invitedByName && (
                <div className="bg-black/20 rounded-lg p-2 mb-3 text-center">
                  <span className="text-xs text-white/50">Sua ancestralidade: </span>
                  <span className="text-sm text-purple-300 font-medium">🔗 {player.invitedByName}</span>
                </div>
              )}
              
              {/* Link geral com código SKEMA1 */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-xs text-blue-400 truncate">
                  {`${PUBLISHED_APP_ORIGIN}/?convite=SKEMA1`}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`${PUBLISHED_APP_ORIGIN}/?convite=SKEMA1`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="shrink-0 gap-1"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}
                  {copiedLink ? 'Copiado!' : 'Copiar'}
                </Button>
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
                    <p className="text-sm text-white/60 mt-1">Enfrente 9 bots IA • Prêmios top 3</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-white/50">
                      <span><Users className="w-3 h-3 inline mr-1" />10 jogadores</span>
                      <span><Trophy className="w-3 h-3 inline mr-1" />ITM: 1º 50% • 2º 30% • 3º 20%</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-green-400">Pool: k$5.00</span>
                      <span className="text-purple-400">Rake: k$0.05</span>
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
                      onClick={() => {
                        if (!canAffordOfficial) {
                          setError('Energia insuficiente para inscrição');
                          return;
                        }
                        
                        // Deduz energia PRIMEIRO
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
                          // Se falhou inscrição, devolve energia
                          onAddEnergy(officialRace.constants.entryFee);
                          setError(result.error || 'Erro ao inscrever');
                        }
                      }}
                      disabled={!canAffordOfficial}
                      className="w-full"
                      variant="default"
                    >
                      <UserCheck className="w-4 h-4 mr-2" />
                      Inscrever-se (k${officialRace.constants.entryFee.toFixed(2)})
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
                        <UserCheck className="w-5 h-5" />
                        <span className="font-medium">Você está inscrito!</span>
                      </div>
                      <Button
                        onClick={() => {
                          const result = officialRace.actions.unregisterPlayer(player.id);
                          if (result.success) {
                            // Devolve energia ao jogador
                            onAddEnergy(officialRace.constants.entryFee);
                            setError(null);
                          } else {
                            setError(result.error || 'Erro ao cancelar inscrição');
                          }
                        }}
                        variant="outline"
                        className="w-full text-red-400 border-red-500/30 hover:bg-red-500/10"
                      >
                        Cancelar Inscrição (+k${officialRace.constants.entryFee.toFixed(2)})
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
