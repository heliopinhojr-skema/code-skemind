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
    <div className="rounded-lg bg-muted/20 border border-border p-3 text-left">
      <p className="text-xs font-semibold text-foreground">Análise do último palpite (por símbolo)</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Isto deixa explícito o que é branco (exato), preto (só presente) e ausente.
      </p>

      <div className="mt-2 space-y-2">
        {guessIds.map((id, i) => {
          const symbol = symbolsById.get(id);
          const status = slotStatuses[i] ?? 'absent';

          return (
            <div
              key={`${attempt.id}-${i}-${id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/30 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground w-12">Pos {i + 1}</span>
                <div className="w-8 h-8 rounded-lg bg-background/60 flex items-center justify-center">
                  {symbol ? <Symbol symbol={symbol} size="sm" /> : null}
                </div>
                <span className="text-xs font-mono text-foreground">{id}</span>
              </div>

              <span className={`text-xs font-medium ${statusClass(status)}`}>{statusLabel(status)}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-3 rounded-lg border border-border bg-background/30 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          Feedback salvo: <span className="font-mono">⚪{stored.whites} ⚫{stored.grays}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          Feedback recalculado: <span className="font-mono">{recalculated ? `⚪${recalculated.whites} ⚫${recalculated.grays}` : '—'}</span>{' '}
          {recalculated ? (
            <span className={matchesStored ? 'text-success' : 'text-destructive'}>
              {matchesStored ? '✅ bate' : '❌ NÃO bate'}
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}
