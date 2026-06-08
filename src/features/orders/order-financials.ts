/**
 * order-financials.ts
 *
 * Builds the immutable financial snapshot stored on an order at creation time.
 * After payment verification these fields are locked (enforced by the order
 * service); historical orders must always read from this snapshot, never from
 * current product prices or current FX.
 */

import { round2, multiplyMoney, usdToPhp } from '../../lib/money';
import { computeCommission, type CommissionType } from '../resellers/commission-calculator';
import { computeProfit } from '../profit/profit-calculator';

export interface OrderSnapshotInput {
  /** From the product at order time. */
  unitPricePhp: number;
  unitCostUsd: number;
  quantity: number;
  /** FX rate (PHP per 1 USD) captured at order time. */
  fxRateUsdPhp: number;
  /** Reseller commission config at order time. Omit for direct (no reseller) orders. */
  commissionType?: CommissionType;
  commissionRate?: number;
}

export interface OrderSnapshot {
  unitPricePhp: number;
  totalPricePhp: number;
  unitCostUsd: number;
  totalCostUsd: number;
  fxRateUsdPhp: number;
  totalCostPhp: number;
  commissionRate: number;
  commissionAmountPhp: number;
  grossProfitPhp: number;
  grossMarginPct: number;
}

export function buildOrderSnapshot(input: OrderSnapshotInput): OrderSnapshot {
  const { unitPricePhp, unitCostUsd, quantity, fxRateUsdPhp } = input;

  if (quantity <= 0) throw new Error(`Quantity must be > 0, received: ${quantity}`);
  if (unitPricePhp < 0 || unitCostUsd < 0) throw new Error('Prices and costs must be >= 0');

  const totalPricePhp = multiplyMoney(unitPricePhp, quantity);
  const totalCostUsd = multiplyMoney(unitCostUsd, quantity);
  const totalCostPhp = usdToPhp(totalCostUsd, fxRateUsdPhp);

  const commissionType = input.commissionType ?? 'fixed';
  const commissionRate = input.commissionRate ?? 0;
  const commissionAmountPhp = computeCommission({
    type: commissionType,
    rate: commissionRate,
    revenuePhp: totalPricePhp,
    quantity,
  });

  const profit = computeProfit({
    totalPricePhp,
    totalCostUsd,
    fxRateUsdPhp,
    commissionAmountPhp,
  });

  return {
    unitPricePhp: round2(unitPricePhp),
    totalPricePhp,
    unitCostUsd: round2(unitCostUsd),
    totalCostUsd,
    fxRateUsdPhp,
    totalCostPhp,
    commissionRate,
    commissionAmountPhp,
    grossProfitPhp: profit.grossProfitPhp,
    grossMarginPct: profit.grossMarginPct,
  };
}

/**
 * Order number generator: ALC-YYYYMMDD-XXXX (XXXX = zero-padded daily sequence).
 * The daily sequence must be supplied by the caller (e.g. from a DB count).
 */
export function generateOrderNumber(date: Date, dailySequence: number): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const seq = String(dailySequence).padStart(4, '0');
  return `ALC-${y}${m}${d}-${seq}`;
}
