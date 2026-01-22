/**
 * Tournament - Página principal do modo torneio
 * 
 * Cada jogador (humano + bots) joga com seu próprio código secreto.
 * Ranking baseado em: vitória > tentativas > score > tempo
 */

import { useCallback, useEffect } from 'react';
import { useTournament } from '@/hooks/useTournament';
import { useGame, UI_SYMBOLS } from '@/hooks/useGame';
import { TournamentLobby } from '@/components/tournament/TournamentLobby';
import { TournamentLeaderboard } from '@/components/tournament/TournamentLeaderboard';
import { StatsBar } from '@/components/game/StatsBar';
import { GameBoard } from '@/components/game/GameBoard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Coins, Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { Symbol } from '@/components/game/Symbol';

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
      tournament.actions.finishTournament();
    }
  }, [game.state.status, game.state.attempts, game.state.score, game.state.timeRemaining, tournament.state.status, tournament.actions]);
  
  // Inicia torneio - passa código secreto do humano para o jogo
  const handleStartTournament = useCallback(() => {
    const result = tournament.actions.startTournament();
    if (result.success && result.humanSecretCode) {
      // Inicia jogo com o código secreto gerado pelo torneio
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
        credits={tournament.state.credits}
        entryFee={tournament.state.entryFee}
        prizePool={tournament.state.prizePool}
        onStart={handleStartTournament}
      />
    );
  }
  
  const isFinished = tournament.state.status === 'finished';
  const humanResult = tournament.state.results.get(tournament.state.humanPlayerId);
  const didWinPrize = isFinished && humanResult && humanResult.rank <= 4;
  const prizeAmount = didWinPrize 
    ? Math.floor(tournament.state.prizePool * [0.5, 0.25, 0.15, 0.1][humanResult!.rank - 1])
    : 0;
  
  // Mapa de símbolos para exibição
  const symbolsById = new Map(UI_SYMBOLS.map(s => [s.id, s]));
  
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
        <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3 max-w-6xl mx-auto">
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
                
                {/* Mostra seu código secreto */}
                <div className="mb-4 p-3 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Eye className="w-4 h-4" />
                    <span>Seu código era:</span>
                  </div>
                  <div className="flex gap-2 justify-center">
                    {tournament.state.humanSecretCode.map((id, i) => {
                      const symbol = symbolsById.get(id);
                      return symbol ? (
                        <div key={i} className="w-10 h-10 rounded-lg bg-background border flex items-center justify-center">
                          <Symbol symbol={symbol} size="sm" />
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
                
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
                onSubmit={game.actions.submit}
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
              symbolsById={symbolsById}
            />
          </div>
        </div>
      </main>
      
      {/* Leaderboard mobile */}
      <div className="lg:hidden border-t bg-card p-3">
        <TournamentLeaderboard
          players={tournament.state.players}
          results={tournament.state.results}
          humanPlayerId={tournament.state.humanPlayerId}
          isFinished={isFinished}
          symbolsById={symbolsById}
        />
      </div>
    </div>
  );
}
