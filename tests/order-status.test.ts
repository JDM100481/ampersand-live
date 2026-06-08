import { describe, it, expect } from 'vitest';
import {
  canTransition,
  assertTransition,
  nextStatuses,
  isFulfillable,
  isTerminalNonRevenue,
} from '../src/features/orders/order-status.js';

describe('order-status', () => {
  it('follows the happy path to fulfilled', () => {
    expect(canTransition('draft', 'awaiting_payment')).toBe(true);
    expect(canTransition('awaiting_payment', 'payment_submitted')).toBe(true);
    expect(canTransition('payment_submitted', 'payment_verified')).toBe(true);
    expect(canTransition('payment_verified', 'queued_for_fulfillment')).toBe(true);
    expect(canTransition('queued_for_fulfillment', 'fulfilled')).toBe(true);
  });

  it('cannot skip payment verification to fulfill', () => {
    expect(canTransition('payment_submitted', 'fulfilled')).toBe(false);
    expect(canTransition('awaiting_payment', 'queued_for_fulfillment')).toBe(false);
    expect(() => assertTransition('awaiting_payment', 'fulfilled')).toThrow();
  });

  it('allows cancellation from any non-terminal state but not from fulfilled', () => {
    expect(canTransition('draft', 'cancelled')).toBe(true);
    expect(canTransition('queued_for_fulfillment', 'cancelled')).toBe(true);
    expect(canTransition('fulfilled', 'cancelled')).toBe(false);
    expect(canTransition('refunded', 'cancelled')).toBe(false);
  });

  it('only refunds from fulfilled', () => {
    expect(canTransition('fulfilled', 'refunded')).toBe(true);
    expect(canTransition('payment_verified', 'refunded')).toBe(false);
  });

  it('allows resubmission after rejection', () => {
    expect(canTransition('payment_submitted', 'payment_rejected')).toBe(true);
    expect(canTransition('payment_rejected', 'payment_submitted')).toBe(true);
  });

  it('reports next states including cancel where allowed', () => {
    expect(nextStatuses('payment_submitted').sort()).toEqual(
      ['cancelled', 'payment_rejected', 'payment_verified'].sort(),
    );
    expect(nextStatuses('fulfilled')).toEqual(['refunded']);
    expect(nextStatuses('cancelled')).toEqual([]);
  });

  it('identifies fulfillable and non-revenue states', () => {
    expect(isFulfillable('queued_for_fulfillment')).toBe(true);
    expect(isFulfillable('payment_verified')).toBe(false);
    expect(isTerminalNonRevenue('refunded')).toBe(true);
    expect(isTerminalNonRevenue('fulfilled')).toBe(false);
  });
});
