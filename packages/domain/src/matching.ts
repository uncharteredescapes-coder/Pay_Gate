/**
 * @paygate/domain - Atomic Payment Matching Engine Rules
 */

import { ParsedSmsResult } from './providers/types.ts';
import { PaymentStatus } from './transitions.ts';

export interface DomainPayment {
  id: string;
  merchantId: string;
  orderId: string;
  amountPaisa: number;
  reference: string;
  provider: 'bkash' | 'nagad' | 'rocket' | 'upay' | 'cellfin';
  offeredWalletIds: string[];
  status: PaymentStatus;
  submittedTrxId?: string;
  expiresAt: string;
}

export interface DomainMatchResult {
  outcome: 'matched' | 'conflict' | 'already_claimed' | 'no_evidence' | 'expired_claim';
  matchedBy?: 'trxid' | 'trxid+reference' | 'auto_confirm';
  reviewReason?: 'underpaid' | 'overpaid' | 'wrong_wallet' | 'conflict' | 'late_payment' | 'duplicate_trx_id';
  errorMessage?: string;
  matchedTxn?: ParsedSmsResult;
}

export function evaluateDomainMatch(
  payment: DomainPayment,
  evidence?: ParsedSmsResult,
  alreadyClaimedByOtherId?: string
): DomainMatchResult {
  const now = new Date();
  const isExpired = now > new Date(payment.expiresAt);

  if (!evidence) {
    if (isExpired) {
      return {
        outcome: 'expired_claim',
        reviewReason: 'late_payment',
        errorMessage: 'Payment window expired before matching confirmation',
      };
    }
    return { outcome: 'no_evidence', errorMessage: 'No SMS received for this Transaction ID yet' };
  }

  if (alreadyClaimedByOtherId && alreadyClaimedByOtherId !== payment.id) {
    return {
      outcome: 'already_claimed',
      reviewReason: 'duplicate_trx_id',
      errorMessage: 'This Transaction ID was already claimed by another payment',
    };
  }

  if (isExpired) {
    return {
      outcome: 'expired_claim',
      reviewReason: 'late_payment',
      errorMessage: 'Payment window expired before matching confirmation',
      matchedTxn: evidence,
    };
  }

  if (evidence.provider !== payment.provider) {
    return {
      outcome: 'conflict',
      reviewReason: 'wrong_wallet',
      errorMessage: `Provider mismatch: expected ${payment.provider}, received ${evidence.provider}`,
      matchedTxn: evidence,
    };
  }

  if (evidence.amountPaisa !== payment.amountPaisa) {
    const isUnder = evidence.amountPaisa < payment.amountPaisa;
    return {
      outcome: 'conflict',
      reviewReason: isUnder ? 'underpaid' : 'overpaid',
      errorMessage: `Amount mismatch: expected Tk ${(payment.amountPaisa / 100).toFixed(2)}, received Tk ${(evidence.amountPaisa / 100).toFixed(2)}`,
      matchedTxn: evidence,
    };
  }

  if (evidence.refNormalized && evidence.refNormalized.length > 0) {
    if (evidence.refNormalized !== payment.reference) {
      return {
        outcome: 'conflict',
        reviewReason: 'conflict',
        errorMessage: `Reference mismatch in SMS: expected ${payment.reference}, found ${evidence.refNormalized}`,
        matchedTxn: evidence,
      };
    }
    return {
      outcome: 'matched',
      matchedBy: 'trxid+reference',
      matchedTxn: evidence,
    };
  }

  return {
    outcome: 'matched',
    matchedBy: 'trxid',
    matchedTxn: evidence,
  };
}
