import { motion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TokenPicker } from './TokenPicker';
import { GuessSlots } from './GuessSlots';
import { HistoryLog } from './HistoryLog';
import { Symbol } from './Symbol';
import { AttemptAuditPanel } from './AttemptAuditPanel';
import { LastGuessInspector } from './LastGuessInspector';
import { Button } from '@/components/ui/button';
import type { GameState, GameSymbol, AttemptResult } from '@/hooks/useGame';
import { MAX_ATTEMPTS } from '@/hooks/useGame';
import { evaluateGuess } from '@/lib/mastermindEngine';
interface GameBoardProps {
  state: GameState;
  secretCode: GameSymbol[];
  symbols: readonly GameSymbol[];
  onSelectSymbol: (symbol: GameSymbol) => void;
  onClearSlot: (index: number) => void;
  onSubmit: () => void;
  onNewGame: () => void;
  onStartGame: () => void;
}

export function GameBoard({
  state,
  secretCode,
  symbols,
  onSelectSymbol,
  onClearSlot,
  onSubmit,
  onNewGame,
  onStartGame,
}: GameBoardProps) {
  const [copied, setCopied] = useState(false);
  const [showAuditDetails, setShowAuditDetails] = useState(false);
  const [showLastGuessInspector, setShowLastGuessInspector] = useState(false);

  const safeGuess = Array.isArray(state.currentGuess) ? state.currentGuess : [];
  const safeSecret = Array.isArray(secretCode) ? secretCode : [];
  const safeSymbols = Array.isArray(symbols) ? symbols : [];
  const safeHistory = Array.isArray(state.history) ? state.history : [];

  const isPlaying = state.status === 'playing';
  const isNotStarted = state.status === 'notStarted';
  const isGameOver = state.status === 'won' || state.status === 'lost';
  const canSubmit = isPlaying && !safeGuess.includes(null);

  const selectedIds = (Array.isArray(safeGuess) ? safeGuess : []).filter(Boolean).map(s => s!.id);

  const formatHistoryForClipboard = (history: AttemptResult[]): string => {
    const lines = history
      .slice()
      .reverse()
      .map((attempt, i) => {
        const guess = attempt.guessSnapshot.join(' ');
        const whites = attempt.feedbackSnapshot.whites;
        const grays = attempt.feedbackSnapshot.grays;
        return `#${i + 1}: [${guess}] → ⚪${whites} ⚫${grays}`;
      });
    return `SKEMIND - ${state.attempts} tentativas\nPontuação: ${state.score}\n\n${lines.join('\n')}`;
  };

  const handleCopyHistory = async () => {
    if (safeHistory.length === 0) return;
    try {
      await navigator.clipboard.writeText(formatHistoryForClipboard(safeHistory));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const secretIds = useMemo(() => safeSecret.map(s => s.id), [safeSecret]);

  const historyChronological = useMemo(() => safeHistory.slice().reverse(), [safeHistory]);
  const lastAttempt = safeHistory[0];

  const audit = useMemo(() => {
    if (!isGameOver) return null;
    if (secretIds.length === 0 || safeHistory.length === 0) return null;

    return safeHistory.map(attempt => {
      const expected = evaluateGuess([...secretIds], [...attempt.guessSnapshot]);
      const ok =
        expected.whites === attempt.feedbackSnapshot.whites &&
        expected.grays === attempt.feedbackSnapshot.grays;
      return { id: attempt.id, ok, expected, attempt };
    });
  }, [isGameOver, safeHistory, secretIds]);

  const auditHasData = Boolean(audit && audit.length > 0);
  const auditAllOk = (audit ?? []).every(a => a.ok);

  const lostReason: 'time' | 'attempts' | 'other' =
    state.status !== 'lost'
      ? 'other'
      : state.timeRemaining === 0
        ? 'time'
        : state.attempts >= MAX_ATTEMPTS
          ? 'attempts'
          : 'other';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card rounded-2xl p-4 space-y-4 flex flex-col"
    >
      {/* Not Started */}
      {isNotStarted && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-6 text-center space-y-4"
        >
          <h2 className="text-2xl font-bold text-foreground">SKEMIND</h2>
          <p className="text-muted-foreground">
            Descubra o código secreto de 4 símbolos antes do tempo acabar!
          </p>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>⏱️ Tempo: 3 minutos</p>
            <p>⭐ Branco: +60 | Cinza: +25</p>
            <p>🏆 Vitória: +1000 + bônus de tempo</p>
          </div>
          <Button onClick={onStartGame} variant="primary" size="lg" className="w-full h-14 text-lg font-bold">
            Iniciar Jogo
          </Button>
        </motion.div>
      )}

      {/* Victory */}
      {state.status === 'won' && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-4 rounded-xl bg-success/20 border border-success/50 text-center"
        >
          <p className="text-xl font-bold text-success">🎉 Vitória!</p>
          <p className="text-sm text-muted-foreground mt-1">
            Você descobriu o código em {state.attempts} tentativa(s).
          </p>
          <p className="text-lg font-bold text-foreground mt-2">
            Pontuação: {state.score} ⭐
          </p>
          <p className="text-xs text-muted-foreground mt-2">O código era:</p>
          <div className="flex justify-center gap-2 mt-2">
            {safeSecret.map((symbol, i) => (
              <div key={i} className="w-10 h-10 flex items-center justify-center bg-muted/30 rounded-lg">
                <Symbol symbol={symbol} size="md" />
              </div>
            ))}
          </div>

          {auditHasData && (
            <div className="mt-3 rounded-lg bg-muted/20 border border-border p-3 text-left">
              <p className="text-xs font-semibold text-foreground">Auditoria do feedback</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {auditAllOk
                  ? '✅ OK — todos os feedbacks batem com o código revelado.'
                  : '❌ Inconsistência detectada — pelo menos uma rodada não bate com o código revelado.'}
              </p>

              {!auditAllOk && (
                <div className="mt-2 space-y-1">
                  {audit!
                    .filter(a => !a.ok)
                    .slice(0, 3)
                    .map(a => (
                      <p key={a.id} className="text-[11px] font-mono text-foreground break-words">
                        [{a.attempt.guessSnapshot.join(' ')}] → esperado ⚪{a.expected.whites} ⚫{a.expected.grays} (tinha ⚪
                        {a.attempt.feedbackSnapshot.whites} ⚫{a.attempt.feedbackSnapshot.grays})
                      </p>
                    ))}
                </div>
              )}
            </div>
          )}

           {safeHistory.length > 0 && (
             <div className="mt-3 flex justify-center">
               <Button
                 type="button"
                 variant="outline"
                 size="sm"
                 onClick={() => setShowAuditDetails(v => !v)}
               >
                 {showAuditDetails ? 'Ocultar auditoria detalhada' : 'Mostrar auditoria detalhada'}
               </Button>
             </div>
           )}

           {showAuditDetails && (
             <AttemptAuditPanel secretIds={secretIds} historyChronological={historyChronological} symbols={safeSymbols} />
           )}
        </motion.div>
      )}

      {/* Defeat */}
      {state.status === 'lost' && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="p-4 rounded-xl bg-destructive/20 border border-destructive/50 text-center"
        >
          <p className="text-xl font-bold text-destructive">
            {lostReason === 'attempts' ? '🧩 Tentativas Esgotadas!' : '⏱️ Tempo Esgotado!'}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {lostReason === 'attempts'
              ? `Você usou ${state.attempts}/${MAX_ATTEMPTS} tentativa(s).`
              : `O tempo acabou após ${state.attempts} tentativa(s).`}
          </p>
          <p className="text-lg font-bold text-foreground mt-2">
            Pontuação: {state.score} ⭐
          </p>
          <p className="text-xs text-muted-foreground mt-2">O código era:</p>
          <div className="flex justify-center gap-2 mt-2">
            {safeSecret.map((symbol, i) => (
              <div key={i} className="w-10 h-10 flex items-center justify-center bg-muted/30 rounded-lg">
                <Symbol symbol={symbol} size="md" />
              </div>
            ))}
          </div>

          {auditHasData && (
            <div className="mt-3 rounded-lg bg-muted/20 border border-border p-3 text-left">
              <p className="text-xs font-semibold text-foreground">Auditoria do feedback</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {auditAllOk
                  ? '✅ OK — todos os feedbacks batem com o código revelado.'
                  : '❌ Inconsistência detectada — pelo menos uma rodada não bate com o código revelado.'}
              </p>

              {!auditAllOk && (
                <div className="mt-2 space-y-1">
                  {audit!
                    .filter(a => !a.ok)
                    .slice(0, 3)
                    .map(a => (
                      <p key={a.id} className="text-[11px] font-mono text-foreground break-words">
                        [{a.attempt.guessSnapshot.join(' ')}] → esperado ⚪{a.expected.whites} ⚫{a.expected.grays} (tinha ⚪
                        {a.attempt.feedbackSnapshot.whites} ⚫{a.attempt.feedbackSnapshot.grays})
                      </p>
                    ))}
                </div>
              )}
            </div>
          )}

           {safeHistory.length > 0 && (
             <div className="mt-3 flex justify-center">
               <Button
                 type="button"
                 variant="outline"
                 size="sm"
                 onClick={() => setShowAuditDetails(v => !v)}
               >
                 {showAuditDetails ? 'Ocultar auditoria detalhada' : 'Mostrar auditoria detalhada'}
               </Button>
             </div>
           )}

           {showAuditDetails && (
             <AttemptAuditPanel secretIds={secretIds} historyChronological={historyChronological} symbols={safeSymbols} />
           )}
        </motion.div>
      )}

      {/* Playing */}
      {isPlaying && (
        <>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">Seu palpite:</p>
            <GuessSlots guess={safeGuess} onClear={onClearSlot} disabled={!isPlaying} />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground text-center">Escolha os símbolos:</p>
            <TokenPicker symbols={safeSymbols} onSelect={onSelectSymbol} disabled={!isPlaying} selectedIds={selectedIds} />
          </div>

          <Button
            onClick={onSubmit}
            variant="primary"
            size="lg"
            className="w-full h-14 text-lg font-bold"
            disabled={!canSubmit}
          >
            Enviar Palpite
          </Button>

          {safeHistory.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLastGuessInspector(v => !v)}
                >
                  {showLastGuessInspector ? 'Ocultar análise do último palpite' : 'Mostrar análise do último palpite'}
                </Button>
              </div>

              {showLastGuessInspector && lastAttempt && (
                <LastGuessInspector secretIds={secretIds} attempt={lastAttempt} symbols={safeSymbols} />
              )}
            </div>
          )}
        </>
      )}

      {/* Game Over Actions */}
      {isGameOver && (
        <div className="flex gap-2">
          <Button onClick={onNewGame} variant="primary" size="lg" className="flex-1 h-14 text-lg font-bold">
            Novo Jogo
          </Button>
          {safeHistory.length > 0 && (
            <Button
              onClick={handleCopyHistory}
              variant="outline"
              size="lg"
              className="h-14 px-4"
              title="Copiar histórico"
            >
              {copied ? <Check className="w-5 h-5 text-success" /> : <Copy className="w-5 h-5" />}
            </Button>
          )}
        </div>
      )}

      {/* History */}
      {(Array.isArray(state.history) ? state.history : []).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Histórico:</p>
          <HistoryLog history={Array.isArray(state.history) ? state.history : []} />
        </div>
      )}
    </motion.div>
  );
}
