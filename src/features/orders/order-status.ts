/**
 * order-status.ts
 *
 * Order lifecycle state machine. Encodes the transition rules from the build
 * spec. The key invariant: an order cannot reach `fulfilled` without first
 * passing through `payment_verified` -> `queued_for_fulfillment`.
 */

export const ORDER_STATUSES = [
  'draft',
  'awaiting_payment',
  'payment_submitted',
  'payment_verified',
  'queued_for_fulfillment',
  'fulfilled',
  'cancelled',
  'refunded',
  'payment_rejected',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Statuses from which an order may still be cancelled. */
const CANCELLABLE: OrderStatus[] = [
  'draft',
  'awaiting_payment',
  'payment_submitted',
  'payment_verified',
  'queued_for_fulfillment',
  'payment_rejected',
];

/**
 * Allowed forward transitions, excluding the universal `-> cancelled` rule
 * (handled separately so we don't repeat it on every state).
 */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  draft: ['awaiting_payment'],
  awaiting_payment: ['payment_submitted'],
  payment_submitted: ['payment_verified', 'payment_rejected'],
  payment_verified: ['queued_for_fulfillment'],
  queued_for_fulfillment: ['fulfilled'],
  fulfilled: ['refunded'], // refund only via admin/finance adjustment flow
  payment_rejected: ['payment_submitted'], // allow corrected proof resubmission
  cancelled: [],
  refunded: [],
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function nextStatuses(from: OrderStatus): OrderStatus[] {
  const base = [...TRANSITIONS[from]];
  if (CANCELLABLE.includes(from)) base.push('cancelled');
  return base;
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (to === 'cancelled') return CANCELLABLE.includes(from);
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal order status transition: ${from} -> ${to}`);
  }
}

/** True only when the order is eligible to enter the fulfillment queue. */
export function isFulfillable(status: OrderStatus): boolean {
  return status === 'queued_for_fulfillment';
}

/** Terminal states that should be excluded from profit unless shown separately. */
export function isTerminalNonRevenue(status: OrderStatus): boolean {
  return status === 'cancelled' || status === 'refunded' || status === 'payment_rejected';
}
