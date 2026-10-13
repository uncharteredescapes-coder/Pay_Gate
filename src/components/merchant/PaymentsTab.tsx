import React, { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { usePayGate } from '../../context/PayGateContext';
import { PaymentStatus, ProviderType } from '../../types';
import { StatusChip } from '../gate-ui/StatusChip';
import { ReferenceChip } from '../gate-ui/ReferenceChip';
import { ProviderBadge } from '../gate-ui/ProviderBadge';
import { GateButton } from '../gate-ui/GateButton';
import { GateInput } from '../gate-ui/GateInput';
import { EmptyState } from '../gate-ui/EmptyState';
import { formatPaisaToBDT } from '../../utils/smsParser';

export const PaymentsTab: React.FC = () => {
  const {
    payments,
    plans,
    setSelectedPaymentId,
    createPayment,
    setActiveView,
    addToast,
  } = usePayGate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New payment form state
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || '');
  const [selectedProvider, setSelectedProvider] = useState<ProviderType>('bkash');
  const [customOrderId, setCustomOrderId] = useState(`ORD-${Math.floor(10000 + Math.random() * 90000)}`);
  const [customerPhone, setCustomerPhone] = useState('01712000000');

  // Filter payments
  const filtered = payments.filter((p) => {
    const matchesSearch =
      p.orderId.toLowerCase().includes(search.toLowerCase()) ||
      p.reference.toLowerCase().includes(search.toLowerCase()) ||
      (p.submittedTrxId && p.submittedTrxId.toLowerCase().includes(search.toLowerCase())) ||
      (p.customerPhone && p.customerPhone.includes(search));

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesProvider = providerFilter === 'all' || p.provider === providerFilter;

    return matchesSearch && matchesStatus && matchesProvider;
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newPayment = createPayment(selectedPlanId, selectedProvider, customOrderId, customerPhone);
    setIsCreateModalOpen(false);
    setSelectedPaymentId(newPayment.id);
  };

  const sanitizeCsv = (val: any) => {
    const s = String(val ?? '');
    const clean = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return `"${clean.replace(/"/g, '""')}"`;
  };

  const handleExportCSV = () => {
    const headers = ['Order ID', 'Status', 'Provider', 'Reference', 'Amount BDT', 'Fee BDT', 'Net BDT', 'TrxID', 'Created At'];
    const rows = filtered.map((p) => [
      sanitizeCsv(p.orderId),
      sanitizeCsv(p.status),
      sanitizeCsv(p.provider),
      sanitizeCsv(p.reference),
      sanitizeCsv((p.amountPaisa / 100).toFixed(2)),
      sanitizeCsv((p.feeAmountPaisa / 100).toFixed(2)),
      sanitizeCsv((p.netAmountPaisa / 100).toFixed(2)),
      sanitizeCsv(p.submittedTrxId || ''),
      sanitizeCsv(p.createdAt),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.map(sanitizeCsv).join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PayGate_Payments_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('CSV Exported', `Exported ${filtered.length} payment records`, 'success');
  };

  return (
    <div className="space-y-4">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 max-w-lg">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[var(--ink-3)]" />
            <input
              type="text"
              placeholder="Search reference, order ID, TrxID, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full pl-9 pr-3 text-xs bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--ink)] placeholder:text-[var(--ink-3)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Provider Filter */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            className="h-10 px-2.5 text-xs bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--ink)] outline-none cursor-pointer"
          >
            <option value="all">All Providers</option>
            <option value="bkash">bKash</option>
            <option value="nagad">Nagad</option>
            <option value="rocket">Rocket</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-2.5 text-xs bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--ink)] outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="awaiting_payment">Awaiting Payment</option>
            <option value="confirming">Confirming</option>
            <option value="needs_review">Needs Review</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <GateButton
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            icon={<Download className="w-3.5 h-3.5" />}
          >
            Export CSV
          </GateButton>
          <GateButton
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Payment
          </GateButton>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-2)]/60 text-[var(--ink-3)] font-medium border-b border-[var(--border)] sticky top-0">
              <tr>
                <th className="py-3.5 px-4">Payment ID / Order</th>
                <th className="py-3.5 px-4">Provider</th>
                <th className="py-3.5 px-4">Reference</th>
                <th className="py-3.5 px-4">Plan / SKU</th>
                <th className="py-3.5 px-4 text-right">Amount (BDT)</th>
                <th className="py-3.5 px-4 text-right">Fee (5%)</th>
                <th className="py-3.5 px-4 text-right">Net Payable</th>
                <th className="py-3.5 px-4">TrxID Claim</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--ink)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6">
                    <EmptyState
                      title={search || statusFilter !== 'all' || providerFilter !== 'all' ? 'No Matching Payments Found' : 'No Payments Created Yet'}
                      description={
                        search || statusFilter !== 'all' || providerFilter !== 'all'
                          ? 'Try clearing the search query or adjusting your status and provider filters.'
                          : 'Generate your first payment link or launch a test checkout to see live records.'
                      }
                      actionLabel={search || statusFilter !== 'all' || providerFilter !== 'all' ? 'Reset Filters' : 'Create Payment'}
                      onAction={() => {
                        if (search || statusFilter !== 'all' || providerFilter !== 'all') {
                          setSearch('');
                          setStatusFilter('all');
                          setProviderFilter('all');
                        } else {
                          setIsCreateModalOpen(true);
                        }
                      }}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPaymentId(p.id)}
                    className="hover:bg-[var(--surface-2)]/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-[var(--ink)]">{p.orderId}</div>
                      <div className="text-[10px] text-[var(--ink-3)] font-mono">{p.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <ProviderBadge provider={p.provider} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <ReferenceChip reference={p.reference} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-[var(--ink-2)] block truncate max-w-[130px]">
                        {p.planSnapshot.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                      {formatPaisaToBDT(p.amountPaisa)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[var(--danger)]">
                      {formatPaisaToBDT(p.feeAmountPaisa)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-[var(--success)] font-medium">
                      {formatPaisaToBDT(p.netAmountPaisa)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {p.submittedTrxId ? (
                        <span className="font-semibold text-[var(--ink)]">{p.submittedTrxId}</span>
                      ) : (
                        <span className="text-[var(--ink-3)] italic">--</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusChip status={p.status} reviewReason={p.reviewReason} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--ink-3)] font-mono">
                      {new Date(p.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                      {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Payment Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[var(--ink)] mb-1">Create New Payment</h3>
            <p className="text-xs text-[var(--ink-3)] mb-4">
              Select a pricing plan to lock the amount and assign a wallet from the active pool.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[var(--ink-2)] block mb-1">Select Pricing Plan</label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--ink)] outline-none"
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} — {formatPaisaToBDT(plan.amountPaisa)} ({plan.externalSku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--ink-2)] block mb-1">Preferred Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['bkash', 'nagad', 'rocket'] as ProviderType[]).map((prov) => (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => setSelectedProvider(prov)}
                      className={`h-9 rounded-lg border text-xs font-medium capitalize flex items-center justify-center gap-1.5 cursor-pointer ${
                        selectedProvider === prov
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]/50 text-[var(--accent)] font-semibold'
                          : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-2)]'
                      }`}
                    >
                      <ProviderBadge provider={prov} showLabel={false} size="sm" />
                      <span>{prov}</span>
                    </button>
                  ))}
                </div>
              </div>

              <GateInput
                label="Merchant Order ID"
                value={customOrderId}
                onChange={(e) => setCustomOrderId(e.target.value)}
                isMono
                required
              />

              <GateInput
                label="Customer Phone (Optional)"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="017xxxxxxxx"
                isMono
              />

              <div className="flex items-center gap-2 pt-2">
                <GateButton
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </GateButton>
                <GateButton type="submit" variant="primary" className="flex-1">
                  Issue Payment
                </GateButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
