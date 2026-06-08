/**
 * payment-status.ts
 *
 * Payment verification state machine. A payment must be `verified` before its
 * order can move to `payment_verified`. Rejections require a reason (enforced
 * by the verify/reject service, not here).
 */

export const PAYMENT_STATUSES = ['submitted', 'needs_review', 'verified', 'rejected'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  submitted: ['needs_review', 'verified', 'rejected'],
  needs_review: ['verified', 'rejected'],
  verified: [],
  rejected: [],
};

export function isPaymentStatus(value: string): value is PaymentStatus {
  return (PAYMENT_STATUSES as readonly string[]).includes(value);
}

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertPaymentTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!canTransitionPayment(from, to)) {
    throw new Error(`Illegal payment status transition: ${from} -> ${to}`);
  }
}

/**
 * Validate a verification attempt. Payment amount must match the order amount
 * unless an explicit variance has been approved.
 */
export function validatePaymentForVerification(input: {
  paymentAmountPhp: number;
  orderAmountPhp: number;
  varianceApproved?: boolean;
}): { ok: true } | { ok: false; reason: string } {
  const { paymentAmountPhp, orderAmountPhp, varianceApproved } = input;
  if (paymentAmountPhp <= 0) {
    return { ok: false, reason: 'Payment amount must be greater than zero.' };
  }
  if (paymentAmountPhp !== orderAmountPhp && !varianceApproved) {
    return {
      ok: false,
      reason: `Payment amount (${paymentAmountPhp}) does not match order amount (${orderAmountPhp}); approve variance to proceed.`,
    };
  }
  return { ok: true };
}

/** Rejection always requires a non-empty reason. */
export function validateRejectionReason(reason: string | undefined | null): boolean {
  return typeof reason === 'string' && reason.trim().length > 0;
}
