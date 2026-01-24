/**
 * currencyUtils - Helpers to avoid floating-point errors for k$ currency.
 *
 * All operations convert to integer cents (1 k$ = 100 cents) before math
 * and then convert back to a 2-decimal string/number.
 */

const SKEMA_BOX_KEY = 'skema_box_balance';

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
 * Sets the Skema Box balance in localStorage.
 * Ensures the value is stored with 2 decimal places.
 */
export function setSkemaBoxBalance(value: number): void {
  const safe = roundCurrency(value);
  localStorage.setItem(SKEMA_BOX_KEY, safe.toFixed(2));
}

/**
 * Adds an amount to the Skema Box balance and persists.
 * Returns the new balance.
 */
export function addToSkemaBox(amount: number): number {
  const current = getSkemaBoxBalance();
  const next = addCurrency(current, amount);
  setSkemaBoxBalance(next);
  return next;
}

/**
 * Subtracts an amount from the Skema Box balance and persists.
 * Will not go below zero.
 * Returns the new balance.
 */
export function subtractFromSkemaBox(amount: number): number {
  const current = getSkemaBoxBalance();
  const next = Math.max(0, subtractCurrency(current, amount));
  setSkemaBoxBalance(next);
  return next;
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
