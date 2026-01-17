import { useGame } from '@/hooks/useGame';
import { StatsBar } from '@/components/game/StatsBar';
import { GameBoard } from '@/components/game/GameBoard';
import { RulesCard } from '@/components/game/RulesCard';

const Index = () => {
  const { state, actions, constants, secretCode, debugMode } = useGame();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Debug Mode Indicator */}
      {debugMode && secretCode.length > 0 && (
        <div className="fixed top-2 right-2 z-50 bg-yellow-500 text-black text-xs px-2 py-1 rounded font-mono">
          DEBUG: [{secretCode.map(s => s.id.split('-')[0]).join(', ')}]
        </div>
      )}
      
      <StatsBar 
        attempts={state.attempts}
        maxAttempts={constants.MAX_ATTEMPTS}
        remainingSeconds={state.timeLeft}
        score={state.status === 'won' ? 1000 : 0}
        gameStatus={state.status}
      />

      <main className="flex-1 overflow-hidden px-3 py-3">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3 max-w-4xl mx-auto">
          <div className="overflow-y-auto">
            <GameBoard
              state={state}
              secretCode={secretCode}
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
  );
};

export default Index;
