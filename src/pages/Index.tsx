import { useGame } from '@/hooks/useGame';
import { StatsBar } from '@/components/game/StatsBar';
import { GameBoard } from '@/components/game/GameBoard';
import { RulesCard } from '@/components/game/RulesCard';

const Index = () => {
  const { state, actions, constants } = useGame();

  return (
    <div className="min-h-screen pb-10">
      <StatsBar 
        attempts={state.attempts}
        maxAttempts={constants.MAX_ATTEMPTS}
        elapsedSeconds={state.elapsedSeconds}
        score={state.score}
      />

      <main className="max-w-4xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
          <GameBoard
            state={state}
            tokens={constants.TOKENS}
            onSelectToken={actions.selectToken}
            onClearSlot={actions.clearSlot}
            onSubmit={actions.submit}
            onNewGame={actions.newGame}
            onReveal={actions.reveal}
          />
          <RulesCard />
        </div>
      </main>
    </div>
  );
};

export default Index;
