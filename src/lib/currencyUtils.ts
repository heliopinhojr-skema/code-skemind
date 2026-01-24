/**
 * currencyUtils - Helpers to avoid floating-point errors for k$ currency.
 *
 * All operations convert to integer cents (1 k$ = 100 cents) before math
 * and then convert back to a 2-decimal string/number.
 */

const SKEMA_BOX_KEY = 'skema_box_balance';
const SKEMA_BOX_LOG_KEY = 'skema_box_transactions';

// ==================== TRANSACTION LOG ====================

export interface SkemaBoxTransaction {
  id: string;
  timestamp: string;
  type: 'arena_rake' | 'official_rake' | 'official_refund' | 'party_rake' | 'reset' | 'adjustment';
  amount: number;       // Positive = credit, Negative = debit
  balanceAfter: number; // Saldo após transação
  description: string;
}

/**
 * Reads all Skema Box transactions from localStorage.
 */
export function getSkemaBoxTransactions(): SkemaBoxTransaction[] {
  try {
    const raw = localStorage.getItem(SKEMA_BOX_LOG_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SkemaBoxTransaction[];
  } catch {
    return [];
  }
}

/**
 * Logs a transaction to the Skema Box history.
 */
function logTransaction(
  type: SkemaBoxTransaction['type'],
  amount: number,
  balanceAfter: number,
  description: string
): void {
  const transaction: SkemaBoxTransaction = {
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    type,
    amount,
    balanceAfter,
    description,
  };

  const transactions = getSkemaBoxTransactions();
  // Mantém últimas 100 transações
  const updated = [transaction, ...transactions].slice(0, 100);
  localStorage.setItem(SKEMA_BOX_LOG_KEY, JSON.stringify(updated));
  
  console.log(`[SKEMA BOX TX] ${type}: ${amount >= 0 ? '+' : ''}${amount.toFixed(2)} → Saldo: ${balanceAfter.toFixed(2)}`);
}

/**
 * Clears the transaction log.
 */
export function clearSkemaBoxTransactions(): void {
  localStorage.removeItem(SKEMA_BOX_LOG_KEY);
}

// ==================== SKEMA BOX BALANCE ====================

/**
 * Reads the current Skema Box balance from localStorage.
 * Returns a number with at most 2 decimal places.
 */
export function getSkemaBoxBalance(): number {
  const raw = localStorage.getItem(SKEMA_BOX_KEY);
  if (!raw) return 0;
  const parsed = parseFloat(raw);
  return Number.isFinite(parsed) ? roundCurrency(parsed) : 0;
}

/**
 * Sets the Skema Box balance in localStorage (internal use).
 * Ensures the value is stored with 2 decimal places.
 */
function setSkemaBoxBalanceInternal(value: number): void {
  const safe = roundCurrency(value);
  localStorage.setItem(SKEMA_BOX_KEY, safe.toFixed(2));
}

/**
 * Sets the Skema Box balance (with logging for reset/adjustment).
 */
export function setSkemaBoxBalance(value: number, reason: string = 'manual'): void {
  const oldBalance = getSkemaBoxBalance();
  const safe = roundCurrency(value);
  setSkemaBoxBalanceInternal(safe);
  
  if (reason !== 'silent') {
    const diff = subtractCurrency(safe, oldBalance);
    logTransaction(
      reason === 'reset' ? 'reset' : 'adjustment',
      diff,
      safe,
      reason === 'reset' ? 'Skema Box zerado pelo Guardian' : `Ajuste: ${reason}`
    );
  }
}

/**
 * Adds an amount to the Skema Box balance and persists.
 * Returns the new balance.
 */
export function addToSkemaBox(
  amount: number,
  type: 'arena_rake' | 'official_rake' | 'party_rake' = 'arena_rake',
  description?: string
): number {
  const current = getSkemaBoxBalance();
  const next = addCurrency(current, amount);
  setSkemaBoxBalanceInternal(next);
  
  const desc = description || getDefaultDescription(type, amount);
  logTransaction(type, amount, next, desc);
  
  return next;
}

/**
 * Subtracts an amount from the Skema Box balance and persists.
 * Will not go below zero.
 * Returns the new balance.
 */
export function subtractFromSkemaBox(
  amount: number,
  type: 'official_refund' | 'adjustment' = 'official_refund',
  description?: string
): number {
  const current = getSkemaBoxBalance();
  const next = Math.max(0, subtractCurrency(current, amount));
  setSkemaBoxBalanceInternal(next);
  
  const desc = description || getDefaultDescription(type, -amount);
  logTransaction(type, -amount, next, desc);
  
  return next;
}

function getDefaultDescription(type: SkemaBoxTransaction['type'], amount: number): string {
  switch (type) {
    case 'arena_rake':
      return `Arena x Bots: rake de 10 jogadores (k$${Math.abs(amount).toFixed(2)})`;
    case 'official_rake':
      return `Corrida Oficial: taxa de inscrição (k$${Math.abs(amount).toFixed(2)})`;
    case 'official_refund':
      return `Corrida Oficial: devolução de taxa (k$${Math.abs(amount).toFixed(2)})`;
    case 'party_rake':
      return `Modo Festa: rake do torneio (k$${Math.abs(amount).toFixed(2)})`;
    default:
      return `Transação: k$${amount.toFixed(2)}`;
  }
}

// ===================== Safe currency math =====================

/**
 * Converts a currency value to integer cents.
 */
function toCents(value: number): number {
  return Math.round(value * 100);
}

/**
 * Converts integer cents back to currency with 2 decimals.
 */
function fromCents(cents: number): number {
  return cents / 100;
}

/**
 * Rounds a currency value to exactly 2 decimal places.
 */
export function roundCurrency(value: number): number {
  return fromCents(toCents(value));
}

/**
 * Adds two currency values without floating-point drift.
 */
export function addCurrency(a: number, b: number): number {
  return fromCents(toCents(a) + toCents(b));
}

/**
 * Subtracts two currency values without floating-point drift.
 */
export function subtractCurrency(a: number, b: number): number {
  return fromCents(toCents(a) - toCents(b));
}
