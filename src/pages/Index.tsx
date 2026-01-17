import { useGame } from '@/hooks/useGame';
import { StatsBar } from '@/components/game/StatsBar';
import { GameBoard } from '@/components/game/GameBoard';
import { RulesCard } from '@/components/game/RulesCard';

const Index = () => {
  const { state, actions, constants, secretCode, debugMode } = useGame();

  const safeSecret = Array.isArray(secretCode) ? secretCode : [];

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Debug Mode Panel — FIXO no canto superior direito */}
      {debugMode && (
        <div className="fixed top-2 right-2 z-50 glass-card rounded-xl px-3 py-2 text-xs font-mono space-y-1 max-w-xs">
          <div className="font-bold text-foreground">DEBUG MODE</div>
          <div className="text-muted-foreground">
            Status: <span className="text-foreground">{state.status}</span>
          </div>
          <div className="text-muted-foreground">
            Tentativas: <span className="text-foreground">{state.attempts} / {constants.MAX_ATTEMPTS}</span>
          </div>
          <div className="text-muted-foreground">
            Secret: <span className="text-foreground">[{safeSecret.map(s => s.id).join(', ')}]</span>
          </div>
        </div>
      )}

      <StatsBar attempts={state.attempts} maxAttempts={constants.MAX_ATTEMPTS} gameStatus={state.status} />

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
  );
};

export default Index;
