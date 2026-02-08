/**
 * arenaPayouts - Tabela de pagamento estilo poker para Arena x Bots
 * 
 * 100 jogadores, 25 ITM (25% do field)
 * Pool total: k$50.00 (100 × k$0.50 buy-in)
 * 
 * Estrutura graduada:
 * - Top 3: prêmios grandes (bolada)
 * - 4º-10º: prêmios médios decrescentes
 * - 11º-25º: min-cash (pelo menos o buy-in de volta)
 * 
 * Todos os valores em CENTAVOS para evitar floating-point.
 * Soma total = 5000 cents = k$50.00 ✓
 */

/** Número de posições pagas (25% de 100) */
export const ITM_POSITIONS = 25;

/**
 * Tabela de pagamento em centavos por posição.
 * Posições 1-10: valores individuais
 * Posições 11-15: k$0.75 cada
 * Posições 16-20: k$0.65 cada
 * Posições 21-25: k$0.55 cada (min-cash = entry fee)
 */
const PAYOUT_CENTS: Record<number, number> = {
  1:  1350,  // k$13.50  (27.0%)
  2:   800,  // k$ 8.00  (16.0%)
  3:   500,  // k$ 5.00  (10.0%)
  4:   350,  // k$ 3.50  ( 7.0%)
  5:   275,  // k$ 2.75  ( 5.5%)
  6:   200,  // k$ 2.00  ( 4.0%)
  7:   175,  // k$ 1.75  ( 3.5%)
  8:   150,  // k$ 1.50  ( 3.0%)
  9:   125,  // k$ 1.25  ( 2.5%)
  10:  100,  // k$ 1.00  ( 2.0%)
  // 11-15: 75 cents cada (k$0.75)
  11: 75, 12: 75, 13: 75, 14: 75, 15: 75,
  // 16-20: 65 cents cada (k$0.65)
  16: 65, 17: 65, 18: 65, 19: 65, 20: 65,
  // 21-25: 55 cents cada (k$0.55) — min-cash = entry fee
  21: 55, 22: 55, 23: 55, 24: 55, 25: 55,
};

/**
 * Retorna o prêmio em k$ para uma posição no ranking.
 * Retorna 0 se a posição não é ITM (> 25).
 */
export function getArenaPrize(rank: number): number {
  const cents = PAYOUT_CENTS[rank];
  if (!cents) return 0;
  return cents / 100;
}

/**
 * Retorna o prêmio em centavos para uma posição.
 */
export function getArenaPrizeCents(rank: number): number {
  return PAYOUT_CENTS[rank] ?? 0;
}

/**
 * Verifica se uma posição está ITM (In The Money).
 */
export function isITM(rank: number): boolean {
  return rank >= 1 && rank <= ITM_POSITIONS;
}

/**
 * Retorna a tabela completa de pagamento formatada.
 * Útil para exibição na UI.
 */
export function getPayoutSummary(): Array<{
  positions: string;
  prizeEach: number;
  label: string;
}> {
  return [
    { positions: '1º',      prizeEach: 13.50, label: 'Campeão' },
    { positions: '2º',      prizeEach: 8.00,  label: 'Vice' },
    { positions: '3º',      prizeEach: 5.00,  label: 'Bronze' },
    { positions: '4º',      prizeEach: 3.50,  label: '' },
    { positions: '5º',      prizeEach: 2.75,  label: '' },
    { positions: '6º',      prizeEach: 2.00,  label: '' },
    { positions: '7º',      prizeEach: 1.75,  label: '' },
    { positions: '8º',      prizeEach: 1.50,  label: '' },
    { positions: '9º',      prizeEach: 1.25,  label: '' },
    { positions: '10º',     prizeEach: 1.00,  label: '' },
    { positions: '11º-15º', prizeEach: 0.75,  label: '' },
    { positions: '16º-20º', prizeEach: 0.65,  label: '' },
    { positions: '21º-25º', prizeEach: 0.55,  label: 'Min-cash' },
  ];
}

// Validação estática: soma = 5000 cents
const _TOTAL = Object.values(PAYOUT_CENTS).reduce((a, b) => a + b, 0);
if (_TOTAL !== 5000) {
  console.error(`[ARENA PAYOUTS] ❌ Soma da tabela errada: ${_TOTAL} (esperado 5000)`);
}
