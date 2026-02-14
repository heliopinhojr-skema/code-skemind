/**
 * Skema - Página principal do universo SKEMA
 * 
 * Integra:
 * - Sistema de registro/convite
 * - Lobby com modos de jogo (PokerStars-style)
 * - Treino solo e contra bots (Sit & Go)
 * - Corridas Oficiais (Torneios agendados)
 * - Economia de energia (Cloud)
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSupabasePlayer } from '@/hooks/useSupabasePlayer';
import { useGame } from '@/hooks/useGame';
import { useTournament } from '@/hooks/useTournament';
import { useOnlinePlayers } from '@/hooks/useOnlinePlayers';
import { SkemaLobby } from '@/components/skema/SkemaLobby';
import { GameBoard } from '@/components/game/GameBoard';
import { StatsBar } from '@/components/game/StatsBar';
import { RaceSummary } from '@/components/tournament/RaceSummary';
import { TournamentLeaderboard } from '@/components/tournament/TournamentLeaderboard';
import { CosmicBackground } from '@/components/CosmicBackground';
import { Button } from '@/components/ui/button';
import { TermsAcceptanceGate } from '@/components/auth/TermsAcceptanceGate';
import { ArrowLeft, Trophy } from 'lucide-react';
import { UI_SYMBOLS } from '@/hooks/useGame';
import { useSkemaBox } from '@/hooks/useSkemaBox';
import { getArenaPrize, isITM, ITM_POSITIONS } from '@/lib/arenaPayouts';

type SkemaView = 'lobby' | 'training' | 'bots' | 'official';

export default function Skema() {
  const { code: codeFromPath } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  
  const [inviteCodeFromUrl, setInviteCodeFromUrl] = useState<string>(() => {
    if (codeFromPath) return codeFromPath.toUpperCase();
    const params = new URLSearchParams(window.location.search);
    const code = params.get('convite') || params.get('invite') || '';
    return code.toUpperCase();
  });
  
  useEffect(() => {
    if (codeFromPath) {
      setInviteCodeFromUrl(codeFromPath.toUpperCase());
    }
  }, [codeFromPath]);
  
  const skemaPlayer = useSupabasePlayer();
  const game = useGame();
  const tournament = useTournament();
  const skemaBox = useSkemaBox();
  
  const onlinePresence = useOnlinePlayers(
    skemaPlayer.player ? {
      id: skemaPlayer.player.id,
      name: skemaPlayer.player.name,
      emoji: skemaPlayer.player.emoji,
      mood: skemaPlayer.player.mood,
    } : null
  );
  
  const [currentView, setCurrentView] = useState<SkemaView>('lobby');
  const [gameMode, setGameMode] = useState<'training' | 'bots' | 'official'>('training');
  const [showSessionConflict, setShowSessionConflict] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  
  // Detecta conflito de sessão
  useEffect(() => {
    if (showSessionConflict) return;
    if (skemaPlayer.isLoaded && skemaPlayer.isRegistered && skemaPlayer.player && inviteCodeFromUrl) {
      const currentPlayerInvite = skemaPlayer.player.inviteCode;
      if (inviteCodeFromUrl !== currentPlayerInvite && inviteCodeFromUrl.length > 0) {
        setShowSessionConflict(true);
        setPendingInviteCode(inviteCodeFromUrl);
      }
    }
  }, [skemaPlayer.isLoaded, skemaPlayer.isRegistered, skemaPlayer.player, inviteCodeFromUrl, showSessionConflict]);
  
  // Atualiza resultado do torneio quando jogo termina
  useEffect(() => {
    if (currentView !== 'lobby' && 
        (game.state.status === 'won' || game.state.status === 'lost') &&
        tournament.state.status === 'playing') {
      if (gameMode === 'bots' || gameMode === 'official') {
        tournament.actions.updateHumanResult(
          game.state.status,
          game.state.attempts,
          game.state.score,
          game.state.timeRemaining
        );
        tournament.actions.finishTournament({
          status: game.state.status,
          attempts: game.state.attempts,
          score: game.state.score,
          timeRemaining: game.state.timeRemaining,
        });
      }
    }
  }, [game.state.status, currentView, gameMode, tournament.state.status, tournament.actions]);
  
  // Loading states
  if (!skemaPlayer.isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/50">Carregando...</div>
      </div>
    );
  }
  
  if (!skemaPlayer.isRegistered || !skemaPlayer.player) {
    if (skemaPlayer.isLoading) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-white/50 animate-pulse">Carregando perfil...</div>
        </div>
      );
    }
    const authUrl = inviteCodeFromUrl ? `/auth?convite=${inviteCodeFromUrl}` : '/auth';
    navigate(authUrl, { replace: true });
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/50">Redirecionando para login...</div>
      </div>
    );
  }
  
  // Tela de conflito de sessão
  if (showSessionConflict && pendingInviteCode) {
    const handleContinueAsCurrentUser = () => {
      setShowSessionConflict(false);
      setPendingInviteCode(null);
      setInviteCodeFromUrl('');
      navigate('/', { replace: true });
    };
    
    const handleLogoutAndUseInvite = () => {
      setShowSessionConflict(false);
      skemaPlayer.actions.logout();
    };
    
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <CosmicBackground />
        <div className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 max-w-md w-full text-center space-y-6">
          <div className="text-5xl">⚠️</div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">Sessão Ativa</h2>
            <p className="text-white/70">
              Você já está logado como <span className="font-bold text-white">{skemaPlayer.player.emoji} {skemaPlayer.player.name}</span>.
            </p>
            <p className="text-white/50 text-sm mt-2">
              Esse link é um convite para novos jogadores.
            </p>
          </div>
          <div className="space-y-3">
            <Button onClick={handleContinueAsCurrentUser} className="w-full" size="lg">
              Continuar como {skemaPlayer.player.name}
            </Button>
            <Button onClick={handleLogoutAndUseInvite} variant="outline" className="w-full border-white/20 text-white hover:bg-white/10" size="lg">
              Sair e usar convite
            </Button>
          </div>
          <p className="text-white/40 text-xs">Código do convite: {pendingInviteCode}</p>
        </div>
      </div>
    );
  }

  // === TERMS ACCEPTANCE GATE ===
  if (skemaPlayer.isLoaded && skemaPlayer.isRegistered && skemaPlayer.player && !skemaPlayer.player.termsAcceptedAt) {
    return (
      <TermsAcceptanceGate
        playerId={skemaPlayer.player.id}
        playerName={skemaPlayer.player.name}
        onAccepted={() => {
          skemaPlayer.actions.refreshProfile?.();
        }}
      />
    );
  }
  
  // Handlers
  const handleStartTraining = () => {
    setGameMode('training');
    setCurrentView('training');
    game.actions.startGame();
  };
  
  const handleStartBotRace = async (buyIn: number, fee: number, botCount?: number): Promise<{ success: boolean; error?: string }> => {
    setGameMode('bots');
    setCurrentView('bots');
    
    const arenaConfig = botCount !== undefined
      ? { buyIn, rakeFee: fee, botCount }
      : undefined;
    
    const result = await tournament.actions.startTournament(arenaConfig);
    
    if (result.success && result.humanSecretCode) {
      game.actions.startGameWithSecret(result.humanSecretCode);
      skemaPlayer.actions.refreshProfile?.();
    } else {
      setCurrentView('lobby');
    }
    
    return { success: result.success, error: result.error };
  };
  
  const handleStartOfficialRace = async (raceId: string, buyIn: number, fee: number): Promise<{ success: boolean; error?: string }> => {
    setGameMode('official');
    setCurrentView('official');
    
    const result = await tournament.actions.startTournament();
    if (result.success && result.humanSecretCode) {
      game.actions.startGameWithSecret(result.humanSecretCode);
    }
    
    return { success: result.success, error: result.error };
  };

  const handleBackToLobby = () => {
    if (game.state.status === 'won' || game.state.status === 'lost') {
      if (gameMode === 'bots') {
        skemaPlayer.actions.refreshProfile?.();
      } else {
        skemaPlayer.actions.updateStats({
          won: game.state.status === 'won',
          time: game.state.status === 'won' ? game.state.timeRemaining : undefined,
        });
      }
    }
    
    onlinePresence.updateStatus('online');
    setCurrentView('lobby');
    game.actions.newGame();
    tournament.actions.returnToLobby();
  };
  
  // Lobby
  if (currentView === 'lobby') {
    return (
      <SkemaLobby
        player={skemaPlayer.player}
        skemaYear={skemaPlayer.skemaYear}
        skemaMonth={skemaPlayer.skemaMonth}
        skemaDay={skemaPlayer.skemaDay}
        remainingReferralRewards={skemaPlayer.remainingReferralRewards}
        transferTax={skemaPlayer.transferTax}
        onStartTraining={handleStartTraining}
        onStartBotRace={handleStartBotRace}
        onStartOfficialRace={handleStartOfficialRace}
        onDeductEnergy={skemaPlayer.actions.deductEnergy}
        onAddEnergy={skemaPlayer.actions.addEnergy}
        onLogout={skemaPlayer.actions.logout}
        onlinePresence={onlinePresence}
        onProcessReferralRewards={skemaPlayer.actions.processReferralRewards}
        onRefreshProfile={skemaPlayer.actions.refreshProfile}
        skemaBox={skemaBox}
      />
    );
  }
  
  // Jogo (Training ou Bots/Official)
  const isFinished = game.state.status === 'won' || game.state.status === 'lost';
  const humanResult = tournament.state.results.get(tournament.state.humanPlayerId);
  const symbolsById = new Map(UI_SYMBOLS.map(s => [s.id, s]));
  
  let prizeAmount = 0;
  if (humanResult && (gameMode === 'bots' || gameMode === 'official')) {
    if (gameMode === 'bots' && isITM(humanResult.rank)) {
      prizeAmount = getArenaPrize(humanResult.rank);
    } else if (gameMode === 'official' && humanResult.rank <= 4) {
      prizeAmount = Math.floor(tournament.state.prizePool * [0.5, 0.25, 0.15, 0.1][humanResult.rank - 1]);
    }
  }
  
  return (
    <div className="min-h-screen relative">
      <CosmicBackground />
      
      <div className="relative z-10 min-h-screen">
        <div className="sticky top-0 z-20 bg-black/50 backdrop-blur-md border-b border-white/10 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBackToLobby} className="text-white/70 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <span className="font-bold text-white">
              {gameMode === 'training' && 'Treino Solo'}
              {gameMode === 'bots' && 'Arena x Bots'}
              {gameMode === 'official' && 'Corrida Oficial'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white/50">{skemaPlayer.player.emoji}</span>
            <span className="text-white">{skemaPlayer.player.name}</span>
          </div>
        </div>
        
        <StatsBar
          attempts={game.state.attempts}
          maxAttempts={game.constants.MAX_ATTEMPTS}
          gameStatus={game.state.status}
          score={game.state.score}
          timeRemaining={game.state.timeRemaining}
        />
        
        <main className="p-3 pb-6">
          <div className={`grid gap-3 max-w-6xl mx-auto ${gameMode !== 'training' ? 'grid-cols-1 lg:grid-cols-[1fr_360px]' : ''}`}>
            <div>
              {isFinished && gameMode !== 'training' && humanResult ? (
                <div className="space-y-4">
                  <RaceSummary
                    humanResult={humanResult}
                    humanSecretCode={humanResult.secretCode || []}
                    players={tournament.state.players}
                    results={tournament.state.results}
                    totalPlayers={tournament.state.players.length}
                    prizeAmount={prizeAmount}
                    symbolsById={symbolsById}
                    arenaPool={tournament.state.prizePool}
                  />
                  <Button onClick={handleBackToLobby} className="w-full" size="lg">
                    <Trophy className="w-5 h-5 mr-2" />
                    Voltar ao Lobby
                  </Button>
                </div>
              ) : (
                <GameBoard
                  state={game.state}
                  secretCode={game.secretCode}
                  symbols={game.constants.SYMBOLS}
                  onSelectSymbol={game.actions.selectSymbol}
                  onClearSlot={game.actions.clearSlot}
                  onSubmit={game.actions.submit}
                  onNewGame={handleBackToLobby}
                  onStartGame={game.actions.startGame}
                />
              )}
            </div>
            
            {gameMode !== 'training' && (
              <div className="hidden lg:block">
                <TournamentLeaderboard
                  players={tournament.state.players}
                  results={tournament.state.results}
                  humanPlayerId={tournament.state.humanPlayerId}
                  isFinished={tournament.state.status === 'finished'}
                  symbolsById={symbolsById}
                  arenaPool={tournament.state.prizePool}
                />
              </div>
            )}
          </div>
          
          {gameMode !== 'training' && (
            <div className="lg:hidden mt-4 border-t border-white/10 bg-black/30 backdrop-blur-sm p-3 rounded-t-xl">
              <TournamentLeaderboard
                players={tournament.state.players}
                results={tournament.state.results}
                humanPlayerId={tournament.state.humanPlayerId}
                isFinished={tournament.state.status === 'finished'}
                symbolsById={symbolsById}
                arenaPool={tournament.state.prizePool}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
