import React, { useState } from 'react';
import {
  DollarSign,
  Download,
  Building,
  Smartphone,
  ShieldCheck,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { usePayGate } from '../../context/PayGateContext';
import { GateButton } from '../gate-ui/GateButton';
import { GateInput } from '../gate-ui/GateInput';
import { StatusChip } from '../gate-ui/StatusChip';
import { EmptyState } from '../gate-ui/EmptyState';
import { formatPaisaToBDT } from '../../utils/smsParser';

export const SettlementsTab: React.FC = () => {
  const {
    merchant,
    ledgerEntries,
    payouts,
    requestPayout,
    addToast,
  } = usePayGate();

  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('1000');
  const [makerStaffId, setMakerStaffId] = useState('staff_sakib');

  const handlePayoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(payoutAmount);
    if (isNaN(amt) || amt < 1000) {
      addToast('Minimum Tk 1,000 Required', 'Eligible payouts must be at least Tk 1,000.00', 'warning');
      return;
    }
    const result = requestPayout(amt, makerStaffId);
    if (result.success) {
      setIsPayoutModalOpen(false);
    }
  };

  const sanitizeCsv = (val: any) => {
    const s = String(val ?? '');
    const clean = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return `"${clean.replace(/"/g, '""')}"`;
  };

  const handleExportLedgerCSV = () => {
    const headers = ['Entry ID', 'Type', 'Description', 'Debit (Paisa)', 'Credit (Paisa)', 'Balance After (BDT)', 'Timestamp'];
    const rows = ledgerEntries.map((l) => [
      sanitizeCsv(l.id),
      sanitizeCsv(l.type),
      sanitizeCsv(l.description),
      sanitizeCsv(l.debitPaisa),
      sanitizeCsv(l.creditPaisa),
      sanitizeCsv((l.balancePaisaAfter / 100).toFixed(2)),
      sanitizeCsv(l.createdAt),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.map(sanitizeCsv).join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PayGate_Ledger_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Statement Downloaded', 'Exported double-entry ledger statement', 'success');
  };

  const availableBDT = merchant.balancePaisa / 100;
  const heldBDT = merchant.heldPaisa / 100;

  return (
    <div className="space-y-6">
      {/* Balances Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
          <span className="text-xs font-medium text-[var(--ink-3)] block mb-1">
            Available for Settlement
          </span>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-[var(--ink)] tabular-nums">
            {formatPaisaToBDT(merchant.balancePaisa)}
          </div>
          <span className="text-xs text-[var(--ink-2)] mt-1.5 block">
            Accumulated net payments after 5.00% fee
          </span>
        </div>

        <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
          <span className="text-xs font-medium text-[var(--ink-3)] block mb-1">
            Held in Pending Payouts
          </span>
          <div className="text-2xl sm:text-3xl font-semibold font-mono text-[var(--warning)] tabular-nums">
            {formatPaisaToBDT(merchant.heldPaisa)}
          </div>
          <span className="text-xs text-[var(--ink-2)] mt-1.5 block">
            Awaiting 2-person checker approval
          </span>
        </div>

        <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col justify-between">
          <div>
            <span className="text-xs font-medium text-[var(--ink-3)] block mb-1">
              Registered Settlement Account
            </span>
            <div className="text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
              <Building className="w-4 h-4 text-[var(--accent)]" />
              <span>{merchant.payoutAccount.bankName || 'MFS Wallet'}</span>
            </div>
            <div className="text-xs font-mono text-[var(--ink-2)] mt-0.5">
              A/C {merchant.payoutAccount.accountNumber} ({merchant.payoutAccount.accountName})
            </div>
          </div>

          <div className="pt-3">
            <GateButton
              variant="primary"
              size="sm"
              className="w-full"
              disabled={availableBDT < 1000}
              onClick={() => setIsPayoutModalOpen(true)}
              icon={<DollarSign className="w-3.5 h-3.5" />}
            >
              {availableBDT < 1000 ? 'Minimum Tk 1,000 Required' : 'Request Payout'}
            </GateButton>
          </div>
        </div>
      </div>

      {/* Payouts Queue */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--ink)]">Payout Disbursements</h3>
            <p className="text-xs text-[var(--ink-3)]">
              All disbursements require two-person authorization (Maker: Staff, Checker: Senior Ops)
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-2)]/60 text-[var(--ink-3)] font-medium border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-4">Payout Ref</th>
                <th className="py-3 px-4">Destination Account</th>
                <th className="py-3 px-4 text-right">Amount (BDT)</th>
                <th className="py-3 px-4">Maker / Checker</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Requested At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--ink)]">
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6">
                    <EmptyState
                      title="No Payouts Disbursed Yet"
                      description="Once your settled balance accumulates past Tk 1,000, you can request an instant bank transfer or MFS payout."
                    />
                  </td>
                </tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-[var(--ink)]">
                      {p.referenceId}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-[var(--ink)]">{p.payoutAccount.bankName || 'MFS'}</span>
                      <span className="block text-[11px] font-mono text-[var(--ink-3)]">{p.payoutAccount.accountNumber}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[var(--ink)]">
                      {formatPaisaToBDT(p.amountPaisa)}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="font-mono text-[var(--ink-2)]">Maker: {p.makerId}</span>
                      {p.checkerId ? (
                        <span className="block text-[10px] text-[var(--success)] font-mono">Checker: {p.checkerId}</span>
                      ) : (
                        <span className="block text-[10px] text-[var(--warning)] italic">Awaiting checker approval</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusChip status={p.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[var(--ink-3)]">
                      {new Date(p.requestedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Double-Entry Ledger Statements Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--ink)]">Double-Entry Ledger Statements</h3>
            <p className="text-xs text-[var(--ink-3)]">
              Every customer pay-in, 5% fee debit, and bank payout is strictly reconciled in the immutable ledger.
            </p>
          </div>
          <GateButton
            variant="secondary"
            size="sm"
            onClick={handleExportLedgerCSV}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export Ledger Statement
          </GateButton>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-2)]/60 text-[var(--ink-3)] font-medium border-b border-[var(--border)] sticky top-0">
              <tr>
                <th className="py-3 px-4">Entry ID</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Debit (Expense)</th>
                <th className="py-3 px-4 text-right">Credit (Income)</th>
                <th className="py-3 px-4 text-right">Balance After</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--ink)] font-mono">
              {ledgerEntries.map((l) => (
                <tr key={l.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                  <td className="py-2.5 px-4 text-[11px] text-[var(--ink-3)]">{l.id}</td>
                  <td className="py-2.5 px-4 font-sans font-medium uppercase text-[10px] tracking-wider text-[var(--ink-2)]">
                    {l.type.replace('_', ' ')}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-xs text-[var(--ink)]">{l.description}</td>
                  <td className="py-2.5 px-4 text-right text-[var(--danger)] tabular-nums">
                    {l.debitPaisa > 0 ? `- ${formatPaisaToBDT(l.debitPaisa)}` : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right text-[var(--success)] tabular-nums font-semibold">
                    {l.creditPaisa > 0 ? `+ ${formatPaisaToBDT(l.creditPaisa)}` : '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold tabular-nums text-[var(--ink)]">
                    {formatPaisaToBDT(l.balancePaisaAfter)}
                  </td>
                  <td className="py-2.5 px-4 text-right text-[11px] text-[var(--ink-3)]">
                    {new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Payout Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[var(--ink)] mb-1">Request Settlement Payout</h3>
            <p className="text-xs text-[var(--ink-3)] mb-4">
              Payouts are disbursed to {merchant.payoutAccount.bankName} (A/C {merchant.payoutAccount.accountNumber}).
              Minimum threshold is Tk 1,000.00.
            </p>

            <form onSubmit={handlePayoutSubmit} className="space-y-4">
              <GateInput
                label="Disbursement Amount (BDT)"
                type="number"
                min="1000"
                step="100"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                hint={`Available: ${formatPaisaToBDT(merchant.balancePaisa)}`}
                isMono
                required
              />

              <GateInput
                label="Initiating Staff (Maker ID)"
                value={makerStaffId}
                onChange={(e) => setMakerStaffId(e.target.value)}
                isMono
                required
                hint="Requires second-person verification from Operations console"
              />

              <div className="p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] text-xs space-y-1">
                <span className="font-semibold text-[var(--ink)] block">Maker-Checker Policy:</span>
                <p className="text-[var(--ink-2)] text-[11px]">
                  Funds will transition to "Held in Pending" until an authorized Operations Officer approves the disbursement.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <GateButton
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setIsPayoutModalOpen(false)}
                >
                  Cancel
                </GateButton>
                <GateButton type="submit" variant="primary" className="flex-1">
                  Submit Payout
                </GateButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
