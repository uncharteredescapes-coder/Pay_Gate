/**
 * PayGate Matching Engine
 * Implements the atomic transaction matching rules backed by @paygate/domain.
 */

import { Payment, IncomingTxn, ReviewReason } from '../types/index.ts';
import { evaluateDomainMatch, DomainPayment, ParsedSmsResult } from '../../packages/domain/src/index.ts';

export interface MatchEvaluationResult {
  outcome: 'matched' | 'conflict' | 'already_claimed' | 'no_evidence' | 'expired_claim';
  matchedBy?: 'trxid' | 'trxid+reference' | 'auto_confirm';
  reviewReason?: ReviewReason;
  errorMessage?: string;
  matchedTxn?: IncomingTxn;
}

export function evaluatePaymentMatch(
  payment: Payment,
  incomingTxns: IncomingTxn[]
): MatchEvaluationResult {
  const submittedTrx = (payment.submittedTrxId || '').trim().toUpperCase();

  // Find incoming transactions with matching TrxID or reference
  let matchedTxn: IncomingTxn | undefined;
  if (submittedTrx) {
    matchedTxn = incomingTxns.find((t) => t.trxId.toUpperCase() === submittedTrx);
  } else {
    matchedTxn = incomingTxns.find(
      (t) => t.refNormalized && t.refNormalized === payment.reference && !t.claimedPaymentId
    );
  }

  const domainPayment: DomainPayment = {
    id: payment.id,
    merchantId: payment.merchantId,
    orderId: payment.orderId,
    amountPaisa: payment.amountPaisa,
    reference: payment.reference,
    provider: payment.provider,
    offeredWalletIds: payment.offeredWalletIds,
    status: payment.status,
    submittedTrxId: payment.submittedTrxId,
    expiresAt: payment.expiresAt,
  };

  const domainEvidence: ParsedSmsResult | undefined = matchedTxn
    ? {
        provider: matchedTxn.provider,
        trxId: matchedTxn.trxId,
        amountPaisa: matchedTxn.amountPaisa,
        balanceAfterPaisa: matchedTxn.balanceAfterPaisa,
        refRaw: matchedTxn.refRaw,
        refNormalized: matchedTxn.refNormalized,
        sender: matchedTxn.provider.toUpperCase(),
        simSlot: matchedTxn.simSlot,
        timestamp: matchedTxn.receivedAt,
        rawSms: matchedTxn.rawSms,
        isValid: true,
      }
    : undefined;

  const result = evaluateDomainMatch(domainPayment, domainEvidence, matchedTxn?.claimedPaymentId);

  return {
    outcome: result.outcome,
    matchedBy: result.matchedBy as any,
    reviewReason: result.reviewReason as ReviewReason,
    errorMessage: result.errorMessage,
    matchedTxn,
  };
}
