/**
 * money.ts
 *
 * Money handling for Ampersand LIVE Console.
 *
 * All monetary amounts in the DB use numeric(18,2). In JS we keep amounts as
 * plain numbers but ALWAYS round to 2 decimals after any multiplication so we
 * never persist float drift (e.g. 0.1 + 0.2). Conversions between USD and PHP
 * always go through usdToPhp() so the FX rate is applied consistently.
 *
 * Rule (from the spec): never recalculate historical orders using the current
 * product price or current FX. Callers must pass the *snapshotted* fx rate.
 */

export type Currency = 'PHP' | 'USD';

/** Round to 2 decimal places, correcting for float representation error. */
export function round2(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(`round2 received a non-finite value: ${value}`);
  }
  // Scale to cents, round half-away-from-zero, scale back.
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round(Math.abs(value) * 100 + Number.EPSILON)) / 100;
}

/** Multiply a money amount by a unitless factor (e.g. quantity), rounded to 2dp. */
export function multiplyMoney(amount: number, factor: number): number {
  return round2(amount * factor);
}

/** Convert a USD amount to PHP using an explicit FX rate (PHP per 1 USD). */
export function usdToPhp(amountUsd: number, fxRateUsdPhp: number): number {
  if (fxRateUsdPhp <= 0) {
    throw new Error(`fxRateUsdPhp must be > 0, received: ${fxRateUsdPhp}`);
  }
  return round2(amountUsd * fxRateUsdPhp);
}

/** Sum a list of money amounts, rounded to 2dp. */
export function sumMoney(amounts: number[]): number {
  return round2(amounts.reduce((acc, n) => acc + n, 0));
}
