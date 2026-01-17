import { useGame } from '@/hooks/useGame';
import { useEnvironmentalRng } from '@/hooks/useEnvironmentalRng';
import { StatsBar } from '@/components/game/StatsBar';
import { GameBoard } from '@/components/game/GameBoard';
import { RulesCard } from '@/components/game/RulesCard';

const Index = () => {
  const { state, actions, constants, secretCode } = useGame();
  
  // RNG Ambiental v1 - afeta apenas o visual, nunca a lógica
  const { config: environmentalConfig } = useEnvironmentalRng({
    roundId: state.roundId,
    symbolCount: constants.SYMBOLS.length,
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <StatsBar 
        attempts={state.attempts}
        maxAttempts={constants.MAX_ATTEMPTS}
        remainingSeconds={state.remainingSeconds}
        score={state.score}
        gameStatus={state.gameStatus}
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
              environmentalConfig={environmentalConfig}
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
