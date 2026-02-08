/**
 * Skema - Página principal do universo SKEMA
 * 
 * Integra:
 * - Sistema de registro/convite
 * - Lobby com modos de jogo
 * - Treino solo e contra bots
 * - Modo Festa (torneio presencial)
 * - Economia de energia (localStorage)
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSupabasePlayer } from '@/hooks/useSupabasePlayer';
import { useGame } from '@/hooks/useGame';
import { useTournament } from '@/hooks/useTournament';
import { usePartyTournament } from '@/hooks/usePartyTournament';
import { useOnlinePlayers } from '@/hooks/useOnlinePlayers';
// RegistrationScreen removed - now using /auth page
import { SkemaLobby } from '@/components/skema/SkemaLobby';
import { GameBoard } from '@/components/game/GameBoard';
import { StatsBar } from '@/components/game/StatsBar';
import { RaceSummary } from '@/components/tournament/RaceSummary';
import { TournamentLeaderboard } from '@/components/tournament/TournamentLeaderboard';
import { PartySetup } from '@/components/party/PartySetup';
import { PartyCollect } from '@/components/party/PartyCollect';
import { PartyResults } from '@/components/party/PartyResults';
import { CosmicBackground } from '@/components/CosmicBackground';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy } from 'lucide-react';
import { UI_SYMBOLS } from '@/hooks/useGame';
// Currency math now uses inline cents arithmetic (see handleStartBotRace)
import { useSkemaBox } from '@/hooks/useSkemaBox';
import { getArenaPrize, isITM, ITM_POSITIONS } from '@/lib/arenaPayouts';

type SkemaView = 'lobby' | 'training' | 'bots' | 'official' | 'party-setup' | 'party-playing' | 'party-collect' | 'party-results';

export default function Skema() {
  const { code: codeFromPath } = useParams<{ code?: string }>();
  const navigate = useNavigate();
  
  // Captura código de convite da URL (path /convite/CODIGO ou query ?convite=CODIGO)
  // Usa state para permitir limpeza manual quando usuário escolhe continuar
  const [inviteCodeFromUrl, setInviteCodeFromUrl] = useState<string>(() => {
    // Primeiro tenta via path param (mais confiável)
    if (codeFromPath) {
      return codeFromPath.toUpperCase();
    }
    // Fallback para query param
    const params = new URLSearchParams(window.location.search);
    const code = params.get('convite') || params.get('invite') || '';
    return code.toUpperCase();
  });
  
  // Sincroniza quando path param muda (navegação)
  useEffect(() => {
    if (codeFromPath) {
      setInviteCodeFromUrl(codeFromPath.toUpperCase());
    }
  }, [codeFromPath]);
  
  const skemaPlayer = useSupabasePlayer();
  const game = useGame();
  const tournament = useTournament();
  const party = usePartyTournament();
  const skemaBox = useSkemaBox();
  
  // Online presence - must be called before conditional returns (Rules of Hooks)
  const onlinePresence = useOnlinePlayers(
    skemaPlayer.player ? {
      id: skemaPlayer.player.id,
      name: skemaPlayer.player.name,
      emoji: skemaPlayer.player.emoji,
    } : null
  );
  
  const [currentView, setCurrentView] = useState<SkemaView>('lobby');
  const [gameMode, setGameMode] = useState<'training' | 'bots' | 'official' | 'party'>('training');
  const [showSessionConflict, setShowSessionConflict] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(null);
  
  // Detecta conflito de sessão: usuário logado + convite na URL
  useEffect(() => {
    if (showSessionConflict) return;

    if (skemaPlayer.isLoaded && skemaPlayer.isRegistered && skemaPlayer.player && inviteCodeFromUrl) {
      // Verifica se o código é diferente do código do jogador atual
      const currentPlayerInvite = skemaPlayer.player.inviteCode;
      if (inviteCodeFromUrl !== currentPlayerInvite && inviteCodeFromUrl.length > 0) {
        setShowSessionConflict(true);
        setPendingInviteCode(inviteCodeFromUrl);
      }
    }
  }, [skemaPlayer.isLoaded, skemaPlayer.isRegistered, skemaPlayer.player, inviteCodeFromUrl, showSessionConflict]);
  
  // Atualiza resultado do torneio quando jogo termina
  // MUST be before any conditional returns to follow Rules of Hooks
  useEffect(() => {
    if (currentView !== 'lobby' && 
        (game.state.status === 'won' || game.state.status === 'lost') &&
        tournament.state.status === 'playing') { // Guard: só se ainda estiver jogando
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
  }, [game.state.status, currentView, gameMode, tournament.state.status, tournament.actions]);
  
  // Espera carregar localStorage
  if (!skemaPlayer.isLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/50">Carregando...</div>
      </div>
    );
  }
  
  // Redireciona para auth se não estiver registrado (depois de carregar completamente)
  // IMPORTANTE: Esperar isLoading terminar para evitar redirecionamento prematuro
  if (!skemaPlayer.isRegistered || !skemaPlayer.player) {
    // Se ainda está carregando o perfil, mostra loading
    if (skemaPlayer.isLoading) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center">
          <div className="text-white/50 animate-pulse">Carregando perfil...</div>
        </div>
      );
    }
    
    // Build the redirect URL with invite code if present
    const authUrl = inviteCodeFromUrl 
      ? `/auth?convite=${inviteCodeFromUrl}` 
      : '/auth';
    
    // Use useEffect to navigate (can't call navigate during render)
    navigate(authUrl, { replace: true });
    
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white/50">Redirecionando para login...</div>
      </div>
    );
  }
  
  // Tela de conflito de sessão: usuário logado mas link de convite na URL
  if (showSessionConflict && pendingInviteCode) {
    const handleContinueAsCurrentUser = () => {
      setShowSessionConflict(false);
      setPendingInviteCode(null);
      // Limpa o código da URL E do state para evitar loop
      setInviteCodeFromUrl('');
      // IMPORTANTE (mobile): usar o roteador para realmente atualizar a rota atual
      // e evitar que o parâmetro :code continue “preso” no BrowserRouter.
      navigate('/', { replace: true });
    };
    
    const handleLogoutAndUseInvite = () => {
      setShowSessionConflict(false);
      skemaPlayer.actions.logout();
      // O código do convite já está na URL, será capturado pelo RegistrationScreen
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
            <Button
              onClick={handleContinueAsCurrentUser}
              className="w-full"
              size="lg"
            >
              Continuar como {skemaPlayer.player.name}
            </Button>
            
            <Button
              onClick={handleLogoutAndUseInvite}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
              size="lg"
            >
              Sair e usar convite
            </Button>
          </div>
          
          <p className="text-white/40 text-xs">
            Código do convite: {pendingInviteCode}
          </p>
        </div>
      </div>
    );
  }
  
  // Handlers para iniciar modos
  const handleStartTraining = () => {
    setGameMode('training');
    setCurrentView('training');
    game.actions.startGame();
  };
  
  // Constantes Arena x Bots (poker NL Hold'em style)
  // TODOS os valores derivados de CENTAVOS para evitar floating-point
  const ARENA_BUY_IN_CENTS = 50;           // 50 cents = k$0.50
  const ARENA_FEE_PER_PLAYER_CENTS = 5;    // 5 cents = k$0.05
  const ARENA_ENTRY_FEE_CENTS = ARENA_BUY_IN_CENTS + ARENA_FEE_PER_PLAYER_CENTS; // 55 cents = k$0.55
  const ARENA_PLAYERS = 100;
  const ARENA_TOTAL_POOL_CENTS = ARENA_BUY_IN_CENTS * ARENA_PLAYERS;           // 5000 cents = k$50.00
  const ARENA_TOTAL_RAKE_CENTS = ARENA_FEE_PER_PLAYER_CENTS * ARENA_PLAYERS;   // 500 cents = k$5.00

  // Converte para k$ (sem drift: divisão simples de inteiros)
  const ARENA_BUY_IN = ARENA_BUY_IN_CENTS / 100;                 // 0.5
  const ARENA_FEE_PER_PLAYER = ARENA_FEE_PER_PLAYER_CENTS / 100; // 0.05
  const ARENA_ENTRY_FEE = ARENA_ENTRY_FEE_CENTS / 100;           // 0.55
  const ARENA_TOTAL_POOL = ARENA_TOTAL_POOL_CENTS / 100;         // 50
  const ARENA_TOTAL_RAKE = ARENA_TOTAL_RAKE_CENTS / 100;         // 5
  
  // Prêmios ITM (top 25 de 100) - distribuição poker sobre k$50.00
  // Tabela completa em src/lib/arenaPayouts.ts
  // 1º: k$13.50, 2º: k$8.00, 3º: k$5.00, ..., 25º: k$0.55 (min-cash)
  
  const handleStartBotRace = (buyIn: number, fee: number): { success: boolean; error?: string } => {
    // Aritmética em centavos para evitar floating-point
    const buyInCents = Math.round(buyIn * 100);
    const feeCents = Math.round(fee * 100);
    const totalCents = buyInCents + feeCents;
    const total = totalCents / 100; // k$ sem drift
    
    console.log('[SKEMA ARENA] 🎮 Iniciando Arena x Bots...');
    console.log('[SKEMA ARENA] Saldo atual:', skemaPlayer.player!.energy);
    console.log('[SKEMA ARENA] Custo entrada:', total, `(${totalCents} cents)`);
    
    const energyCents = Math.round(skemaPlayer.player!.energy * 100);
    if (energyCents < totalCents) {
      console.log('[SKEMA ARENA] ❌ Energia insuficiente!');
      return { success: false, error: `Energia insuficiente (k$${total.toFixed(2)})` };
    }
    
    // Deduz entrada do humano
    const deducted = skemaPlayer.actions.deductEnergy(total);
    console.log('[SKEMA ARENA] ✅ Entrada deduzida:', deducted);
    
    // Rake = fee de TODOS os 100 jogadores (bots são virtuais mas contam) → Cloud
    skemaBox.addToBox(ARENA_TOTAL_RAKE, 'arena_rake').then(newBal => {
      console.log(`[SKEMA ARENA] 💰 Rake Cloud: k$${ARENA_TOTAL_RAKE.toFixed(2)} → Skema Box: k$${(newBal ?? 0).toFixed(2)}`);
    });
    console.log(`[SKEMA ARENA] 🏆 Pool total: k$${ARENA_TOTAL_POOL.toFixed(2)}`);
    
    setGameMode('bots');
    setCurrentView('bots');
    
    const result = tournament.actions.startTournament();
    console.log('[SKEMA ARENA] Torneio iniciado:', result);
    
    if (result.success && result.humanSecretCode) {
      game.actions.startGameWithSecret(result.humanSecretCode);
      console.log('[SKEMA ARENA] ✅ Jogo iniciado com sucesso!');
    } else {
      console.log('[SKEMA ARENA] ❌ Falha ao iniciar - devolvendo energia');
      // Se falhou, devolve a energia do humano
      skemaPlayer.actions.addEnergy(total);
      // Remove rake da caixa → Cloud
      skemaBox.subtractFromBox(ARENA_TOTAL_RAKE, 'adjustment', 'Arena x Bots: falha ao iniciar - rake devolvido');
    }
    
    return result;
  };
  
  const handleStartOfficialRace = (raceId: string, buyIn: number, fee: number): { success: boolean; error?: string } => {
    // IMPORTANTE: a Corrida Oficial já cobra a entrada (k$1.10) no ato da INSCRIÇÃO no Lobby.
    // Aqui (iniciar a corrida) NÃO deve debitar novamente, senão o saldo fica errado.
    
    setGameMode('official');
    setCurrentView('official');
    
    const result = tournament.actions.startTournament();
    if (result.success && result.humanSecretCode) {
      game.actions.startGameWithSecret(result.humanSecretCode);
    }
    
    return result;
  };
  
  
  // Handlers para Modo Festa
  const handleStartParty = () => {
    if (!skemaPlayer.player) return;
    party.actions.createTournament(
      skemaPlayer.player.id,
      skemaPlayer.player.name,
      skemaPlayer.player.emoji,
      'Festa SKEMA'
    );
    setCurrentView('party-setup');
    setGameMode('party');
  };
  
  const handlePartyStart = (): { success: boolean; error?: string } => {
    return party.actions.startTournament(skemaPlayer.actions.deductEnergy, skemaBox.addToBox);
  };
  
  const handlePartyStarted = () => {
    setCurrentView('party-playing');
    game.actions.startGame();
  };
  
  const handlePartyGameDone = () => {
    // Depois que o host termina, vai para coleta
    party.actions.goToCollecting();
    setCurrentView('party-collect');
  };
  
  const handlePartyFinish = () => {
    if (!skemaPlayer.player) return [];
    const results = party.actions.finishTournament(
      skemaPlayer.actions.addEnergy,
      skemaPlayer.player.id
    );
    setCurrentView('party-results');
    return results;
  };
  
  const handlePartyClose = () => {
    party.actions.closeTournament();
    game.actions.newGame();
    setCurrentView('lobby');
  };

  const handleBackToLobby = () => {
    console.log('[SKEMA] 🔙 handleBackToLobby chamado');
    console.log('[SKEMA] gameMode:', gameMode);
    console.log('[SKEMA] game.state.status:', game.state.status);
    console.log('[SKEMA] tournament.state.status:', tournament.state.status);
    
    // Atualiza stats do jogador
    if (game.state.status === 'won' || game.state.status === 'lost') {
      skemaPlayer.actions.updateStats({
        won: game.state.status === 'won',
        time: game.state.status === 'won' ? game.state.timeRemaining : undefined,
      });
      
      // Distribui prêmios para Arena x Bots
      if (gameMode === 'bots') {
        const humanResult = tournament.state.results.get(tournament.state.humanPlayerId);
        console.log('[SKEMA PREMIO] 💰 ======= VERIFICANDO PRÊMIO ARENA =======');
        console.log('[SKEMA PREMIO] humanResult:', humanResult);
        console.log('[SKEMA PREMIO] Saldo ANTES (state):', skemaPlayer.player?.energy);
        
        // Lê direto do storage para comparação
        const storageBefore = localStorage.getItem('skema_player');
        if (storageBefore) {
          console.log('[SKEMA PREMIO] Saldo ANTES (storage):', JSON.parse(storageBefore).energy);
        }
        
        if (humanResult && isITM(humanResult.rank)) {
          // ITM: posição 1-25 ganham prêmio (tabela poker)
          const prize = getArenaPrize(humanResult.rank);
          console.log(`[SKEMA PREMIO] 🏆 Rank: ${humanResult.rank}º | ITM! Prêmio: k$${prize.toFixed(2)}`);
          
          // Adiciona prêmio
          skemaPlayer.actions.addEnergy(prize);
          console.log('[SKEMA PREMIO] ✅ addEnergy chamado com:', prize);
          
          // Verifica localStorage diretamente após um tick
          setTimeout(() => {
            const stored = localStorage.getItem('skema_player');
            if (stored) {
              const parsed = JSON.parse(stored);
              console.log('[SKEMA PREMIO] 📦 Saldo DEPOIS (storage):', parsed.energy);
            }
            console.log('[SKEMA PREMIO] ======= FIM VERIFICAÇÃO =======');
          }, 200);
        } else {
          console.log(`[SKEMA PREMIO] ❌ Fora do ITM (${humanResult?.rank || '?'}º lugar, ITM até ${ITM_POSITIONS}º) - sem prêmio`);
        }
      }
    }
    
    // Skema Box é gerenciado pelo Cloud agora
    console.log('[SKEMA] 📦 Skema Box Cloud, saldo:', skemaBox.balance);
    
    // Update presence status back to online
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
        skemaDay={skemaPlayer.skemaDay}
        remainingReferralRewards={skemaPlayer.remainingReferralRewards}
        transferTax={skemaPlayer.transferTax}
        onStartTraining={handleStartTraining}
        onStartBotRace={handleStartBotRace}
        onStartOfficialRace={handleStartOfficialRace}
        onStartParty={handleStartParty}
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
  
  // Modo Festa: Setup
  if (currentView === 'party-setup' && party.tournament) {
    return (
      <PartySetup
        tournament={party.tournament}
        hostEnergy={skemaPlayer.player.energy}
        onAddPlayer={party.actions.addPlayer}
        onRemovePlayer={party.actions.removePlayer}
        onStart={() => {
          const result = handlePartyStart();
          if (result.success) {
            handlePartyStarted();
          }
          return result;
        }}
        onCancel={handlePartyClose}
      />
    );
  }
  
  // Modo Festa: Jogando (host joga sua partida)
  if (currentView === 'party-playing') {
    const isFinished = game.state.status === 'won' || game.state.status === 'lost';
    
    if (isFinished) {
      // Automaticamente vai para coleta quando termina
      // Registra resultado do host
      if (party.tournament && skemaPlayer.player) {
        party.actions.addResult(
          skemaPlayer.player.id,
          game.state.status === 'won',
          game.state.attempts,
          game.state.timeRemaining,
          game.state.score
        );
      }
    }
    
    return (
      <div className="min-h-screen relative">
        <CosmicBackground />
        
        <div className="relative z-10 min-h-screen">
          <div className="sticky top-0 z-20 bg-black/50 backdrop-blur-md border-b border-white/10 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">🎉 Modo Festa - Sua vez!</span>
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
            {isFinished ? (
              <div className="max-w-md mx-auto text-center space-y-4">
                <div className="bg-white/10 border border-white/20 rounded-xl p-6">
                  <div className="text-4xl mb-3">{game.state.status === 'won' ? '🎉' : '😅'}</div>
                  <h2 className="text-xl font-bold text-white mb-2">
                    {game.state.status === 'won' ? 'Você venceu!' : 'Fim de jogo!'}
                  </h2>
                  <p className="text-white/60 mb-4">
                    {game.state.attempts} tentativas • {Math.floor(game.state.timeRemaining / 60)}:{String(game.state.timeRemaining % 60).padStart(2, '0')} restantes
                  </p>
                  <Button onClick={handlePartyGameDone} className="w-full">
                    Coletar Resultados dos Outros
                  </Button>
                </div>
              </div>
            ) : (
              <GameBoard
                state={game.state}
                secretCode={game.secretCode}
                symbols={game.constants.SYMBOLS}
                onSelectSymbol={game.actions.selectSymbol}
                onClearSlot={game.actions.clearSlot}
                onSubmit={game.actions.submit}
                onNewGame={handlePartyClose}
                onStartGame={game.actions.startGame}
              />
            )}
          </main>
        </div>
      </div>
    );
  }
  
  // Modo Festa: Coletando resultados
  if (currentView === 'party-collect' && party.tournament) {
    return (
      <PartyCollect
        tournament={party.tournament}
        onAddResult={party.actions.addResult}
        onFinish={handlePartyFinish}
        onCancel={handlePartyClose}
      />
    );
  }
  
  // Modo Festa: Resultados finais
  if (currentView === 'party-results' && party.tournament && skemaPlayer.player) {
    return (
      <PartyResults
        tournament={party.tournament}
        hostPlayerId={skemaPlayer.player.id}
        onClose={handlePartyClose}
      />
    );
  }
  
  // Jogo (Training ou Bots/Official)
  const isFinished = game.state.status === 'won' || game.state.status === 'lost';
  const humanResult = tournament.state.results.get(tournament.state.humanPlayerId);
  const symbolsById = new Map(UI_SYMBOLS.map(s => [s.id, s]));
  
  // Cálculo de prêmio para display
  let prizeAmount = 0;
    if (humanResult && (gameMode === 'bots' || gameMode === 'official')) {
      if (gameMode === 'bots' && isITM(humanResult.rank)) {
        // Arena x Bots: ITM top 25 (poker-style)
        prizeAmount = getArenaPrize(humanResult.rank);
      } else if (gameMode === 'official' && humanResult.rank <= 4) {
        // Official usa distribuição diferente
        prizeAmount = Math.floor(tournament.state.prizePool * [0.5, 0.25, 0.15, 0.1][humanResult.rank - 1]);
      }
    }
  
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
