/**
 * Bot AI para SKEMIND - Multi-IQ (80/90/100/110)
 * 
 * Distribuição:
 * - 30% IQ 80  (mais lento, 20% erro)
 * - 20% IQ 90  (moderado, 12% erro)
 * - 30% IQ 100 (eficiente, 6% erro)
 * - 20% IQ 110 (rápido, 2% erro)
 */

import { CODE_LENGTH, SYMBOLS } from './mastermindEngine';

export interface BotPlayer {
  id: string;
  name: string;
  iq: number;
  avatar: string;
  isBot: true;
}

export interface BotGameState {
  attempts: number;
  guessHistory: string[][];
  feedbackHistory: { whites: number; grays: number }[];
  status: 'playing' | 'won' | 'lost';
  score: number;
  finishTime?: number;
}

const BOT_NAMES = [
  'CyberMind', 'LogicBot', 'DeepThink', 'NeuroPlex',
  'SynthBrain', 'CodeBreaker', 'MindMeld', 'ByteLogic',
  'Axiom', 'Cerebrum', 'Cortex', 'Synapse',
  'Quantum', 'Vector', 'Matrix', 'Cipher',
];

const BOT_AVATARS = ['🤖', '🧠', '💻', '🎯', '⚡', '🔮', '🎲', '🌟', '🚀', '💡'];

/**
 * Distribui IQ entre bots baseado no range configurado.
 * Se iqMin/iqMax fornecidos, distribui uniformemente nesse range (steps de 10).
 * Default: 30% IQ80, 20% IQ90, 30% IQ100, 20% IQ110
 */
function assignBotIQ(index: number, totalBots: number, iqMin?: number, iqMax?: number): number {
  // Se range customizado, distribui uniformemente entre os steps disponíveis
  if (iqMin !== undefined && iqMax !== undefined && (iqMin !== 80 || iqMax !== 110)) {
    const steps: number[] = [];
    for (let iq = iqMin; iq <= iqMax; iq += 10) {
      steps.push(iq);
    }
    if (steps.length === 0) steps.push(iqMin);
    return steps[index % steps.length];
  }
  
  // Distribuição padrão
  const pct = (index / totalBots) * 100;
  if (pct < 30) return 80;
  if (pct < 50) return 90;
  if (pct < 80) return 100;
  return 110;
}

/**
 * Retorna a taxa de erro baseada no IQ
 */
function getErrorRate(iq: number): number {
  switch (iq) {
    case 80: return 0.20;
    case 90: return 0.12;
    case 100: return 0.06;
    case 110: return 0.02;
    default: return 0.15;
  }
}

/**
 * Cria um bot player com IQ distribuído
 */
export function createBot(index: number, totalBots: number = 99, iqMin?: number, iqMax?: number): BotPlayer {
  const name = BOT_NAMES[index % BOT_NAMES.length];
  const avatar = BOT_AVATARS[index % BOT_AVATARS.length];
  
  return {
    id: `bot-${index}-${Date.now()}`,
    name: `${name}${index > BOT_NAMES.length ? index : ''}`,
    iq: assignBotIQ(index, totalBots, iqMin, iqMax),
    avatar,
    isBot: true,
  };
}

/**
 * Gera intervalo de tempo aleatório para simular humano
 * Bots mais inteligentes pensam mais rápido
 */
export function getBotThinkTime(iq: number): number {
  // IQ80: 4-9s, IQ90: 3-7s, IQ100: 2-5s, IQ110: 1.5-4s
  const baseTime = Math.max(1500, 4000 - (iq - 80) * 80);
  const variance = Math.max(2000, 5000 - (iq - 80) * 80);
  const iqFactor = (100 - iq) / 100;
  
  return baseTime + Math.random() * variance + (iqFactor * 1000);
}

/**
 * Gera palpite do bot baseado no histórico e IQ
 * 
 * IQ 80:  20% erro, estratégia básica de eliminação
 * IQ 90:  12% erro, melhor retenção de posições
 * IQ 100:  6% erro, estratégia avançada com tracking de posições
 * IQ 110:  2% erro, quase perfeito, dedução precisa
 */
