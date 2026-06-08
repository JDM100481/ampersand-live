import { describe, it, expect } from 'vitest';
import {
  canTransitionPayment,
  validatePaymentForVerification,
  validateRejectionReason,
} from '../src/features/payments/payment-status.js';
import { computeCommission } from '../src/features/resellers/commission-calculator.js';
import { computeProfit, aggregateProfit } from '../src/features/profit/profit-calculator.js';
import { buildOrderSnapshot, generateOrderNumber } from '../src/features/orders/order-financials.js';

describe('payment-status', () => {
  it('permits valid verification transitions', () => {
    expect(canTransitionPayment('submitted', 'verified')).toBe(true);
    expect(canTransitionPayment('needs_review', 'rejected')).toBe(true);
    expect(canTransitionPayment('verified', 'rejected')).toBe(false);
  });

  it('blocks amount mismatch unless variance approved', () => {
    expect(validatePaymentForVerification({ paymentAmountPhp: 500, orderAmountPhp: 500 }).ok).toBe(true);
    expect(validatePaymentForVerification({ paymentAmountPhp: 450, orderAmountPhp: 500 }).ok).toBe(false);
    expect(
      validatePaymentForVerification({ paymentAmountPhp: 450, orderAmountPhp: 500, varianceApproved: true }).ok,
    ).toBe(true);
  });

  it('requires a non-empty rejection reason', () => {
    expect(validateRejectionReason('wrong amount')).toBe(true);
    expect(validateRejectionReason('   ')).toBe(false);
    expect(validateRejectionReason(undefined)).toBe(false);
  });
});

describe('commission-calculator', () => {
  it('computes percentage commission from revenue', () => {
    expect(computeCommission({ type: 'percentage', rate: 0.1, revenuePhp: 1000, quantity: 1 })).toBe(100);
  });
  it('computes fixed commission per unit', () => {
    expect(computeCommission({ type: 'fixed', rate: 5, revenuePhp: 1000, quantity: 3 })).toBe(15);
  });
  it('rejects bad inputs', () => {
    expect(() => computeCommission({ type: 'fixed', rate: -1, revenuePhp: 1000, quantity: 1 })).toThrow();
    expect(() => computeCommission({ type: 'fixed', rate: 5, revenuePhp: 1000, quantity: 0 })).toThrow();
  });
});

describe('profit-calculator', () => {
  it('computes gross profit and margin using snapshot fx', () => {
    // Revenue 1000 PHP, cost 10 USD @ 56 = 560 PHP, commission 100 PHP
    const p = computeProfit({ totalPricePhp: 1000, totalCostUsd: 10, fxRateUsdPhp: 56, commissionAmountPhp: 100 });
    expect(p.revenuePhp).toBe(1000);
    expect(p.costPhp).toBe(560);
    expect(p.commissionPhp).toBe(100);
    expect(p.grossProfitPhp).toBe(340);
    expect(p.grossMarginPct).toBe(0.34);
  });

  it('handles zero revenue without dividing by zero', () => {
    const p = computeProfit({ totalPricePhp: 0, totalCostUsd: 0, fxRateUsdPhp: 56, commissionAmountPhp: 0 });
    expect(p.grossMarginPct).toBe(0);
  });

  it('aggregates profit across orders', () => {
    const agg = aggregateProfit([
      { totalPricePhp: 1000, totalCostUsd: 10, fxRateUsdPhp: 56, commissionAmountPhp: 100 },
      { totalPricePhp: 500, totalCostUsd: 5, fxRateUsdPhp: 56, commissionAmountPhp: 0 },
    ]);
    expect(agg.revenuePhp).toBe(1500);
    expect(agg.costPhp).toBe(840);
    expect(agg.grossProfitPhp).toBe(560);
  });
});

describe('order-financials snapshot', () => {
  it('builds a complete, internally consistent snapshot', () => {
    const snap = buildOrderSnapshot({
      unitPricePhp: 500,
      unitCostUsd: 5,
      quantity: 2,
      fxRateUsdPhp: 56,
      commissionType: 'percentage',
      commissionRate: 0.1,
    });
    expect(snap.totalPricePhp).toBe(1000);
    expect(snap.totalCostUsd).toBe(10);
    expect(snap.totalCostPhp).toBe(560);
    expect(snap.commissionAmountPhp).toBe(100);
    expect(snap.grossProfitPhp).toBe(340);
    expect(snap.grossMarginPct).toBe(0.34);
  });

  it('defaults to zero commission for direct orders', () => {
    const snap = buildOrderSnapshot({ unitPricePhp: 100, unitCostUsd: 1, quantity: 1, fxRateUsdPhp: 56 });
    expect(snap.commissionAmountPhp).toBe(0);
    expect(snap.grossProfitPhp).toBe(44);
  });

  it('generates a zero-padded order number', () => {
    const n = generateOrderNumber(new Date('2026-06-08T03:00:00Z'), 7);
    expect(n).toBe('ALC-20260608-0007');
  });
});
