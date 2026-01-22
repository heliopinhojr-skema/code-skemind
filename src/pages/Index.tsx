import { useGame } from '@/hooks/useGame';
import { StatsBar } from '@/components/game/StatsBar';
import { GameBoard } from '@/components/game/GameBoard';
import { RulesCard } from '@/components/game/RulesCard';
import { CosmicBackground } from '@/components/CosmicBackground';

const Index = () => {
  const { state, actions, constants, secretCode } = useGame();

  const safeSecret = Array.isArray(secretCode) ? secretCode : [];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Persistent cosmic background */}
      <CosmicBackground />

      {/* Main content */}
      <div className="relative z-10 h-screen flex flex-col overflow-hidden">
        <StatsBar 
          attempts={state.attempts} 
          maxAttempts={constants.MAX_ATTEMPTS} 
          gameStatus={state.status}
          score={state.score}
          timeRemaining={state.timeRemaining}
        />

        <main className="flex-1 overflow-hidden px-3 py-3">
          <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3 max-w-4xl mx-auto">
            <div className="overflow-y-auto">
              <GameBoard
                state={state}
                secretCode={safeSecret}
                symbols={constants.SYMBOLS}
                onSelectSymbol={actions.selectSymbol}
                onClearSlot={actions.clearSlot}
                onSubmit={actions.submit}
                onNewGame={actions.newGame}
                onStartGame={actions.startGame}
              />
            </div>
            <div className="hidden lg:block overflow-y-auto">
              <RulesCard />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Index;
