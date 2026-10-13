import React, { useState } from 'react';
import { X, ExternalLink, RefreshCw, CheckCircle, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';
import { usePayGate } from '../../context/PayGateContext';
import { StatusChip } from './StatusChip';
import { ReferenceChip } from './ReferenceChip';
import { ProviderBadge } from './ProviderBadge';
import { GateButton } from './GateButton';
import { formatPaisaToBDT } from '../../utils/smsParser';

interface PaymentDrawerProps {
  paymentId: string | null;
  onClose: () => void;
}

export const PaymentDrawer: React.FC<PaymentDrawerProps> = ({ paymentId, onClose }) => {
  const {
    payments,
    wallets,
    incomingTxns,
    webhookDeliveries,
    resendWebhook,
    setActiveView,
    setSelectedPaymentId,
  } = usePayGate();

  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'webhook'>('details');

  if (!paymentId) return null;
  const payment = payments.find((p) => p.id === paymentId);
  if (!payment) return null;

  const wallet = wallets.find((w) => w.id === payment.walletId);
  const matchedTxn = incomingTxns.find(
    (t) => t.claimedPaymentId === payment.id || (payment.submittedTrxId && t.trxId === payment.submittedTrxId)
  );
  const delivery = webhookDeliveries.find((w) => w.paymentId === payment.id);

  return (
    <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-lg bg-[var(--surface)] border-l border-[var(--border)] h-full overflow-y-auto flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between sticky top-0 bg-[var(--surface)]/95 backdrop-blur-md z-10">
          <div>
            <div className="text-xs text-[var(--ink-3)] font-mono">{payment.id}</div>
            <div className="text-lg font-semibold text-[var(--ink)] flex items-center gap-2 mt-0.5">
              <span>{payment.orderId}</span>
              <StatusChip status={payment.status} reviewReason={payment.reviewReason} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--ink-3)] hover:text-[var(--ink)] rounded-lg hover:bg-[var(--surface-2)] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[var(--border)] px-5 bg-[var(--surface-2)]/50 text-xs font-medium">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'details'
                ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-transparent text-[var(--ink-2)] hover:text-[var(--ink)]'
            }`}
          >
            Overview & Proof
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'timeline'
                ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-transparent text-[var(--ink-2)] hover:text-[var(--ink)]'
            }`}
          >
            Lifecycle Timeline
          </button>
          <button
            onClick={() => setActiveTab('webhook')}
            className={`py-3 px-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'webhook'
                ? 'border-[var(--accent)] text-[var(--accent)] font-semibold'
                : 'border-transparent text-[var(--ink-2)] hover:text-[var(--ink)]'
            }`}
          >
            Webhook Delivery
          </button>
        </div>

        {/* Drawer Body */}
        <div className="p-6 space-y-6 flex-1">
          {activeTab === 'details' && (
            <>
              {/* Financial Summary */}
              <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl space-y-3">
                <div className="text-xs font-medium text-[var(--ink-3)] uppercase tracking-wider">
                  Payment Economics (5.00% fee)
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[var(--border)]">
                  <div>
                    <span className="text-[11px] text-[var(--ink-3)] block">Gross Amount</span>
                    <span className="text-base font-semibold font-mono tabular-nums text-[var(--ink)]">
                      {formatPaisaToBDT(payment.amountPaisa)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--ink-3)] block">PayGate Fee (5%)</span>
                    <span className="text-base font-medium font-mono tabular-nums text-[var(--danger)]">
                      - {formatPaisaToBDT(payment.feeAmountPaisa)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-[var(--ink-3)] block">Merchant Net</span>
                    <span className="text-base font-bold font-mono tabular-nums text-[var(--success)]">
                      {formatPaisaToBDT(payment.netAmountPaisa)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Core Attributes */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--ink-2)]">Provider</span>
                  <ProviderBadge provider={payment.provider} />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--ink-2)]">Unique Reference</span>
                  <ReferenceChip reference={payment.reference} />
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--ink-2)]">Pricing Plan</span>
                  <span className="font-medium text-[var(--ink)]">{payment.planSnapshot.name}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--ink-2)]">Assigned Receiving Wallet</span>
                  <span className="font-mono text-xs text-[var(--ink)]">
                    {wallet?.msisdn || '01712-750278'} ({wallet?.holderName || 'Pool SIM'})
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--ink-2)]">Customer Submitted TrxID</span>
                  <span className="font-mono text-xs font-semibold text-[var(--ink)]">
                    {payment.submittedTrxId || <span className="text-[var(--ink-3)] font-normal italic">None submitted yet</span>}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[var(--border)]">
                  <span className="text-[var(--ink-2)]">Matching Rule Outcome</span>
                  <span className="text-xs font-mono">
                    {payment.matchedBy ? (
                      <span className="text-[var(--success)] font-medium flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" /> {payment.matchedBy}
                      </span>
                    ) : payment.reviewReason ? (
                      <span className="text-[var(--warning)] font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Flagged: {payment.reviewReason}
                      </span>
                    ) : (
                      <span className="text-[var(--ink-3)]">Awaiting Evidence</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Ingested Evidence Inspection */}
              {matchedTxn && (
                <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--ink-2)] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[var(--success)]" /> Verified Phone Fleet Evidence
                    </span>
                    <span className="text-[10px] font-mono text-[var(--ink-3)]">{matchedTxn.clientMsgId}</span>
                  </div>
                  <div className="bg-[var(--surface)] p-3 rounded-lg border border-[var(--border)] text-xs font-mono text-[var(--ink-2)] leading-relaxed select-all">
                    "{matchedTxn.rawSms}"
                  </div>
                  <div className="flex justify-between text-[11px] text-[var(--ink-3)] pt-1">
                    <span>Parsed Amount: {formatPaisaToBDT(matchedTxn.amountPaisa)}</span>
                    <span>Received: {new Date(matchedTxn.receivedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="pt-4 flex items-center gap-3">
                <GateButton
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    setSelectedPaymentId(payment.id);
                    setActiveView('pay');
                    onClose();
                  }}
                  icon={<ExternalLink className="w-4 h-4" />}
                >
                  Open Hosted Pay Page
                </GateButton>
                {payment.status !== 'paid' && (
                  <GateButton
                    variant="secondary"
                    onClick={() => {
                      setSelectedPaymentId(payment.id);
                      setActiveView('simulator');
                      onClose();
                    }}
                  >
                    Simulate SMS Match
                  </GateButton>
                )}
              </div>
            </>
          )}

          {activeTab === 'timeline' && (
            <div className="space-y-6 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[var(--border)]">
              {/* Event 1: Created */}
              <div className="relative">
                <span className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-[var(--accent)] border-2 border-[var(--surface)]" />
                <div className="text-xs text-[var(--ink-3)] font-mono">
                  {new Date(payment.createdAt).toLocaleString()}
                </div>
                <div className="text-sm font-semibold text-[var(--ink)] mt-0.5">Payment Link Created</div>
                <div className="text-xs text-[var(--ink-2)] mt-0.5">
                  Plan: {payment.planSnapshot.name} ({formatPaisaToBDT(payment.amountPaisa)}). Reference {payment.reference} assigned from wallet pool.
                </div>
              </div>

              {/* Event 2: Customer Confirm Claim */}
              {payment.confirmedAt && (
                <div className="relative">
                  <span className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-[var(--warning)] border-2 border-[var(--surface)]" />
                  <div className="text-xs text-[var(--ink-3)] font-mono">
                    {new Date(payment.confirmedAt).toLocaleString()}
                  </div>
                  <div className="text-sm font-semibold text-[var(--ink)] mt-0.5">Customer Claimed TrxID</div>
                  <div className="text-xs text-[var(--ink-2)] mt-0.5 font-mono">
                    Submitted TrxID: {payment.submittedTrxId}. Matching engine initiated 90-second lookup.
                  </div>
                </div>
              )}

              {/* Event 3: Matched / Review */}
              {payment.status === 'paid' && (
                <div className="relative">
                  <span className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-[var(--success)] border-2 border-[var(--surface)]" />
                  <div className="text-xs text-[var(--ink-3)] font-mono">
                    {payment.paidAt ? new Date(payment.paidAt).toLocaleString() : 'Just now'}
                  </div>
                  <div className="text-sm font-semibold text-[var(--success)] mt-0.5">Payment Verified & Settled</div>
                  <div className="text-xs text-[var(--ink-2)] mt-0.5">
                    Atomic transaction matched via {payment.matchedBy}. Double entry ledger updated: net {formatPaisaToBDT(payment.netAmountPaisa)} credited to merchant.
                  </div>
                </div>
              )}

              {payment.status === 'needs_review' && (
                <div className="relative">
                  <span className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-[var(--danger)] border-2 border-[var(--surface)]" />
                  <div className="text-xs text-[var(--ink-3)] font-mono">
                    {payment.confirmedAt ? new Date(payment.confirmedAt).toLocaleString() : 'Just now'}
                  </div>
                  <div className="text-sm font-semibold text-[var(--danger)] mt-0.5">Flagged for Review</div>
                  <div className="text-xs text-[var(--ink-2)] mt-0.5">
                    Inconsistency detected: {payment.reviewReason}. Forwarded to Ops review queue for resolution.
                  </div>
                </div>
              )}

              {/* Expiry line */}
              <div className="relative">
                <span className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full bg-[var(--ink-3)] border-2 border-[var(--surface)]" />
                <div className="text-xs text-[var(--ink-3)] font-mono">
                  Expires: {new Date(payment.expiresAt).toLocaleTimeString()}
                </div>
                <div className="text-xs text-[var(--ink-3)]">
                  Payment session expiration window (30 minutes)
                </div>
              </div>
            </div>
          )}

          {activeTab === 'webhook' && (
            <div className="space-y-4">
              {delivery ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] text-xs">
                    <div>
                      <span className="text-[var(--ink-3)] block">Target Endpoint</span>
                      <span className="font-mono text-[var(--ink)] font-medium break-all">{delivery.url}</span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-[var(--ink-3)] block">HTTP Status</span>
                      <span className="font-mono font-bold text-[var(--success)]">{delivery.statusCode} OK</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-[var(--ink-2)] block mb-1.5">
                      PayGate-Signature Header (HMAC-SHA256)
                    </span>
                    <div className="p-2.5 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] font-mono text-xs text-[var(--ink-2)] break-all select-all">
                      {delivery.signature}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-[var(--ink-2)] block mb-1.5">
                      Signed JSON Payload
                    </span>
                    <pre className="p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--border)] font-mono text-xs text-[var(--ink)] overflow-x-auto leading-relaxed select-all">
                      {JSON.stringify(delivery.payload, null, 2)}
                    </pre>
                  </div>

                  <GateButton
                    variant="secondary"
                    className="w-full"
                    onClick={() => resendWebhook(delivery.id)}
                    icon={<RefreshCw className="w-4 h-4" />}
                  >
                    Resend Webhook Now
                  </GateButton>
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-[var(--ink-3)]">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No webhook dispatched yet. Webhooks fire upon terminal payment events (paid, review, cancelled).
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
