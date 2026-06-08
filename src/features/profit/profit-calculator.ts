/**
 * profit-calculator.ts
 *
 * Profit calculation per the PRD:
 *   Revenue PHP      = total customer selling price (PHP)
 *   Cost PHP         = total USD cost  x  FX rate
 *   Commission PHP   = reseller commission (PHP)
 *   Gross Profit PHP = Revenue - Cost - Commission
 *   Gross Margin %   = Gross Profit / Revenue
 *
 * Always uses the order's SNAPSHOTTED fx rate and costs, never current values.
 */

import { round2, usdToPhp } from '../../lib/money';

export interface OrderFinancialInput {
  totalPricePhp: number;
  totalCostUsd: number;
  fxRateUsdPhp: number;
  commissionAmountPhp: number;
}

export interface ProfitResult {
  revenuePhp: number;
  costPhp: number;
  commissionPhp: number;
  grossProfitPhp: number;
  /** Margin as a fraction (0.25 = 25%). 0 when revenue is 0. */
  grossMarginPct: number;
}

export function computeProfit(order: OrderFinancialInput): ProfitResult {
  const revenuePhp = round2(order.totalPricePhp);
  const costPhp = usdToPhp(order.totalCostUsd, order.fxRateUsdPhp);
  const commissionPhp = round2(order.commissionAmountPhp);
  const grossProfitPhp = round2(revenuePhp - costPhp - commissionPhp);
  const grossMarginPct = revenuePhp === 0 ? 0 : round2(grossProfitPhp / revenuePhp * 10000) / 10000;

  return { revenuePhp, costPhp, commissionPhp, grossProfitPhp, grossMarginPct };
}

/** Aggregate profit across many orders (e.g. for dashboard cards / reports). */
export function aggregateProfit(orders: OrderFinancialInput[]): ProfitResult {
  const totals = orders.reduce(
    (acc, o) => {
      const p = computeProfit(o);
      acc.revenuePhp += p.revenuePhp;
      acc.costPhp += p.costPhp;
      acc.commissionPhp += p.commissionPhp;
      acc.grossProfitPhp += p.grossProfitPhp;
      return acc;
    },
    { revenuePhp: 0, costPhp: 0, commissionPhp: 0, grossProfitPhp: 0 },
  );

  const revenuePhp = round2(totals.revenuePhp);
  const grossProfitPhp = round2(totals.grossProfitPhp);
  return {
    revenuePhp,
    costPhp: round2(totals.costPhp),
    commissionPhp: round2(totals.commissionPhp),
    grossProfitPhp,
    grossMarginPct: revenuePhp === 0 ? 0 : round2((grossProfitPhp / revenuePhp) * 10000) / 10000,
  };
}
