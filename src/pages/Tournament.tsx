/**
 * Tournament - Página principal do modo torneio
 * 
 * Cada jogador (humano + bots) joga com seu próprio código secreto.
 * Ranking baseado em: vitória > tentativas > score > tempo
 */

import { useCallback, useEffect } from 'react';
import { useTournament } from '@/hooks/useTournament';
import type { ArenaConfig } from '@/components/tournament/TournamentLobby';
import { useGame, UI_SYMBOLS } from '@/hooks/useGame';
import { TournamentLobby } from '@/components/tournament/TournamentLobby';
import { TournamentLeaderboard } from '@/components/tournament/TournamentLeaderboard';
import { RaceSummary } from '@/components/tournament/RaceSummary';
import { StatsBar } from '@/components/game/StatsBar';
import { GameBoard } from '@/components/game/GameBoard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Coins } from 'lucide-react';
import { CosmicBackground } from '@/components/CosmicBackground';
import { getScaledArenaPrize, isITM } from '@/lib/arenaPayouts';

export default function Tournament() {
  const tournament = useTournament();
  const game = useGame();
  
  // Quando o jogo termina, atualiza resultado no torneio
  useEffect(() => {
    if (tournament.state.status === 'playing' && 
        (game.state.status === 'won' || game.state.status === 'lost')) {
      tournament.actions.updateHumanResult(
        game.state.status,
        game.state.attempts,
        game.state.score,
        game.state.timeRemaining
      );
      // Passa dados diretamente para evitar bug de React 18 batching
      tournament.actions.finishTournament({
        status: game.state.status,
        attempts: game.state.attempts,
        score: game.state.score,
        timeRemaining: game.state.timeRemaining,
      });
    }
  }, [game.state.status, game.state.attempts, game.state.score, game.state.timeRemaining, tournament.state.status, tournament.actions]);
  
  // Inicia torneio - passa código secreto do humano para o jogo
  const handleStartTournament = useCallback(async (arenaConfig?: ArenaConfig) => {
    const result = await tournament.actions.startTournament(arenaConfig);
    if (result.success && result.humanSecretCode) {
      game.actions.startGameWithSecret(result.humanSecretCode);
    }
    return result;
  }, [tournament.actions, game.actions]);
  
  const handleReturnToLobby = useCallback(() => {
    tournament.actions.returnToLobby();
    game.actions.newGame();
  }, [tournament.actions, game.actions]);
  
  // Lobby
  if (tournament.state.status === 'lobby') {
    return (
      <TournamentLobby
        players={tournament.state.players}
        credits={0}
        entryFee={tournament.state.entryFee}
        prizePool={tournament.state.prizePool}
        onStart={handleStartTournament}
      />
    );
  }
  
  const isFinished = tournament.state.status === 'finished';
  const humanResult = tournament.state.results.get(tournament.state.humanPlayerId);
  const prizeAmount = isFinished && humanResult && isITM(humanResult.rank)
    ? getScaledArenaPrize(humanResult.rank, tournament.state.prizePool)
    : 0;
  
  // Mapa de símbolos para exibição
  const symbolsById = new Map(UI_SYMBOLS.map(s => [s.id, s]));
  
  return (
    <div className="min-h-screen relative">
      {/* Persistent cosmic background */}
      <CosmicBackground />
      
      {/* Main content - scrollable */}
      <div className="relative z-10 min-h-screen">
        {/* Header com saldo */}
        <div className="sticky top-0 z-20 bg-black/50 backdrop-blur-md border-b border-white/10 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <span className="font-bold text-white">Torneio</span>
          </div>
          <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-3 py-1 rounded-full border border-yellow-500/30">
            <Coins className="w-4 h-4 text-yellow-500" />
            <span className="font-bold text-yellow-400">Arena</span>
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
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 max-w-6xl mx-auto">
          {/* Área do jogo */}
          <div>
            {isFinished && humanResult ? (
              <div className="space-y-4">
                <RaceSummary
                  humanResult={humanResult}
                  humanSecretCode={tournament.state.humanSecretCode}
                  players={tournament.state.players}
                  results={tournament.state.results}
                  symbolsById={symbolsById}
                  prizeAmount={prizeAmount}
                  totalPlayers={tournament.state.players.length}
                  arenaPool={tournament.state.prizePool}
                />
                
                <Button 
                  onClick={handleReturnToLobby}
                  size="lg"
                  className="w-full bg-gradient-to-r from-primary to-primary/80"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
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
                onNewGame={handleReturnToLobby}
                onStartGame={game.actions.startGame}
              />
            )}
          </div>
          
          {/* Leaderboard lateral desktop */}
          <div className="hidden lg:block">
            <TournamentLeaderboard
              players={tournament.state.players}
              results={tournament.state.results}
              humanPlayerId={tournament.state.humanPlayerId}
              isFinished={isFinished}
              symbolsById={symbolsById}
            />
          </div>
        </div>
        
        {/* Leaderboard mobile */}
        <div className="lg:hidden mt-4 border-t border-white/10 bg-black/30 backdrop-blur-sm p-3 rounded-t-xl">
          <TournamentLeaderboard
            players={tournament.state.players}
            results={tournament.state.results}
            humanPlayerId={tournament.state.humanPlayerId}
            isFinished={isFinished}
            symbolsById={symbolsById}
          />
        </div>
        </main>
      </div>
    </div>
  );
}
