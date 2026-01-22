import { useMemo } from 'react';
import { Symbol } from './Symbol';
import type { AttemptResult, GameSymbol } from '@/hooks/useGame';
import { evaluateGuess } from '@/lib/mastermindEngine';

type SlotStatus = 'exact' | 'present' | 'absent';

function computeSlotStatuses(secretIds: string[], guessIds: string[]): SlotStatus[] {
  return guessIds.map((id, i) => {
    const secretPos = secretIds.indexOf(id);
    if (secretPos === -1) return 'absent';
    return secretPos === i ? 'exact' : 'present';
  });
}

function statusLabel(status: SlotStatus) {
  switch (status) {
    case 'exact':
      return '✅ certo e na posição certa (branco)';
    case 'present':
      return '↔ certo, mas em outra posição (preto)';
    default:
      return '✗ não está no código';
  }
}

function statusClass(status: SlotStatus) {
  switch (status) {
    case 'exact':
      return 'text-success';
    case 'present':
      return 'text-primary';
    default:
      return 'text-muted-foreground';
  }
}

export function LastGuessInspector({
  secretIds,
  attempt,
  symbols,
}: {
  secretIds: string[];
  attempt: AttemptResult;
  symbols: readonly GameSymbol[];
}) {
  const guessIds = Array.isArray(attempt.guessSnapshot) ? [...attempt.guessSnapshot] : [];

  const symbolsById = useMemo(() => {
    const map = new Map<string, GameSymbol>();
    (Array.isArray(symbols) ? symbols : []).forEach(s => map.set(s.id, s));
    return map;
  }, [symbols]);

  const slotStatuses = useMemo(() => computeSlotStatuses(secretIds, guessIds), [secretIds, guessIds]);

  const recalculated = useMemo(() => {
    try {
      return evaluateGuess([...secretIds], [...guessIds]);
    } catch {
      return null;
    }
  }, [secretIds, guessIds]);

  const stored = attempt.feedbackSnapshot;
  const matchesStored =
    recalculated &&
    recalculated.whites === stored.whites &&
    recalculated.grays === stored.grays;

  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {guessIds.map((id, i) => {
        const symbol = symbolsById.get(id);
        const status = slotStatuses[i] ?? 'absent';

        return (
          <div
            key={`${attempt.id}-${i}-${id}`}
            className="flex flex-col items-center gap-1"
          >
            <div className="w-10 h-10 rounded-lg bg-background/60 border border-border flex items-center justify-center">
              {symbol ? <Symbol symbol={symbol} size="sm" /> : null}
            </div>
            <div className="w-5 h-5 flex items-center justify-center">
              {status === 'exact' ? (
                <span className="text-base">⚪</span>
              ) : status === 'present' ? (
                <span className="text-base">⚫</span>
              ) : (
                <span className="text-xs text-muted-foreground">✗</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
