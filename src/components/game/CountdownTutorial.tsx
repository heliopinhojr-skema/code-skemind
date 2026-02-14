import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SYMBOLS } from '@/lib/mastermindEngine';

interface CountdownTutorialProps {
  countdown: number;
  /** Unique game identifier so preference is per-game */
  gameId?: string;
}

const STORAGE_KEY_PREFIX = 'skema_hide_tutorial_';

function isTutorialHidden(gameId: string): boolean {
  try {
    return localStorage.getItem(`${STORAGE_KEY_PREFIX}${gameId}`) === '1';
  } catch {
    return false;
  }
}

function setTutorialHidden(gameId: string, hidden: boolean) {
  try {
    if (hidden) {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${gameId}`, '1');
    } else {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${gameId}`);
    }
  } catch {}
}

/**
 * Mini-tutorial shown during the 10-second countdown.
 * Each step teaches a key concept of the game in a visual, intuitive way.
 */
export function CountdownTutorial({ countdown, gameId = 'skemind' }: CountdownTutorialProps) {
  const [hidden, setHidden] = useState(() => isTutorialHidden(gameId));
  
  const handleToggle = useCallback(() => {
    setHidden(prev => {
      const next = !prev;
      setTutorialHidden(gameId, next);
      return next;
    });
  }, [gameId]);

  const step = getTutorialStep(countdown);
  if (!step) return null;

  return (
    <div className="w-full max-w-xs mx-auto mt-6 space-y-2">
      {!hidden && (
        <AnimatePresence mode="wait">
          <motion.div
            key={countdown}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
          >
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-5 py-4 text-center space-y-3">
              <div className="text-[11px] uppercase tracking-[0.25em] text-white/40 font-medium">
                {step.label}
              </div>
              <div>{step.visual}</div>
              <p className="text-sm text-white/80 leading-relaxed font-medium">
                {step.text}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      )}
      <label className="flex items-center justify-center gap-2 cursor-pointer select-none group">
        <input
          type="checkbox"
          checked={hidden}
          onChange={handleToggle}
          className="w-3.5 h-3.5 rounded border-white/30 bg-white/10 accent-primary cursor-pointer"
        />
        <span className="text-[11px] text-white/30 group-hover:text-white/50 transition-colors">
          Não mostrar instruções
        </span>
      </label>
    </div>
  );
}

/* ─── Symbol mini-renderer (inline, no import of game Symbol component) ─── */
function MiniSymbol({ id, color }: { id: string; color: string }) {
  const size = 'w-8 h-8';
  const shapes: Record<string, JSX.Element> = {
    circle: (
      <svg viewBox="0 0 24 24" className={size}>
        <circle cx="12" cy="12" r="10" fill={color} />
      </svg>
    ),
    square: (
      <svg viewBox="0 0 24 24" className={size}>
        <rect x="2" y="2" width="20" height="20" rx="2" fill={color} />
      </svg>
    ),
    triangle: (
      <svg viewBox="0 0 24 24" className={size}>
        <polygon points="12,2 22,22 2,22" fill={color} />
      </svg>
    ),
    diamond: (
      <svg viewBox="0 0 24 24" className={size}>
        <polygon points="12,2 22,12 12,22 2,12" fill={color} />
      </svg>
    ),
    star: (
      <svg viewBox="0 0 24 24" className={size}>
        <polygon points="12,2 15,9 22,9 16.5,14 18.5,22 12,18 5.5,22 7.5,14 2,9 9,9" fill={color} />
      </svg>
    ),
    hexagon: (
      <svg viewBox="0 0 24 24" className={size}>
        <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill={color} />
      </svg>
    ),
  };
  return (
    <div className="inline-flex" style={{ filter: `drop-shadow(0 0 6px ${color}50)` }}>
      {shapes[id] || null}
    </div>
  );
}

