import { useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Symbol } from './Symbol';
import type { AttemptResult, GameSymbol } from '@/hooks/useGame';

type SlotAudit =
  | { index: number; guessId: string; status: 'exact'; secretPos: number }
  | { index: number; guessId: string; status: 'present'; secretPos: number }
  | { index: number; guessId: string; status: 'absent' };

function auditSlots(secretIds: string[], guessIds: string[]): SlotAudit[] {
  return guessIds.map((guessId, index) => {
    const secretPos = secretIds.indexOf(guessId);
    if (secretPos === -1) return { index, guessId, status: 'absent' };
    if (secretPos === index) return { index, guessId, status: 'exact', secretPos };
    return { index, guessId, status: 'present', secretPos };
  });
}

function statusText(a: SlotAudit): string {
  if (a.status === 'exact') return '✅ posição certa';
  if (a.status === 'present') return `↔ existe no código (pos ${a.secretPos + 1})`;
  return '✗ não existe no código';
}

function statusClass(a: SlotAudit): string {
  if (a.status === 'exact') return 'text-success';
  if (a.status === 'present') return 'text-primary';
  return 'text-muted-foreground';
}

function SlotRow({ audit, symbol }: { audit: SlotAudit; symbol?: GameSymbol }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/10 px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono text-muted-foreground w-12">Pos {audit.index + 1}</span>
        <div className="w-8 h-8 rounded-lg bg-background/60 flex items-center justify-center">
          {symbol ? <Symbol symbol={symbol} size="sm" /> : null}
        </div>
        <span className="text-xs font-mono text-foreground">{audit.guessId}</span>
      </div>

      <span className={`text-xs font-medium ${statusClass(audit)}`}>{statusText(audit)}</span>
    </div>
  );
}

export function AttemptAuditPanel({
  secretIds,
  historyChronological,
  symbols,
}: {
  secretIds: string[];
  historyChronological: AttemptResult[];
  symbols: readonly GameSymbol[];
}) {
  const symbolsById = useMemo(() => {
    const map = new Map<string, GameSymbol>();
    (Array.isArray(symbols) ? symbols : []).forEach(s => map.set(s.id, s));
    return map;
  }, [symbols]);

  if (!Array.isArray(historyChronological) || historyChronological.length === 0) return null;
  if (!Array.isArray(secretIds) || secretIds.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg bg-muted/20 border border-border p-3 text-left">
      <p className="text-xs font-semibold text-foreground">Auditoria detalhada (por posição)</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Isto mostra exatamente o que está na posição certa vs. apenas presente em outra posição.
      </p>

      <Accordion type="single" collapsible className="mt-2">
        {historyChronological.map((attempt, i) => {
          const guessIds = Array.isArray(attempt.guessSnapshot) ? [...attempt.guessSnapshot] : [];
          const slots = auditSlots(secretIds, guessIds);

          return (
            <AccordionItem key={attempt.id} value={attempt.id}>
              <AccordionTrigger className="py-3 text-sm">
                <span className="text-left">
                  <span className="font-mono text-xs text-muted-foreground">#{i + 1}</span>{' '}
                  <span className="font-mono text-xs text-foreground">[{guessIds.join(' ')}]</span>{' '}
                  <span className="font-mono text-xs text-muted-foreground">
                    → ⚪{attempt.feedbackSnapshot.whites} ⚫{attempt.feedbackSnapshot.grays}
                  </span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {slots.map(s => (
                    <SlotRow key={`${attempt.id}-${s.index}-${s.guessId}`} audit={s} symbol={symbolsById.get(s.guessId)} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
