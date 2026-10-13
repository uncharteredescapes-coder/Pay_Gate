import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  ArrowRight,
  MessageSquare,
  Clock,
  Layers,
} from 'lucide-react';
import { usePayGate } from '../../context/PayGateContext';
import { Payment } from '../../types';
import { StatusChip } from '../gate-ui/StatusChip';
import { ReferenceChip } from '../gate-ui/ReferenceChip';
import { ProviderBadge } from '../gate-ui/ProviderBadge';
import { GateButton } from '../gate-ui/GateButton';
import { GateInput } from '../gate-ui/GateInput';
import { formatPaisaToBDT } from '../../utils/smsParser';

export const ReviewQueueTab: React.FC = () => {
  const {
    payments,
    wallets,
    incomingTxns,
    resolveReviewPayment,
    addToast,
  } = usePayGate();

  const reviewPayments = payments.filter((p) => p.status === 'needs_review');
  const [selectedReviewId, setSelectedReviewId] = useState<string>(
    reviewPayments[0]?.id || ''
  );
  const [staffNote, setStaffNote] = useState('');
  const [staffName, setStaffName] = useState('ops_tanvir');

  const selectedPayment = payments.find((p) => p.id === selectedReviewId) || reviewPayments[0];
  const assignedWallet = wallets.find((w) => w.id === selectedPayment?.walletId);

  // Look for any incoming transaction with that TrxID or matching reference
  const potentialTxn = incomingTxns.find(
    (t) =>
      (selectedPayment?.submittedTrxId && t.trxId === selectedPayment.submittedTrxId) ||
      (selectedPayment?.reference && t.refNormalized === selectedPayment.reference)
  );

  const handleResolve = (action: 'force_match' | 'reject') => {
    if (!selectedPayment) return;
    resolveReviewPayment(selectedPayment.id, action, staffNote || `Manual resolution by ${staffName}`, staffName);
    setStaffNote('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[var(--ink)]">Exception & Reconciliation Review Queue</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--warning)]/15 text-[var(--warning)]">
              {reviewPayments.length} Active Items
            </span>
          </div>
          <p className="text-xs text-[var(--ink-2)] mt-0.5">
            When customer TrxID claims conflict with SMS evidence (underpayment, wrong wallet, or typo), payments are safely paused here for manual resolution.
          </p>
        </div>
      </div>

      {reviewPayments.length === 0 ? (
        <div className="p-12 text-center bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
          <CheckCircle2 className="w-12 h-12 text-[var(--success)] mx-auto mb-3" />
          <h4 className="text-base font-bold text-[var(--ink)]">Review Queue Clear</h4>
          <p className="text-xs text-[var(--ink-2)] mt-1">
            Zero payments currently require manual operations reconciliation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Queue List (4 cols) */}
          <div className="lg:col-span-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs divide-y divide-[var(--border)]">
            <div className="p-3.5 bg-[var(--surface-2)]/60 text-xs font-semibold text-[var(--ink-2)]">
              Pending Exceptions ({reviewPayments.length})
            </div>
            {reviewPayments.map((p) => {
              const isSelected = p.id === (selectedPayment?.id || selectedReviewId);
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedReviewId(p.id)}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[var(--accent-soft)]/40 border-l-4 border-[var(--accent)]'
                      : 'hover:bg-[var(--surface-2)]/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-mono font-bold text-[var(--ink)]">{p.orderId}</div>
                      <div className="text-[11px] text-[var(--ink-3)] font-mono">{p.id}</div>
                    </div>
                    <StatusChip status="needs_review" reviewReason={p.reviewReason} size="sm" />
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-[var(--ink)]">
                      {formatPaisaToBDT(p.amountPaisa)}
                    </span>
                    <ReferenceChip reference={p.reference} size="sm" />
                  </div>

                  <div className="mt-2 text-[11px] text-[var(--ink-3)] flex items-center gap-2">
                    <span>TrxID: {p.submittedTrxId || 'None'}</span>
                    <span>·</span>
                    <span>{new Date(p.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Split Reconciliation View (7 cols) */}
          {selectedPayment && (
            <div className="lg:col-span-7 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-xs space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
                <div>
                  <h4 className="text-sm font-bold text-[var(--ink)]">
                    Reconciliation Inspection: {selectedPayment.orderId}
                  </h4>
                  <span className="text-xs text-[var(--warning)] font-semibold mt-0.5 block">
                    Discrepancy: {selectedPayment.reviewReason?.toUpperCase().replace('_', ' ')}
                  </span>
                </div>
                <ReferenceChip reference={selectedPayment.reference} />
              </div>

              {/* Split Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Side A: Customer Claim */}
                <div className="p-4 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] space-y-3">
                  <span className="text-xs font-bold text-[var(--ink)] block uppercase tracking-wider">
                    Customer Claim (Browser)
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-3)]">Submitted TrxID:</span>
                      <span className="font-mono font-bold text-[var(--ink)]">{selectedPayment.submittedTrxId || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-3)]">Expected Amount:</span>
                      <span className="font-mono font-bold text-[var(--ink)]">{formatPaisaToBDT(selectedPayment.amountPaisa)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-3)]">Assigned Wallet:</span>
                      <span className="font-mono text-[var(--ink-2)]">{assignedWallet?.msisdn || 'Pool'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--ink-3)]">Claim Time:</span>
                      <span className="font-mono text-[var(--ink-3)]">
                        {selectedPayment.confirmedAt ? new Date(selectedPayment.confirmedAt).toLocaleTimeString() : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Side B: Phone Fleet SMS Evidence */}
                <div className="p-4 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] space-y-3">
                  <span className="text-xs font-bold text-[var(--ink)] block uppercase tracking-wider">
                    SMS Evidence (Fleet)
                  </span>
                  {potentialTxn ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-[var(--ink-3)]">Received TrxID:</span>
                        <span className="font-mono font-bold text-[var(--ink)]">{potentialTxn.trxId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--ink-3)]">Parsed Amount:</span>
                        <span className={`font-mono font-bold ${potentialTxn.amountPaisa !== selectedPayment.amountPaisa ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
                          {formatPaisaToBDT(potentialTxn.amountPaisa)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--ink-3)]">SMS Reference:</span>
                        <span className="font-mono text-[var(--accent)]">{potentialTxn.refNormalized || 'None'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--ink-3)]">Received:</span>
                        <span className="font-mono text-[var(--ink-3)]">{new Date(potentialTxn.receivedAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 text-center text-xs text-[var(--ink-3)] italic">
                      No matching incoming SMS record in pool yet.
                    </div>
                  )}
                </div>
              </div>

              {/* Raw SMS Preview if available */}
              {potentialTxn && (
                <div className="p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] space-y-1">
                  <span className="text-[10px] font-semibold text-[var(--ink-3)] uppercase block">Raw Received SMS</span>
                  <p className="font-mono text-xs text-[var(--ink-2)] select-all leading-relaxed">
                    "{potentialTxn.rawSms}"
                  </p>
                </div>
              )}

              {/* Resolution Controls */}
              <div className="pt-4 border-t border-[var(--border)] space-y-4">
                <GateInput
                  label="Ops Staff Resolution Note"
                  placeholder="e.g. Underpayment verified with customer; accepted partial variance"
                  value={staffNote}
                  onChange={(e) => setStaffNote(e.target.value)}
                />

                <div className="flex items-center gap-3">
                  <GateButton
                    variant="danger"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleResolve('reject')}
                    icon={<XCircle className="w-3.5 h-3.5" />}
                  >
                    Reject Claim
                  </GateButton>
                  <GateButton
                    variant="primary"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleResolve('force_match')}
                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    Approve Match (Force Paid)
                  </GateButton>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
