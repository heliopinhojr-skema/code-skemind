/**
 * arenaPayouts - Tabela de pagamento estilo poker para Arena x Bots
 * 
 * ITM = 25% do field (dinâmico)
 * Pool base: total_players × net_buy_in
 * 
 * Estrutura escalável:
 * - Percentuais fixos aplicados ao pool total
 * - Pool escala com buy_in
 * - net_buy_in = buy_in - rake (rake ≈ 9.09% do buy_in)
 * 
 * Todos os valores em CENTAVOS para evitar floating-point.
 */

/** Percentual do field que recebe prêmio */
export const ITM_PERCENT = 0.25;

/** Número legado de posições pagas (100 players) - backward compat */
export const ITM_POSITIONS = 25;

/**
 * Calcula quantas posições são pagas (25% do field, mínimo 1).
 */
export function getITMCount(totalPlayers: number): number {
  return Math.max(1, Math.floor(totalPlayers * ITM_PERCENT));
}

/**
 * Tabela de pagamento em MILÉSIMOS (‰) do pool total para até 25 posições.
 * Para fields menores, redistribui os ‰ das posições cortadas.
 */
const PAYOUT_PERMIL_25: Record<number, number> = {
  1:  270,  // 27.0%
  2:  160,  // 16.0%
  3:  100,  // 10.0%
  4:   70,  //  7.0%
  5:   55,  //  5.5%
  6:   40,  //  4.0%
  7:   35,  //  3.5%
  8:   30,  //  3.0%
  9:   25,  //  2.5%
  10:  20,  //  2.0%
  // 11-15: 15‰ cada (1.5%)
  11: 15, 12: 15, 13: 15, 14: 15, 15: 15,
  // 16-20: 13‰ cada (1.3%)
  16: 13, 17: 13, 18: 13, 19: 13, 20: 13,
  // 21-25: 11‰ cada (1.1%)
  21: 11, 22: 11, 23: 11, 24: 11, 25: 11,
};

// Validação estática: soma = 1000‰
const _TOTAL_PERMIL = Object.values(PAYOUT_PERMIL_25).reduce((a, b) => a + b, 0);
if (_TOTAL_PERMIL !== 1000) {
  console.error(`[ARENA PAYOUTS] ❌ Soma dos permil errada: ${_TOTAL_PERMIL} (esperado 1000)`);
}

/**
 * Gera tabela de pagamento dinâmica para N posições ITM.
 * Pega os top N da tabela de 25 e redistribui os ‰ restantes proporcionalmente.
 */
function buildPayoutTable(itmCount: number): Record<number, number> {
  if (itmCount >= 25) return { ...PAYOUT_PERMIL_25 };
  
  // Soma dos ‰ das posições que existem
  let usedPermil = 0;
  const table: Record<number, number> = {};
  
  for (let i = 1; i <= itmCount; i++) {
    table[i] = PAYOUT_PERMIL_25[i] || 11;
    usedPermil += table[i];
  }
  
  // Redistribui o restante (1000 - usedPermil) proporcionalmente
  const remaining = 1000 - usedPermil;
  if (remaining > 0 && itmCount > 0) {
    for (let i = 1; i <= itmCount; i++) {
      const share = Math.floor(remaining * (table[i] / usedPermil));
      table[i] += share;
    }
    // Ajusta arredondamento no 1º lugar
    const newTotal = Object.values(table).reduce((a, b) => a + b, 0);
    table[1] += (1000 - newTotal);
  }
  
  return table;
}

/**
 * Calcula o pool total para uma arena com buy-in e bot_count customizados.
 */
export function calculateArenaPool(buyIn: number, rakeFee: number, botCount: number = 99): number {
  const totalPlayers = botCount + 1;
  const netBuyIn = buyIn - rakeFee;
  return totalPlayers * netBuyIn;
}

/**
 * Calcula o rake total de uma arena.
 */
export function calculateTotalRake(rakeFee: number, botCount: number = 99): number {
  return (botCount + 1) * rakeFee;
}

/**
 * Retorna o prêmio em k$ para uma posição no ranking.
 * totalPlayers é usado para calcular ITM dinâmico (25% do field).
 */
