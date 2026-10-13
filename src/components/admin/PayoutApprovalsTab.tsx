import React, { useState } from 'react';
import {
  DollarSign,
  CheckCircle,
  XCircle,
  Building,
  UserCheck,
  ShieldCheck,
  AlertTriangle,
  Download,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { usePayGate } from '../../context/PayGateContext';
import { GateButton } from '../gate-ui/GateButton';
import { GateInput } from '../gate-ui/GateInput';
import { StatusChip } from '../gate-ui/StatusChip';
import { formatPaisaToBDT } from '../../utils/smsParser';

export const PayoutApprovalsTab: React.FC = () => {
  const {
    payouts,
    payoutBatches,
    approvePayout,
    rejectPayout,
    createPayoutBatch,
    verifyPayoutBatch,
    approvePayoutBatch,
    exportBatchFile,
    addToast,
  } = usePayGate();

  const [activeTab, setActiveTab] = useState<'batches' | 'individual' | 'history'>('batches');
  const [activeCheckerId, setActiveCheckerId] = useState('ops_tanvir');
  const [activeMakerId, setActiveMakerId] = useState('staff_sakib');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingPayoutId, setRejectingPayoutId] = useState<string | null>(null);
  const [selectedRail, setSelectedRail] = useState<'beftn' | 'npsb' | 'mfs'>('beftn');

  const unbatchedPendingPayouts = payouts.filter((p) => p.status === 'pending' && !p.batchId);
  const pendingPayouts = payouts.filter((p) => p.status === 'pending');
  const pastPayouts = payouts.filter((p) => p.status !== 'pending');

  const handleApproveIndividual = (payoutId: string) => {
    const result = approvePayout(payoutId, activeCheckerId);
    if (!result.success) {
      addToast('Checker Authorization Denied', result.message, 'error');
    }
  };

  const handleRejectIndividual = (payoutId: string) => {
    if (!rejectReason) {
      addToast('Reason Required', 'Please enter a reason for rejecting the payout', 'warning');
      return;
    }
    rejectPayout(payoutId, activeCheckerId, rejectReason);
    setRejectingPayoutId(null);
    setRejectReason('');
  };

  const handleGenerateBatch = () => {
    const res = createPayoutBatch(selectedRail, activeMakerId);
    if (res.success) {
      setActiveTab('batches');
    }
  };

  const handleDownloadBatch = (batchId: string) => {
    try {
      const { filename, content } = exportBatchFile(batchId);
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('File Exported', `Downloaded ${filename} for Bangladesh Bank BEFTN clearing`, 'success');
    } catch (err: any) {
      addToast('Export Failed', err.message || 'Could not export batch file', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[var(--ink)]">Automated Payout Batches & Dual Authorization</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] font-mono">
              BEFTN / NPSB Ready
            </span>
          </div>
          <p className="text-xs text-[var(--ink-2)] mt-0.5 max-w-2xl">
            Group pending merchant payouts into automated clearing batches. Dual-authorization policy enforces that
            a Maker compiles and verifies the batch while an independent Checker authorizes the Bangladesh Bank disbursement.
          </p>
        </div>

        {/* Staff Persona Selectors */}
        <div className="flex flex-wrap items-center gap-3 bg-[var(--surface-2)] p-2.5 rounded-xl border border-[var(--border)]">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[var(--ink-3)]">Maker:</span>
            <input
              type="text"
              value={activeMakerId}
              onChange={(e) => setActiveMakerId(e.target.value)}
              className="h-7 w-24 px-1.5 text-xs font-mono bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--ink)]"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[var(--ink-3)]">Checker:</span>
            <input
              type="text"
              value={activeCheckerId}
              onChange={(e) => setActiveCheckerId(e.target.value)}
              className="h-7 w-24 px-1.5 text-xs font-mono bg-[var(--surface)] border border-[var(--border)] rounded text-[var(--ink)]"
            />
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Batches vs Individual vs History */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 text-xs">
        <button
          onClick={() => setActiveTab('batches')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'batches'
              ? 'bg-[var(--ink)] text-[var(--bg)] shadow-xs'
              : 'text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Automated Batches ({payoutBatches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('individual')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'individual'
              ? 'bg-[var(--ink)] text-[var(--bg)] shadow-xs'
              : 'text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Unbatched Requests ({unbatchedPendingPayouts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-[var(--ink)] text-[var(--bg)] shadow-xs'
              : 'text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Disbursement Log ({pastPayouts.length})</span>
        </button>
      </div>

      {/* TAB 1: AUTOMATED BATCHES */}
      {activeTab === 'batches' && (
        <div className="space-y-6">
          {/* Quick Batch Creator Widget */}
          <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[var(--ink)] block">
                Pending Queue: {unbatchedPendingPayouts.length} disbursements ready for batching
              </span>
              <span className="text-xs text-[var(--ink-2)] block font-mono">
                Total Volume: {formatPaisaToBDT(unbatchedPendingPayouts.reduce((sum, p) => sum + p.amountPaisa, 0))}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedRail}
                onChange={(e) => setSelectedRail(e.target.value as any)}
                className="h-8 px-2.5 text-xs bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--ink)] uppercase font-mono font-medium outline-none"
              >
                <option value="beftn">BEFTN (Electronic Funds Transfer)</option>
                <option value="npsb">NPSB (Instant National Switch)</option>
                <option value="mfs">MFS Bulk Disbursement</option>
              </select>

              <GateButton
                variant="primary"
                size="sm"
                disabled={unbatchedPendingPayouts.length === 0}
                onClick={handleGenerateBatch}
                icon={<Layers className="w-3.5 h-3.5" />}
              >
                Create Automated Batch
              </GateButton>
            </div>
          </div>

          {/* Batches Table */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--ink)]">Active & Disbursed Clearing Batches</h4>
              <span className="text-xs text-[var(--ink-3)]">{payoutBatches.length} total batches</span>
            </div>

            {payoutBatches.length === 0 ? (
              <div className="py-12 text-center text-xs text-[var(--ink-3)]">
                No payout batches created yet. Click "Create Automated Batch" to group pending requests.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {payoutBatches.map((batch) => {
                  const isMakerSameAsChecker = batch.makerActor === activeCheckerId;

                  return (
                    <div key={batch.id} className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-bold font-mono text-[var(--ink)]">{batch.batchNumber}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--surface-2)] text-[var(--ink-2)] border border-[var(--border)] uppercase">
                            Rail: {batch.rail}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            batch.status === 'approved' || batch.status === 'disbursed'
                              ? 'bg-[var(--success)]/10 text-[var(--success)]'
                              : batch.status === 'verified'
                              ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                              : 'bg-[var(--warning)]/10 text-[var(--warning)]'
                          }`}>
                            {batch.status}
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono">
                          <span className="text-base font-bold text-[var(--ink)]">
                            {formatPaisaToBDT(batch.totalAmountPaisa)}
                          </span>
                          <span className="text-[var(--ink-3)]">·</span>
                          <span className="text-[var(--ink-2)]">{batch.payoutCount} payouts</span>
                          <span className="text-[var(--ink-3)]">·</span>
                          <span className="text-[var(--ink-2)]">{batch.merchantCount} merchants</span>
                        </div>

                        <div className="text-[11px] text-[var(--ink-3)] font-mono flex flex-wrap items-center gap-3">
                          <span>Maker: <strong className="text-[var(--ink)]">{batch.makerActor}</strong></span>
                          <span>Checker: <strong className="text-[var(--ink)]">{batch.checkerActor || 'Pending'}</strong></span>
                          {batch.clearingReference && (
                            <span className="text-[var(--success)] font-bold">Ref: {batch.clearingReference}</span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {batch.status === 'created' && (
                          <GateButton
                            variant="secondary"
                            size="sm"
                            onClick={() => verifyPayoutBatch(batch.id, activeMakerId)}
                            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          >
                            Maker: Verify Batch
                          </GateButton>
                        )}

                        {batch.status === 'verified' && (
                          <div className="flex items-center gap-2">
                            {isMakerSameAsChecker && (
                              <span className="text-xs text-[var(--danger)] font-medium flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Maker ≠ Checker
                              </span>
                            )}
                            <GateButton
                              variant="primary"
                              size="sm"
                              disabled={isMakerSameAsChecker}
                              onClick={() => approvePayoutBatch(batch.id, activeCheckerId)}
                              icon={<CheckCircle className="w-3.5 h-3.5" />}
                            >
                              Checker: Approve & Disburse
                            </GateButton>
                          </div>
                        )}

                        {(batch.status === 'approved' || batch.status === 'disbursed') && (
                          <GateButton
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDownloadBatch(batch.id)}
                            icon={<Download className="w-3.5 h-3.5" />}
                          >
                            Export BEFTN Clearing CSV
                          </GateButton>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INDIVIDUAL UNBATCHED REQUESTS */}
      {activeTab === 'individual' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--ink)]">Individual Unbatched Disbursement Requests</h3>
            <span className="text-xs text-[var(--ink-3)] font-mono">{unbatchedPendingPayouts.length} pending</span>
          </div>

          {unbatchedPendingPayouts.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--ink-3)]">
              All pending payouts are already assigned to batches or settled.
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {unbatchedPendingPayouts.map((p) => {
                const isSamePerson = p.makerId === activeCheckerId;

                return (
                  <div key={p.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold font-mono text-[var(--ink)]">{p.referenceId}</span>
                        <StatusChip status={p.status} size="sm" />
                      </div>
                      <div className="text-lg font-bold font-mono text-[var(--ink)]">
                        {formatPaisaToBDT(p.amountPaisa)}
                      </div>
                      <div className="text-xs text-[var(--ink-2)] flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>{p.payoutAccount.bankName || p.payoutAccount.provider?.toUpperCase() || 'MFS'} · A/C {p.payoutAccount.accountNumber} ({p.payoutAccount.accountName})</span>
                      </div>
                      <div className="text-[11px] font-mono text-[var(--ink-3)]">
                        Initiated by Maker: <strong className="text-[var(--ink)]">{p.makerId}</strong> at {new Date(p.requestedAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 w-full md:w-auto">
                      {isSamePerson && (
                        <span className="text-xs text-[var(--danger)] font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Maker cannot be Checker
                        </span>
                      )}

                      <GateButton
                        variant="danger"
                        size="sm"
                        onClick={() => setRejectingPayoutId(p.id)}
                      >
                        Reject
                      </GateButton>

                      <GateButton
                        variant="primary"
                        size="sm"
                        disabled={isSamePerson}
                        onClick={() => handleApproveIndividual(p.id)}
                        icon={<CheckCircle className="w-3.5 h-3.5" />}
                      >
                        Individual Approve
                      </GateButton>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DISBURSEMENT HISTORY */}
      {activeTab === 'history' && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--ink)]">Settlement Disbursement Log</h3>
            <span className="text-xs text-[var(--ink-3)] font-mono">{pastPayouts.length} records</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-2)]/60 text-[var(--ink-3)] font-medium border-b border-[var(--border)]">
                <tr>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Destination</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Maker</th>
                  <th className="py-3 px-4">Checker</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Resolved At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-[var(--ink)] font-mono">
                {pastPayouts.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                    <td className="py-3 px-4 font-bold">{p.referenceId}</td>
                    <td className="py-3 px-4 font-sans">
                      <span className="font-medium text-[var(--ink)]">{p.payoutAccount.bankName || p.payoutAccount.provider?.toUpperCase()}</span>
                      <span className="block text-[10px] text-[var(--ink-3)] font-mono">{p.payoutAccount.accountNumber}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[var(--ink)]">
                      {formatPaisaToBDT(p.amountPaisa)}
                    </td>
                    <td className="py-3 px-4 text-[var(--ink-2)]">{p.makerId}</td>
                    <td className="py-3 px-4 text-[var(--success)]">{p.checkerId || '—'}</td>
                    <td className="py-3 px-4">
                      <StatusChip status={p.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--ink-3)]">
                      {p.approvedAt ? new Date(p.approvedAt).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingPayoutId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[var(--ink)] mb-1">Reject Disbursement Request</h3>
            <p className="text-xs text-[var(--ink-3)] mb-4">
              Funds will be returned to the merchant's available balance.
            </p>

            <div className="space-y-4">
              <GateInput
                label="Rejection Reason"
                placeholder="e.g. Bank account details need re-verification"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
              />

              <div className="flex items-center gap-2 pt-2">
                <GateButton
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setRejectingPayoutId(null)}
                >
                  Cancel
                </GateButton>
                <GateButton
                  type="button"
                  variant="danger"
                  className="flex-1"
                  onClick={() => handleRejectIndividual(rejectingPayoutId)}
                >
                  Confirm Rejection
                </GateButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
