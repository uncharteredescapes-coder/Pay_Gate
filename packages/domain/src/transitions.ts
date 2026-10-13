/**
 * @paygate/domain - Payment Lifecycle Transition State Machine
 * Defines valid payment state transitions. Terminal states cannot be altered.
 */

export type PaymentStatus =
  | 'created'
  | 'awaiting_payment'
  | 'confirming'
  | 'paid'
  | 'expired'
  | 'cancelled'
  | 'needs_review';

export const ALLOWED_PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  created: ['awaiting_payment'],
  awaiting_payment: ['confirming', 'expired', 'cancelled'],
  confirming: ['paid', 'needs_review', 'expired'],
  needs_review: ['paid', 'cancelled'],
  paid: [], // Terminal state: corrections are ledger adjustments only
  expired: [], // Terminal state
  cancelled: [], // Terminal state
};

export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_PAYMENT_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function assertValidPaymentTransition(from: PaymentStatus, to: PaymentStatus): void {
  if (!canTransitionPayment(from, to)) {
    throw new Error(`Illegal state transition from "${from}" to "${to}"`);
  }
}