function Peg({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-4 h-4 rounded-full border border-white/20"
      style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}60` }}
    />
  );
}

/* ─── Tutorial steps mapped to countdown seconds ─── */
function getTutorialStep(countdown: number): { label: string; visual: JSX.Element; text: string } | null {
  switch (countdown) {
    case 10:
      return {
        label: 'Objetivo',
        visual: (
          <div className="flex justify-center gap-2">
            {['?', '?', '?', '?'].map((_, i) => (
              <div key={i} className="w-8 h-8 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-white/30 text-lg font-bold">?</div>
            ))}
          </div>
        ),
        text: 'Descubra o código secreto de 4 símbolos!',
      };

    case 9:
      return {
        label: '6 Símbolos',
        visual: (
          <div className="flex justify-center gap-2">
            {SYMBOLS.map((s) => (
              <MiniSymbol key={s.id} id={s.id} color={s.color} />
            ))}
          </div>
        ),
        text: '6 formas disponíveis — escolha 4 únicas',
      };

    case 8:
      return {
        label: 'Tentativas',
        visual: (
          <div className="flex justify-center items-end gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: i * 0.06 }}
                className="w-3 rounded-t bg-gradient-to-t from-primary/60 to-primary origin-bottom"
                style={{ height: `${12 + i * 3}px` }}
              />
            ))}
          </div>
        ),
        text: 'Você tem 8 tentativas para acertar',
      };

    case 7:
      return {
        label: 'Tempo',
        visual: (
          <div className="text-3xl font-black text-primary tabular-nums">
            3:00
          </div>
        ),
        text: '180 segundos — quanto mais rápido, mais pontos!',
      };

    case 6:
      return {
        label: 'Feedback — Pino Branco',
        visual: (
          <div className="flex items-center justify-center gap-3">
            <div className="flex gap-1">
              <MiniSymbol id="circle" color={SYMBOLS[0].color} />
              <MiniSymbol id="square" color={SYMBOLS[1].color} />
            </div>
            <span className="text-white/40">→</span>
            <div className="flex gap-1">
              <Peg color="#FFFFFF" />
              <Peg color="#FFFFFF" />
            </div>
          </div>
        ),
        text: 'Branco = símbolo E posição corretos ✓',
      };

    case 5:
      return {
        label: 'Feedback — Pino Preto',
        visual: (
          <div className="flex items-center justify-center gap-3">
            <div className="flex gap-1">
              <MiniSymbol id="triangle" color={SYMBOLS[2].color} />
              <MiniSymbol id="diamond" color={SYMBOLS[3].color} />
            </div>
            <span className="text-white/40">→</span>
            <div className="flex gap-1">
              <Peg color="#1A1A1A" />
              <Peg color="#1A1A1A" />
            </div>
          </div>
        ),
        text: 'Preto = símbolo certo, posição errada ↔',
      };

    case 4:
      return {
        label: 'Sem pinos',
        visual: (
          <div className="flex items-center justify-center gap-3">
            <div className="flex gap-1">
              <MiniSymbol id="star" color={SYMBOLS[4].color} />
            </div>
            <span className="text-white/40">→</span>
            <span className="text-white/30 text-sm">nenhum pino</span>
          </div>
        ),
        text: 'Sem pino = símbolo não está no código ✗',
      };

    case 3:
      return {
        label: 'Vitória',
        visual: (
          <div className="flex justify-center gap-1.5">
            <Peg color="#FFFFFF" />
            <Peg color="#FFFFFF" />
            <Peg color="#FFFFFF" />
            <Peg color="#FFFFFF" />
          </div>
        ),
        text: '4 pinos brancos = código decifrado! 🎉',
      };

    case 2:
      return {
        label: 'Dica',
        visual: (
          <div className="text-2xl">🧠</div>
        ),
        text: 'Use a lógica — elimine símbolos a cada rodada',
      };

    case 1:
      return {
        label: 'Prepare-se',
        visual: (
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.6, repeat: Infinity }}
            className="text-3xl"
          >
            🚀
          </motion.div>
        ),
        text: 'Boa sorte, viajante!',
      };

    default:
      return null;
  }
}