export function generateBotGuess(
  state: BotGameState,
  availableSymbols: readonly { id: string }[],
  iq: number = 80,
): string[] {
  const symbolIds = availableSymbols.map(s => s.id);
  
  // Primeira tentativa: palpite aleatório
  if (state.guessHistory.length === 0) {
    return getRandomGuess(symbolIds);
  }
  
  // Chance de erro baseada no IQ
  const errorRate = getErrorRate(iq);
  if (Math.random() < errorRate) {
    return getRandomGuess(symbolIds);
  }
  
  // Analisa histórico para deduzir
  const eliminatedSymbols = new Set<string>();
  const confirmedPositions: (string | null)[] = Array(CODE_LENGTH).fill(null);
  const symbolsInCode = new Set<string>();
  
  for (let i = 0; i < state.guessHistory.length; i++) {
    const guess = state.guessHistory[i];
    const feedback = state.feedbackHistory[i];
    
    if (feedback.whites === 0 && feedback.grays === 0) {
      guess.forEach(s => eliminatedSymbols.add(s));
    } else {
      guess.forEach(s => symbolsInCode.add(s));
    }
    
    if (feedback.whites === CODE_LENGTH) {
      return guess;
    }
  }
  
  const lastGuess = state.guessHistory[state.guessHistory.length - 1];
  const lastFeedback = state.feedbackHistory[state.feedbackHistory.length - 1];
  
  // IQ >= 100: tracking avançado de posições confirmadas
  if (iq >= 100 && state.guessHistory.length >= 2) {
    // Compara pares de tentativas para deduzir posições exatas
    for (let i = 0; i < state.guessHistory.length - 1; i++) {
      const g1 = state.guessHistory[i];
      const f1 = state.feedbackHistory[i];
      const g2 = state.guessHistory[i + 1];
      const f2 = state.feedbackHistory[i + 1];
      
      // Se uma posição manteve o mesmo símbolo e whites aumentou ou manteve
      for (let pos = 0; pos < CODE_LENGTH; pos++) {
        if (g1[pos] === g2[pos] && f2.whites >= f1.whites && f1.whites > 0) {
          // Provável posição confirmada (heurística)
          if (iq >= 110 || Math.random() < 0.7) {
            confirmedPositions[pos] = g1[pos];
          }
        }
      }
    }
  }
  
  const newGuess: string[] = [];
  const usedSymbols = new Set<string>();
  const available = symbolIds.filter(s => !eliminatedSymbols.has(s));
  
  // IQ >= 100: usa posições confirmadas primeiro
  if (iq >= 100) {
    for (let pos = 0; pos < CODE_LENGTH; pos++) {
      if (confirmedPositions[pos]) {
        newGuess[pos] = confirmedPositions[pos]!;
        usedSymbols.add(confirmedPositions[pos]!);
      }
    }
  }
  
  // Mantém símbolos com whites
  if (lastFeedback.whites > 0) {
    const keepCount = iq >= 90 
      ? Math.min(lastFeedback.whites, CODE_LENGTH - 1) 
      : Math.min(lastFeedback.whites, CODE_LENGTH - 2);
    
    let kept = 0;
    for (let pos = 0; pos < CODE_LENGTH && kept < keepCount; pos++) {
      if (newGuess[pos]) continue; // já confirmado
      if (!usedSymbols.has(lastGuess[pos])) {
        // IQ >= 90: tenta manter na mesma posição (mais inteligente)
        if (iq >= 90) {
          newGuess[pos] = lastGuess[pos];
        } else {
          newGuess.push(lastGuess[pos]);
        }
        usedSymbols.add(lastGuess[pos]);
        kept++;
      }
    }
  }
  
  // Inclui símbolos com grays em novas posições
  if (lastFeedback.grays > 0) {
    const graySymbols = lastGuess.filter(s => !usedSymbols.has(s));
    const toAdd = graySymbols.slice(0, Math.min(lastFeedback.grays, CODE_LENGTH));
    
    for (const s of toAdd) {
      if (usedSymbols.has(s)) continue;
      // Encontra posição vazia diferente da original
      for (let pos = 0; pos < CODE_LENGTH; pos++) {
        if (!newGuess[pos] && lastGuess[pos] !== s) {
          newGuess[pos] = s;
          usedSymbols.add(s);
          break;
        }
      }
    }
  }
  
  // Completa posições vazias com símbolos disponíveis
  const remaining = shuffleArray(available.filter(s => !usedSymbols.has(s)));
  for (let pos = 0; pos < CODE_LENGTH; pos++) {
    if (!newGuess[pos] && remaining.length > 0) {
      newGuess[pos] = remaining.pop()!;
      usedSymbols.add(newGuess[pos]);
    }
  }
  
  // Fallback se ainda faltam
  if (newGuess.filter(Boolean).length < CODE_LENGTH) {
    const fallback = shuffleArray(symbolIds.filter(s => !usedSymbols.has(s)));
    for (let pos = 0; pos < CODE_LENGTH; pos++) {
      if (!newGuess[pos] && fallback.length > 0) {
        newGuess[pos] = fallback.pop()!;
      }
    }
  }
  
  // IQ80: embaralha (não otimiza posições perfeitamente)
  if (iq <= 80) {
    return shuffleArray(newGuess.filter(Boolean)).slice(0, CODE_LENGTH);
  }
  
  return newGuess.filter(Boolean).slice(0, CODE_LENGTH);
}

