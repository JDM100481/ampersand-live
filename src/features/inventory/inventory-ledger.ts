/**
 * inventory-ledger.ts
 *
 * USD inventory ledger logic. The BIGO reseller balance is tracked as a
 * USD-denominated ledger; the available balance is the signed sum of all
 * movements. Sign conventions are enforced here so the running balance is
 * always trustworthy.
 *
 * Conventions (amountUsd is stored SIGNED):
 *   procurement_in    -> positive (replenishment increases balance)
 *   order_consumption -> negative (fulfillment consumes balance)
 *   adjustment        -> either sign (requires reason + admin/finance)
 *   reversal          -> either sign (undoes a prior movement)
 */

import { round2 } from '../../lib/money';

export const INVENTORY_MOVEMENT_TYPES = [
  'procurement_in',
  'order_consumption',
  'adjustment',
  'reversal',
] as const;

export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];

export interface InventoryMovement {
  movementType: InventoryMovementType;
  /** Signed USD amount per the conventions above. */
  amountUsd: number;
}

/** Throws if a movement's sign violates its type convention. */
export function assertMovementSign(movement: InventoryMovement): void {
  const { movementType, amountUsd } = movement;
  if (!Number.isFinite(amountUsd)) {
    throw new Error(`Inventory movement amountUsd must be finite, received: ${amountUsd}`);
  }
  if (movementType === 'procurement_in' && amountUsd <= 0) {
    throw new Error('procurement_in movements must be positive');
  }
  if (movementType === 'order_consumption' && amountUsd >= 0) {
    throw new Error('order_consumption movements must be negative');
  }
}

/** Compute the available USD balance from an ordered list of movements. */
export function computeBalance(movements: InventoryMovement[]): number {
  let balance = 0;
  for (const m of movements) {
    assertMovementSign(m);
    balance = round2(balance + m.amountUsd);
  }
  return balance;
}

/**
 * Build the consumption movement for a fulfilled order. Returns a NEGATIVE
 * movement. Throws if there is insufficient inventory (configurable: by
 * default we block over-consumption so the ledger can't go negative).
 */
export function buildConsumptionMovement(input: {
  totalCostUsd: number;
  currentBalanceUsd: number;
  allowNegative?: boolean;
}): InventoryMovement {
  const { totalCostUsd, currentBalanceUsd, allowNegative = false } = input;
  if (totalCostUsd <= 0) throw new Error('Consumption amount must be > 0');
  if (!allowNegative && totalCostUsd > currentBalanceUsd) {
    throw new Error(
      `Insufficient USD inventory: need ${totalCostUsd}, available ${currentBalanceUsd}`,
    );
  }
  return { movementType: 'order_consumption', amountUsd: round2(-totalCostUsd) };
}

/** Build the inbound movement when a procurement invoice is replenished. */
export function buildProcurementMovement(replenishedUsd: number): InventoryMovement {
  if (replenishedUsd <= 0) throw new Error('Replenished amount must be > 0');
  return { movementType: 'procurement_in', amountUsd: round2(replenishedUsd) };
}
