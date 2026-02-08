/**
 * arenaPayouts - Tabela de pagamento estilo poker para Arena x Bots
 * 
 * Base: 100 jogadores, 25 ITM (25% do field)
 * Pool base: k$50.00 (100 × k$0.50 buy-in)
 * 
 * Estrutura escalável:
 * - Percentuais fixos aplicados ao pool total
 * - Pool escala com buy_in: pool = 100 × net_buy_in
 * - net_buy_in = buy_in - rake (rake ≈ 9.09% do buy_in)
 * 
 * Todos os valores em CENTAVOS para evitar floating-point.
 */

/** Número de posições pagas (25% de 100) */
export const ITM_POSITIONS = 25;

/**
 * Tabela de pagamento em MILÉSIMOS (‰) do pool total.
 * Soma = 1000‰ = 100%
 */
const PAYOUT_PERMIL: Record<number, number> = {
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
const _TOTAL_PERMIL = Object.values(PAYOUT_PERMIL).reduce((a, b) => a + b, 0);
if (_TOTAL_PERMIL !== 1000) {
  console.error(`[ARENA PAYOUTS] ❌ Soma dos permil errada: ${_TOTAL_PERMIL} (esperado 1000)`);
}

/**
 * Calcula o pool total para uma arena com buy-in e bot_count customizados.
 * total_players = bot_count + 1 (humano)
 * net_buy_in = buy_in - rake_fee
 * pool = total_players × net_buy_in
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
 * Retorna o prêmio em k$ para uma posição no ranking, dado um pool total.
 * Retorna 0 se a posição não é ITM (> 25).
 */
export function getScaledArenaPrize(rank: number, pool: number): number {
  const permil = PAYOUT_PERMIL[rank];
  if (!permil) return 0;
  // prize = pool × (permil / 1000), arredondado para 2 casas
  return Math.round(pool * permil / 1000 * 100) / 100;
}

/**
 * Retorna o prêmio em centavos para uma posição, dado um pool total.
 */
export function getScaledArenaPrizeCents(rank: number, pool: number): number {
  const permil = PAYOUT_PERMIL[rank];
  if (!permil) return 0;
  return Math.round(pool * permil / 1000 * 100);
}

// ========== Compatibilidade com arena padrão (k$0.55 buy-in) ==========

/** Pool padrão: 100 × k$0.50 = k$50.00 */
const DEFAULT_POOL = 50;

/**
 * Retorna o prêmio em k$ para a arena padrão (buy-in k$0.55).
 * Mantém backward-compatibility.
 */
export function getArenaPrize(rank: number): number {
  return getScaledArenaPrize(rank, DEFAULT_POOL);
}

/**
 * Retorna o prêmio em centavos para a arena padrão.
 */
export function getArenaPrizeCents(rank: number): number {
  return getScaledArenaPrizeCents(rank, DEFAULT_POOL);
}

/**
 * Verifica se uma posição está ITM (In The Money).
 */
export function isITM(rank: number): boolean {
  return rank >= 1 && rank <= ITM_POSITIONS;
}

/**
 * Retorna a tabela completa de pagamento formatada para um pool dado.
 */
export function getPayoutSummary(pool: number = DEFAULT_POOL): Array<{
  positions: string;
  prizeEach: number;
  label: string;
}> {
  return [
    { positions: '1º',      prizeEach: getScaledArenaPrize(1, pool),  label: 'Campeão' },
    { positions: '2º',      prizeEach: getScaledArenaPrize(2, pool),  label: 'Vice' },
    { positions: '3º',      prizeEach: getScaledArenaPrize(3, pool),  label: 'Bronze' },
    { positions: '4º',      prizeEach: getScaledArenaPrize(4, pool),  label: '' },
    { positions: '5º',      prizeEach: getScaledArenaPrize(5, pool),  label: '' },
    { positions: '6º',      prizeEach: getScaledArenaPrize(6, pool),  label: '' },
    { positions: '7º',      prizeEach: getScaledArenaPrize(7, pool),  label: '' },
    { positions: '8º',      prizeEach: getScaledArenaPrize(8, pool),  label: '' },
    { positions: '9º',      prizeEach: getScaledArenaPrize(9, pool),  label: '' },
    { positions: '10º',     prizeEach: getScaledArenaPrize(10, pool), label: '' },
    { positions: '11º-15º', prizeEach: getScaledArenaPrize(11, pool), label: '' },
    { positions: '16º-20º', prizeEach: getScaledArenaPrize(16, pool), label: '' },
    { positions: '21º-25º', prizeEach: getScaledArenaPrize(21, pool), label: 'Min-cash' },
  ];
}

/**
 * Pre-defined arena buy-in options for Grão Mestre+ to create.
 * buy_in = total entry fee (includes rake)
 * rake_fee ≈ 9.09% of buy_in (same ratio as k$0.05/k$0.55)
 */
export const ARENA_BUY_IN_OPTIONS = [
  { buyIn: 0.55,  rakeFee: 0.05,  label: 'k$ 0,55' },
  { buyIn: 1.10,  rakeFee: 0.10,  label: 'k$ 1,10' },
  { buyIn: 2.20,  rakeFee: 0.20,  label: 'k$ 2,20' },
  { buyIn: 3.30,  rakeFee: 0.30,  label: 'k$ 3,30' },
  { buyIn: 5.50,  rakeFee: 0.50,  label: 'k$ 5,50' },
  { buyIn: 11.00, rakeFee: 1.00,  label: 'k$ 11,00' },
];

/**
 * Bot count options for custom arenas.
 */
export const ARENA_BOT_OPTIONS = [3, 9, 19, 49, 99];
