/**
 * procurement-status.ts
 *
 * BIGO Singapore procurement invoice state machine.
 *   planned -> invoice_received -> usd_sent -> confirmed_by_bigo -> balance_replenished
 * Any pre-replenishment state may be cancelled.
 */

export const PROCUREMENT_STATUSES = [
  'planned',
  'invoice_received',
  'usd_sent',
  'confirmed_by_bigo',
  'balance_replenished',
  'cancelled',
] as const;

export type ProcurementStatus = (typeof PROCUREMENT_STATUSES)[number];

const CANCELLABLE: ProcurementStatus[] = [
  'planned',
  'invoice_received',
  'usd_sent',
  'confirmed_by_bigo',
];

const TRANSITIONS: Record<ProcurementStatus, ProcurementStatus[]> = {
  planned: ['invoice_received'],
  invoice_received: ['usd_sent'],
  usd_sent: ['confirmed_by_bigo'],
  confirmed_by_bigo: ['balance_replenished'],
  balance_replenished: [],
  cancelled: [],
};

export function isProcurementStatus(value: string): value is ProcurementStatus {
  return (PROCUREMENT_STATUSES as readonly string[]).includes(value);
}

export function canTransitionProcurement(from: ProcurementStatus, to: ProcurementStatus): boolean {
  if (to === 'cancelled') return CANCELLABLE.includes(from);
  return TRANSITIONS[from].includes(to);
}

export function assertProcurementTransition(from: ProcurementStatus, to: ProcurementStatus): void {
  if (!canTransitionProcurement(from, to)) {
    throw new Error(`Illegal procurement status transition: ${from} -> ${to}`);
  }
}

/** Replenishment (the inventory-affecting event) only happens on this transition. */
export function isReplenishmentTransition(from: ProcurementStatus, to: ProcurementStatus): boolean {
  return from === 'confirmed_by_bigo' && to === 'balance_replenished';
}
