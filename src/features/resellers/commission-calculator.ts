/**
 * commission-calculator.ts
 *
 * Reseller commission calculation.
 *
 * DESIGN DECISION (please confirm — flagged in the build notes):
 *   - 'percentage': rate is a decimal FRACTION of PHP revenue.
 *       rate = 0.10  => 10% of revenue.
 *   - 'fixed': rate is a PHP amount applied PER UNIT, multiplied by quantity.
 *       rate = 5, quantity = 3  => 15 PHP.
 *
 * If you instead want "fixed" to be a flat amount per order regardless of
 * quantity, change the 'fixed' branch to `return round2(rate)`.
 */

import { round2 } from '../../lib/money';

export type CommissionType = 'percentage' | 'fixed';

export function computeCommission(input: {
  type: CommissionType;
  rate: number;
  revenuePhp: number;
  quantity: number;
}): number {
  const { type, rate, revenuePhp, quantity } = input;

  if (rate < 0) throw new Error(`Commission rate must be >= 0, received: ${rate}`);
  if (quantity <= 0) throw new Error(`Quantity must be > 0, received: ${quantity}`);

  switch (type) {
    case 'percentage':
      return round2(revenuePhp * rate);
    case 'fixed':
      return round2(rate * quantity);
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unknown commission type: ${String(_exhaustive)}`);
    }
  }
}