export function getScaledArenaPrize(rank: number, pool: number, totalPlayers: number = 100): number {
  const itmCount = getITMCount(totalPlayers);
  if (rank < 1 || rank > itmCount) return 0;
  
  const table = buildPayoutTable(itmCount);
  const permil = table[rank];
  if (!permil) return 0;
  
  return Math.round(pool * permil / 1000 * 100) / 100;
}

/**
 * Retorna o prêmio em centavos para uma posição.
 */
export function getScaledArenaPrizeCents(rank: number, pool: number, totalPlayers: number = 100): number {
  const itmCount = getITMCount(totalPlayers);
  if (rank < 1 || rank > itmCount) return 0;
  
  const table = buildPayoutTable(itmCount);
  const permil = table[rank];
  if (!permil) return 0;
  
  return Math.round(pool * permil / 1000 * 100);
}

// ========== Compatibilidade com arena padrão (k$0.55 buy-in) ==========

/** Pool padrão: 100 × k$0.50 = k$50.00 */
const DEFAULT_POOL = 50;

/**
 * Retorna o prêmio em k$ para a arena padrão (100 players).
 */
export function getArenaPrize(rank: number): number {
  return getScaledArenaPrize(rank, DEFAULT_POOL, 100);
}

/**
 * Retorna o prêmio em centavos para a arena padrão.
 */
export function getArenaPrizeCents(rank: number): number {
  return getScaledArenaPrizeCents(rank, DEFAULT_POOL, 100);
}

/**
 * Verifica se uma posição está ITM (In The Money).
 */
export function isITM(rank: number, totalPlayers: number = 100): boolean {
  return rank >= 1 && rank <= getITMCount(totalPlayers);
}

/**
 * Retorna a tabela completa de pagamento formatada para um pool dado.
 */
export function getPayoutSummary(pool: number = DEFAULT_POOL, totalPlayers: number = 100): Array<{
  positions: string;
  prizeEach: number;
  label: string;
}> {
  const itmCount = getITMCount(totalPlayers);
  const table = buildPayoutTable(itmCount);
  const result: Array<{ positions: string; prizeEach: number; label: string }> = [];
  
  const labels: Record<number, string> = { 1: 'Campeão', 2: 'Vice', 3: 'Bronze' };
  
  let i = 1;
  while (i <= itmCount) {
    // Check if next positions have same permil value for grouping
    let j = i + 1;
    while (j <= itmCount && table[j] === table[i]) j++;
    
    const count = j - i;
    const positions = count === 1 ? `${i}º` : `${i}º-${j - 1}º`;
    const label = i <= 3 ? (labels[i] || '') : (j - 1 === itmCount ? 'Min-cash' : '');
    
    result.push({
      positions,
      prizeEach: Math.round(pool * table[i] / 1000 * 100) / 100,
      label,
    });
    
    i = j;
  }
  
  return result;
}

/**
 * Taxa fixa de rake: 9.09% (1/11 do buy-in total).
 */
export const RAKE_RATE = 1 / 11;

/**
 * Calcula buy-in e rake a partir de um valor total de entrada.
 */
export function computeBuyInAndRake(totalEntry: number): { buyIn: number; rakeFee: number } {
  const rakeFee = Math.round(totalEntry * RAKE_RATE * 100) / 100;
  return { buyIn: totalEntry, rakeFee };
}

/**
 * Pre-defined arena buy-in options.
 */
export const ARENA_BUY_IN_OPTIONS = [
  { buyIn: 0.55,  rakeFee: 0.05,  label: 'k$ 0,55' },
  { buyIn: 1.10,  rakeFee: 0.10,  label: 'k$ 1,10' },
  { buyIn: 2.20,  rakeFee: 0.20,  label: 'k$ 2,20' },
  { buyIn: 5.50,  rakeFee: 0.50,  label: 'k$ 5,50' },
  { buyIn: 11.00, rakeFee: 1.00,  label: 'k$ 11,00' },
];

/**
 * Bot count options for custom arenas.
 */
export const ARENA_BOT_OPTIONS = [3, 9, 19, 49, 99];
