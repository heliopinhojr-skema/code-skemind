/**
 * Tournament - Página principal do modo torneio
 */

import { useCallback } from 'react';
import { useTournament } from '@/hooks/useTournament';
import { useGame } from '@/hooks/useGame';
import { TournamentLobby } from '@/components/tournament/TournamentLobby';
import { TournamentLeaderboard } from '@/components/tournament/TournamentLeaderboard';
import { StatsBar } from '@/components/game/StatsBar';
import { GameBoard } from '@/components/game/GameBoard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Coins } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Tournament() {
  const tournament = useTournament();
  const game = useGame();
  
  // Sincroniza resultado do jogo com torneio
  const handleGameEnd = useCallback(() => {
    if (game.state.status === 'won' || game.state.status === 'lost') {
      tournament.actions.updateHumanResult(
        game.state.status,
        game.state.attempts,
        game.state.score,
        game.state.timeRemaining
      );
      tournament.actions.finishTournament();
    }
  }, [game.state, tournament.actions]);
  
  // Inicia torneio e jogo juntos
  const handleStartTournament = useCallback(() => {
    const result = tournament.actions.startTournament();
    if (result.success) {
      game.actions.startGame();
    }
    return result;
  }, [tournament.actions, game.actions]);
  
  // Volta ao lobby
  const handleReturnToLobby = useCallback(() => {
    tournament.actions.returnToLobby();
    game.actions.newGame();
  }, [tournament.actions, game.actions]);
  
  // Lobby
  if (tournament.state.status === 'lobby') {
    return (
      <TournamentLobby
        players={tournament.state.players}
        credits={tournament.state.credits}
        entryFee={tournament.state.entryFee}
        prizePool={tournament.state.prizePool}
        onStart={handleStartTournament}
      />
    );
  }
  
  // Torneio em andamento ou finalizado
  const isFinished = tournament.state.status === 'finished';
  const humanResult = tournament.state.results.get(tournament.state.humanPlayerId);
  const didWinPrize = isFinished && humanResult && humanResult.rank <= 4;
  const prizeAmount = didWinPrize 
    ? Math.floor(tournament.state.prizePool * [0.5, 0.25, 0.15, 0.1][humanResult!.rank - 1])
    : 0;
  
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header com saldo */}
      <div className="bg-card border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="font-bold">Torneio</span>
        </div>
        <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-3 py-1 rounded-full border border-yellow-500/30">
          <Coins className="w-4 h-4 text-yellow-500" />
          <span className="font-bold">{tournament.state.credits.toLocaleString()} K$</span>
        </div>
      </div>
      
      <StatsBar 
        attempts={game.state.attempts} 
        maxAttempts={game.constants.MAX_ATTEMPTS} 
        gameStatus={game.state.status}
        score={game.state.score}
        timeRemaining={game.state.timeRemaining}
      />
      
      <main className="flex-1 overflow-hidden p-3">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3 max-w-5xl mx-auto">
          {/* Área do jogo */}
          <div className="overflow-y-auto">
            {isFinished ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full text-center p-6"
              >
                <Trophy className={`w-20 h-20 mb-4 ${didWinPrize ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                
                <h2 className="text-3xl font-bold mb-2">
                  {humanResult?.rank === 1 ? '🏆 Campeão!' :
                   humanResult?.rank === 2 ? '🥈 Vice-campeão!' :
                   humanResult?.rank === 3 ? '🥉 Terceiro lugar!' :
                   didWinPrize ? `${humanResult?.rank}º Lugar` :
                   'Torneio Encerrado'}
                </h2>
                
                <p className="text-muted-foreground mb-4">
                  {humanResult?.status === 'won' 
                    ? `Você quebrou o código em ${humanResult.attempts} tentativas!`
                    : 'Não foi dessa vez, tente novamente!'}
                </p>
                
                {didWinPrize && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-6 py-3 rounded-xl border border-yellow-500/30 mb-6"
                  >
                    <div className="text-sm text-muted-foreground">Prêmio</div>
                    <div className="text-3xl font-bold text-yellow-500">+{prizeAmount} K$</div>
                  </motion.div>
                )}
                
                <div className="text-lg mb-6">
                  Pontuação final: <span className="font-bold">{game.state.score.toLocaleString()}</span>
                </div>
                
                <Button 
                  onClick={handleReturnToLobby}
                  size="lg"
                  className="bg-gradient-to-r from-primary to-primary/80"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Voltar ao Lobby
                </Button>
              </motion.div>
            ) : (
              <GameBoard
                state={game.state}
                secretCode={game.secretCode}
                symbols={game.constants.SYMBOLS}
                onSelectSymbol={game.actions.selectSymbol}
                onClearSlot={game.actions.clearSlot}
                onSubmit={() => {
                  game.actions.submit();
                  // Verifica se jogo terminou após submit
                  setTimeout(handleGameEnd, 100);
                }}
                onNewGame={handleReturnToLobby}
                onStartGame={game.actions.startGame}
              />
            )}
          </div>
          
          {/* Leaderboard lateral */}
          <div className="hidden lg:block overflow-y-auto">
            <TournamentLeaderboard
              players={tournament.state.players}
              results={tournament.state.results}
              humanPlayerId={tournament.state.humanPlayerId}
              isFinished={isFinished}
            />
          </div>
        </div>
      </main>
      
      {/* Leaderboard mobile (compacto, fixo no bottom) */}
      <div className="lg:hidden border-t bg-card p-3">
        <TournamentLeaderboard
          players={tournament.state.players}
          results={tournament.state.results}
          humanPlayerId={tournament.state.humanPlayerId}
          isFinished={isFinished}
        />
      </div>
    </div>
  );
}
