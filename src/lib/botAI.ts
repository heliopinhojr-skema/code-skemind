/**
 * Bot AI para SKEMIND - IQ80 (velocidade variável, erros ocasionais)
 * 
 * Estratégia:
 * - Começa com palpite aleatório
 * - Usa feedback para refinar, mas comete erros às vezes
 * - Velocidade varia para simular humanos
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
  finishTime?: number; // segundos restantes ao terminar
}

// Nomes aleatórios para bots
const BOT_NAMES = [
  'CyberMind', 'LogicBot', 'DeepThink', 'NeuroPlex',
  'SynthBrain', 'CodeBreaker', 'MindMeld', 'ByteLogic',
  'Axiom', 'Cerebrum', 'Cortex', 'Synapse',
  'Quantum', 'Vector', 'Matrix', 'Cipher',
];

const BOT_AVATARS = ['🤖', '🧠', '💻', '🎯', '⚡', '🔮', '🎲', '🌟', '🚀', '💡'];

/**
 * Cria um bot player
 */
export function createBot(index: number): BotPlayer {
  const name = BOT_NAMES[index % BOT_NAMES.length];
  const avatar = BOT_AVATARS[index % BOT_AVATARS.length];
  
  return {
    id: `bot-${index}-${Date.now()}`,
    name: `${name}${index > BOT_NAMES.length ? index : ''}`,
    iq: 80,
    avatar,
    isBot: true,
  };
}

/**
 * Gera intervalo de tempo aleatório para simular humano (IQ80 = mais lento)
 * Retorna milissegundos
 */
export function getBotThinkTime(iq: number): number {
  // IQ80 pensa entre 3-8 segundos por jogada
  const baseTime = 3000;
  const variance = 5000;
  const iqFactor = (100 - iq) / 100; // IQ80 = 0.2 factor
  
  return baseTime + Math.random() * variance + (iqFactor * 2000);
}

/**
 * Gera palpite do bot baseado no histórico
 * IQ80 = comete erros ocasionais, nem sempre usa feedback corretamente
 */
export function generateBotGuess(
  state: BotGameState,
  availableSymbols: readonly { id: string }[],
): string[] {
  const symbolIds = availableSymbols.map(s => s.id);
  
  // Primeira tentativa: palpite aleatório
  if (state.guessHistory.length === 0) {
    return getRandomGuess(symbolIds);
  }
  
  const lastGuess = state.guessHistory[state.guessHistory.length - 1];
  const lastFeedback = state.feedbackHistory[state.feedbackHistory.length - 1];
  
  // IQ80: 30% de chance de ignorar feedback e fazer palpite aleatório
  if (Math.random() < 0.3) {
    return getRandomGuess(symbolIds);
  }
  
  // Tenta usar feedback de forma simplificada
  // Mantém símbolos que tiveram match (whites ou grays)
  const totalMatches = lastFeedback.whites + lastFeedback.grays;
  
  if (totalMatches === 0) {
    // Nenhum match - usa símbolos diferentes
    const unusedSymbols = symbolIds.filter(id => !lastGuess.includes(id));
    if (unusedSymbols.length >= CODE_LENGTH) {
      return shuffleArray(unusedSymbols).slice(0, CODE_LENGTH);
    }
  }
  
  // IQ80: estratégia simples - troca posições aleatoriamente mantendo alguns símbolos
  const keptSymbols = lastGuess.slice(0, Math.min(totalMatches, CODE_LENGTH - 1));
  const otherSymbols = symbolIds.filter(id => !keptSymbols.includes(id));
  const neededCount = CODE_LENGTH - keptSymbols.length;
  
  const newSymbols = shuffleArray(otherSymbols).slice(0, neededCount);
  const guess = shuffleArray([...keptSymbols, ...newSymbols]);
  
  return guess.slice(0, CODE_LENGTH);
}

/**
 * Palpite completamente aleatório
 */
function getRandomGuess(symbolIds: string[]): string[] {
  return shuffleArray([...symbolIds]).slice(0, CODE_LENGTH);
}

/**
 * Fisher-Yates shuffle
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Simula uma partida completa do bot
 * Retorna o estado final
 */
export function simulateBotGame(
  secret: string[],
  availableSymbols: readonly { id: string }[],
  maxAttempts: number = 8,
  gameDuration: number = 180,
): BotGameState {
  const state: BotGameState = {
    attempts: 0,
    guessHistory: [],
    feedbackHistory: [],
    status: 'playing',
    score: 0,
  };
  
  // Simula tempo gasto (IQ80 demora mais)
  let timeSpent = 0;
  const POINTS = { WHITE: 60, GRAY: 25, WIN: 1000 };
  
  while (state.status === 'playing' && state.attempts < maxAttempts) {
    // Tempo para pensar
    const thinkTime = getBotThinkTime(80) / 1000; // segundos
    timeSpent += thinkTime;
    
    // Verifica se tempo acabou
    if (timeSpent >= gameDuration) {
      state.status = 'lost';
      state.finishTime = 0;
      break;
    }
    
    // Gera palpite
    const guess = generateBotGuess(state, availableSymbols);
    state.guessHistory.push(guess);
    
    // Avalia (simplificado - não usa evaluateGuess para evitar circular dep)
    const feedback = evaluateGuessSim(secret, guess);
    state.feedbackHistory.push(feedback);
    state.attempts++;
    
    // Pontuação
    state.score += (feedback.whites * POINTS.WHITE) + (feedback.grays * POINTS.GRAY);
    
    // Vitória?
    if (feedback.whites === CODE_LENGTH) {
      state.status = 'won';
      state.finishTime = Math.max(0, gameDuration - timeSpent);
      
      // Bônus de vitória + tempo
      state.score += POINTS.WIN;
      if (state.finishTime > 120) state.score += 700;
      else if (state.finishTime >= 60) state.score += 500;
      else if (state.finishTime >= 30) state.score += 300;
      else state.score += 100;
      
      break;
    }
  }
  
  // Se não venceu e chegou ao limite
  if (state.status === 'playing') {
    state.status = 'lost';
    state.finishTime = Math.max(0, gameDuration - timeSpent);
  }
  
  return state;
}

/**
 * Avalia palpite (versão simplificada para simulação)
 */
function evaluateGuessSim(secret: string[], guess: string[]): { whites: number; grays: number } {
  let whites = 0;
  let grays = 0;
  
  const secretCopy = [...secret];
  const guessCopy = [...guess];
  
  // Brancos (posição exata)
  for (let i = 0; i < CODE_LENGTH; i++) {
    if (guessCopy[i] === secretCopy[i]) {
      whites++;
      secretCopy[i] = '';
      guessCopy[i] = '';
    }
  }
  
  // Cinzas (símbolo correto, posição errada)
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