function getRandomGuess(symbolIds: string[]): string[] {
  return shuffleArray([...symbolIds]).slice(0, CODE_LENGTH);
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Simula uma partida completa do bot usando seu IQ real
 */
export function simulateBotGame(
  secret: string[],
  availableSymbols: readonly { id: string }[],
  maxAttempts: number = 8,
  gameDuration: number = 180,
  botIQ: number = 80,
): BotGameState {
  const state: BotGameState = {
    attempts: 0,
    guessHistory: [],
    feedbackHistory: [],
    status: 'playing',
    score: 0,
  };
  
  let timeSpent = 0;
  const POINTS = { WHITE: 60, GRAY: 25, WIN: 1000 };
  
  while (state.status === 'playing' && state.attempts < maxAttempts) {
    const thinkTime = getBotThinkTime(botIQ) / 1000;
    timeSpent += thinkTime;
    
    if (timeSpent >= gameDuration) {
      state.status = 'lost';
      state.finishTime = 0;
      break;
    }
    
    const guess = generateBotGuess(state, availableSymbols, botIQ);
    state.guessHistory.push(guess);
    
    const feedback = evaluateGuessSim(secret, guess);
    state.feedbackHistory.push(feedback);
    state.attempts++;
    
    state.score += (feedback.whites * POINTS.WHITE) + (feedback.grays * POINTS.GRAY);
    
    if (feedback.whites === CODE_LENGTH) {
      state.status = 'won';
      state.finishTime = Math.max(0, gameDuration - timeSpent);
      
      state.score += POINTS.WIN;
      if (state.finishTime > 120) state.score += 700;
      else if (state.finishTime >= 60) state.score += 500;
      else if (state.finishTime >= 30) state.score += 300;
      else state.score += 100;
      
      break;
    }
  }
  
  if (state.status === 'playing') {
    state.status = 'lost';
    state.finishTime = Math.max(0, gameDuration - timeSpent);
  }
  
  return state;
}

function evaluateGuessSim(secret: string[], guess: string[]): { whites: number; grays: number } {
  let whites = 0;
  let grays = 0;
  
  const secretCopy = [...secret];
  const guessCopy = [...guess];
  
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessCopy[i] === secretCopy[i]) {
      whites++;
      secretCopy[i] = '';
      guessCopy[i] = '';
    }
  }
  
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessCopy[i] === '') continue;
    const idx = secretCopy.indexOf(guessCopy[i]);
    if (idx !== -1) {
      grays++;
      secretCopy[idx] = '';
    }
  }
  
  return { whites, grays };
}
