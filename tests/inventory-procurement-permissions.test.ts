import { describe, it, expect } from 'vitest';
import {
  computeBalance,
  buildConsumptionMovement,
  buildProcurementMovement,
  assertMovementSign,
} from '../src/features/inventory/inventory-ledger.js';
import {
  canTransitionProcurement,
  isReplenishmentTransition,
} from '../src/features/procurement/procurement-status.js';
import {
  canVerifyPayments,
  canFulfillOrders,
  canManageProducts,
  canViewProfit,
  isRole,
} from '../src/lib/permissions.js';

describe('inventory-ledger', () => {
  it('computes a running balance from signed movements', () => {
    const balance = computeBalance([
      { movementType: 'procurement_in', amountUsd: 1000 },
      { movementType: 'order_consumption', amountUsd: -10 },
      { movementType: 'order_consumption', amountUsd: -5.5 },
      { movementType: 'adjustment', amountUsd: -0.5 },
    ]);
    expect(balance).toBe(984);
  });

  it('enforces sign conventions', () => {
    expect(() => assertMovementSign({ movementType: 'procurement_in', amountUsd: -1 })).toThrow();
    expect(() => assertMovementSign({ movementType: 'order_consumption', amountUsd: 5 })).toThrow();
  });

  it('builds a negative consumption movement and blocks overdraw', () => {
    const m = buildConsumptionMovement({ totalCostUsd: 10, currentBalanceUsd: 100 });
    expect(m.amountUsd).toBe(-10);
    expect(() => buildConsumptionMovement({ totalCostUsd: 200, currentBalanceUsd: 100 })).toThrow();
    expect(
      buildConsumptionMovement({ totalCostUsd: 200, currentBalanceUsd: 100, allowNegative: true }).amountUsd,
    ).toBe(-200);
  });

  it('builds a positive procurement movement', () => {
    expect(buildProcurementMovement(500).amountUsd).toBe(500);
    expect(() => buildProcurementMovement(0)).toThrow();
  });
});

describe('procurement-status', () => {
  it('follows the procurement chain', () => {
    expect(canTransitionProcurement('planned', 'invoice_received')).toBe(true);
    expect(canTransitionProcurement('usd_sent', 'confirmed_by_bigo')).toBe(true);
    expect(canTransitionProcurement('planned', 'balance_replenished')).toBe(false);
  });

  it('identifies the replenishment transition', () => {
    expect(isReplenishmentTransition('confirmed_by_bigo', 'balance_replenished')).toBe(true);
    expect(isReplenishmentTransition('usd_sent', 'balance_replenished')).toBe(false);
  });
});

describe('permissions', () => {
  it('matches the PRD permission matrix', () => {
    expect(canVerifyPayments('finance')).toBe(true);
    expect(canVerifyPayments('ops')).toBe(false);
    expect(canFulfillOrders('ops')).toBe(true);
    expect(canFulfillOrders('finance')).toBe(false);
    expect(canManageProducts('admin')).toBe(true);
    expect(canManageProducts('ops')).toBe(false);
    expect(canViewProfit('reseller')).toBe(false);
  });

  it('validates role strings', () => {
    expect(isRole('admin')).toBe(true);
    expect(isRole('superuser')).toBe(false);
  });
});
