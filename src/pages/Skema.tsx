/**
 * Skema - Página principal do universo SKEMA
 * 
 * Integra:
 * - Sistema de registro/convite
 * - Lobby com modos de jogo
 * - Treino solo e contra bots
 * - Economia de energia (localStorage)
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useSkemaPlayer } from '@/hooks/useSkemaPlayer';
import { useGame } from '@/hooks/useGame';
import { useTournament } from '@/hooks/useTournament';
import { RegistrationScreen } from '@/components/skema/RegistrationScreen';
import { SkemaLobby } from '@/components/skema/SkemaLobby';
import { GameBoard } from '@/components/game/GameBoard';
import { StatsBar } from '@/components/game/StatsBar';
import { RaceSummary } from '@/components/tournament/RaceSummary';
import { TournamentLeaderboard } from '@/components/tournament/TournamentLeaderboard';
import { CosmicBackground } from '@/components/CosmicBackground';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy } from 'lucide-react';
import { UI_SYMBOLS } from '@/hooks/useGame';

type SkemaView = 'lobby' | 'training' | 'bots' | 'official';

export default function Skema() {
  const { code: codeFromPath } = useParams<{ code?: string }>();
  
  // Captura código de convite da URL (path /convite/CODIGO ou query ?convite=CODIGO)
  const inviteCodeFromUrl = useMemo(() => {
    // Primeiro tenta via path param (mais confiável)
    if (codeFromPath) {
      return codeFromPath.toUpperCase();
    }
    // Fallback para query param
    const params = new URLSearchParams(window.location.search);
    const code = params.get('convite') || params.get('invite') || '';
    return code.toUpperCase();
  }, [codeFromPath]);
  
  const skemaPlayer = useSkemaPlayer();
  const game = useGame();
  const tournament = useTournament();
  
  const [currentView, setCurrentView] = useState<SkemaView>('lobby');
  const [gameMode, setGameMode] = useState<'training' | 'bots' | 'official'>('training');
  
  // Atualiza resultado do torneio quando jogo termina
  // MUST be before any conditional returns to follow Rules of Hooks
  useEffect(() => {
    if (currentView !== 'lobby' && (game.state.status === 'won' || game.state.status === 'lost')) {
      if (gameMode === 'bots' || gameMode === 'official') {
        tournament.actions.updateHumanResult(
          game.state.status,
          game.state.attempts,
          game.state.score,
          game.state.timeRemaining
        );
        tournament.actions.finishTournament();
      }
    }
  }, [game.state.status, currentView, gameMode, tournament.actions]);
  
  // Espera carregar localStorage
  if (!skemaPlayer.isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/50">Carregando...</div>
      </div>
    );
  }
  
  // Tela de registro se não estiver registrado
  if (!skemaPlayer.isRegistered || !skemaPlayer.player) {
    return (
      <RegistrationScreen
        onRegister={skemaPlayer.actions.register}
        onLogin={skemaPlayer.actions.login}
        validateCode={skemaPlayer.actions.validateInviteCode}
        initialInviteCode={inviteCodeFromUrl}
      />
    );
  }
  
  // Handlers para iniciar modos
  const handleStartTraining = () => {
    setGameMode('training');
    setCurrentView('training');
    game.actions.startGame();
  };
  
  const handleStartBotRace = (buyIn: number, fee: number): { success: boolean; error?: string } => {
    // Treinar x Bots é grátis
    setGameMode('bots');
    setCurrentView('bots');
    
    const result = tournament.actions.startTournament();
    if (result.success && result.humanSecretCode) {
      game.actions.startGameWithSecret(result.humanSecretCode);
    }
    
    return result;
  };
  
  const handleStartOfficialRace = (raceId: string, buyIn: number, fee: number): { success: boolean; error?: string } => {
    const total = buyIn + fee;
    
    if (skemaPlayer.player!.energy < total) {
      return { success: false, error: 'Energia insuficiente' };
    }
    
    // Deduz energia
    skemaPlayer.actions.deductEnergy(total);
    
    setGameMode('official');
    setCurrentView('official');
    
    const result = tournament.actions.startTournament();
    if (result.success && result.humanSecretCode) {
      game.actions.startGameWithSecret(result.humanSecretCode);
    }
    
    return result;
  };
  
  const handleBackToLobby = () => {
    // Atualiza stats do jogador
    if (game.state.status === 'won' || game.state.status === 'lost') {
      skemaPlayer.actions.updateStats({
        won: game.state.status === 'won',
        time: game.state.status === 'won' ? game.state.timeRemaining : undefined,
      });
    }
    
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
        skemaDay={skemaPlayer.skemaDay}
        remainingReferralRewards={skemaPlayer.remainingReferralRewards}
        transferTax={skemaPlayer.transferTax}
        pendingInvites={skemaPlayer.pendingInvites}
        onStartTraining={handleStartTraining}
        onStartBotRace={handleStartBotRace}
        onStartOfficialRace={handleStartOfficialRace}
        onDeductEnergy={skemaPlayer.actions.deductEnergy}
        onAddEnergy={skemaPlayer.actions.addEnergy}
        onGenerateInvite={skemaPlayer.actions.generatePendingInvite}
        onLogout={skemaPlayer.actions.logout}
      />
    );
  }
  
  // Jogo (Training ou Bots/Official)
  const isFinished = game.state.status === 'won' || game.state.status === 'lost';
  const humanResult = tournament.state.results.get(tournament.state.humanPlayerId);
  const symbolsById = new Map(UI_SYMBOLS.map(s => [s.id, s]));
  
  // Cálculo de prêmio para bots
  const prizeAmount = humanResult && humanResult.rank <= 4 && (gameMode === 'bots' || gameMode === 'official')
    ? Math.floor(tournament.state.prizePool * [0.5, 0.25, 0.15, 0.1][humanResult.rank - 1])
    : 0;
  
  return (
    <div className="min-h-screen relative">
      <CosmicBackground />
      
      <div className="relative z-10 min-h-screen">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-black/50 backdrop-blur-md border-b border-white/10 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToLobby}
              className="text-white/70 hover:text-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <span className="font-bold text-white">
                {gameMode === 'training' && 'Treino Solo'}
                {gameMode === 'bots' && 'Arena x Bots'}
                {gameMode === 'official' && 'Corrida Oficial'}
              </span>
            </div>
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
            {/* Área do jogo */}
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
                  />
                  
                  <Button
                    onClick={handleBackToLobby}
                    className="w-full"
                    size="lg"
                  >
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
            
            {/* Leaderboard (só para bots/official) */}
            {gameMode !== 'training' && (
              <div className="hidden lg:block">
                <TournamentLeaderboard
                  players={tournament.state.players}
                  results={tournament.state.results}
                  humanPlayerId={tournament.state.humanPlayerId}
                  isFinished={tournament.state.status === 'finished'}
                  symbolsById={symbolsById}
                />
              </div>
            )}
          </div>
          
          {/* Leaderboard mobile */}
          {gameMode !== 'training' && (
            <div className="lg:hidden mt-4 border-t border-white/10 bg-black/30 backdrop-blur-sm p-3 rounded-t-xl">
              <TournamentLeaderboard
                players={tournament.state.players}
                results={tournament.state.results}
                humanPlayerId={tournament.state.humanPlayerId}
                isFinished={tournament.state.status === 'finished'}
                symbolsById={symbolsById}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
