import React, { useState } from 'react';
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Plus,
  Play,
  Layers,
} from 'lucide-react';
import { usePayGate } from '../../context/PayGateContext';
import { StatCard } from '../gate-ui/StatCard';
import { StatusChip } from '../gate-ui/StatusChip';
import { ReferenceChip } from '../gate-ui/ReferenceChip';
import { ProviderBadge } from '../gate-ui/ProviderBadge';
import { GateButton } from '../gate-ui/GateButton';
import { formatPaisaToBDT } from '../../utils/smsParser';

export const OverviewTab: React.FC = () => {
  const {
    merchant,
    payments,
    plans,
    setSelectedPaymentId,
    setActiveMerchantTab,
    createPayment,
    setPopupPayModalId,
    setActiveView,
  } = usePayGate();

  const [isCreatingQuickPayment, setIsCreatingQuickPayment] = useState(false);

  // Compute metrics
  const totalVolumePaisa = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amountPaisa, 0);

  const netRevenuePaisa = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.netAmountPaisa, 0);

  const paidCount = payments.filter((p) => p.status === 'paid').length;
  const reviewCount = payments.filter((p) => p.status === 'needs_review').length;

  const recentPayments = payments.slice(0, 6);

  const handleQuickCreateAndTest = (launchMode: 'redirect' | 'popup') => {
    setIsCreatingQuickPayment(true);
    try {
      const plan = plans[0] || { id: 'default', amountPaisa: 120000 };
      const newPay = createPayment(plan.id, 'bkash');
      setSelectedPaymentId(newPay.id);

      if (launchMode === 'popup') {
        setPopupPayModalId(newPay.id);
      } else {
        setActiveView('pay');
      }
    } finally {
      setIsCreatingQuickPayment(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Attention Queue Banner if needs_review exist */}
      {reviewCount > 0 && (
        <div className="p-4 bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-2xl flex items-center justify-between transition-all">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--warning)]/20 text-[var(--warning)] rounded-xl shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--ink)]">
                {reviewCount} Payment{reviewCount > 1 ? 's' : ''} Require Operational Review
              </h4>
              <p className="text-xs text-[var(--ink-2)] mt-0.5">
                Amount mismatch or wrong wallet detected. Review in payments queue to inspect customer TrxID claim vs SMS logs.
              </p>
            </div>
          </div>
          <GateButton
            variant="secondary"
            size="sm"
            onClick={() => setActiveMerchantTab('payments')}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            Review Queue
          </GateButton>
        </div>
      )}

      {/* 4 Stat Cards Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          caption="Total Paid Volume"
          value={formatPaisaToBDT(totalVolumePaisa)}
          delta={{ value: '+18.4%', isPositive: true, period: 'vs last week' }}
          icon={<CreditCard className="w-4 h-4" />}
        />
        <StatCard
          caption="Net Merchant Earnings"
          value={formatPaisaToBDT(netRevenuePaisa)}
          delta={{ value: '+17.9%', isPositive: true, period: 'after 5% fee' }}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <StatCard
          caption="Paid Transactions"
          value={paidCount.toString()}
          delta={{ value: '96.2%', isPositive: true, period: 'match success' }}
          icon={<CheckCircle className="w-4 h-4" />}
        />
        <StatCard
          caption="Available Settlement"
          value={formatPaisaToBDT(merchant.balancePaisa)}
          subtext={`Min payout Tk 1,000 · ${merchant.payoutAccount.bankName || 'MFS'}`}
          icon={<DollarSign className="w-4 h-4" />}
        />
      </div>

      {/* Quick Launch & Test Strip */}
      <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center shrink-0">
            <Play className="w-5 h-5 ml-0.5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--ink)]">Test Hosted Checkout Page</h4>
            <p className="text-xs text-[var(--ink-2)]">
              Issue an instant 8-character reference with assigned wallet pool and test live payment flow.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <GateButton
            variant="secondary"
            size="sm"
            onClick={() => handleQuickCreateAndTest('popup')}
            isLoading={isCreatingQuickPayment}
          >
            Test Popup Modal
          </GateButton>
          <GateButton
            variant="primary"
            size="sm"
            onClick={() => handleQuickCreateAndTest('redirect')}
            isLoading={isCreatingQuickPayment}
            icon={<Plus className="w-3.5 h-3.5" />}
          >
            Create & Pay Now
          </GateButton>
        </div>
      </div>

      {/* Recent Payments Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[var(--ink)]">Recent Transactions</h3>
            <p className="text-xs text-[var(--ink-3)]">Click any row to inspect proof, timeline, and webhook delivery</p>
          </div>
          <GateButton
            variant="ghost"
            size="sm"
            onClick={() => setActiveMerchantTab('payments')}
            icon={<ArrowRight className="w-3.5 h-3.5" />}
          >
            View All ({payments.length})
          </GateButton>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-2)]/60 text-[var(--ink-3)] font-medium border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-4">Order / ID</th>
                <th className="py-3 px-4">Provider</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Plan</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-right">Net</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--ink)]">
              {recentPayments.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => setSelectedPaymentId(p.id)}
                  className="hover:bg-[var(--surface-2)]/50 cursor-pointer transition-colors"
                >
                  <td className="py-3.5 px-4 font-mono font-medium text-[var(--ink)]">
                    {p.orderId}
                  </td>
                  <td className="py-3.5 px-4">
                    <ProviderBadge provider={p.provider} size="sm" />
                  </td>
                  <td className="py-3.5 px-4">
                    <ReferenceChip reference={p.reference} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 font-medium text-[var(--ink-2)] truncate max-w-[140px]">
                    {p.planSnapshot.name}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold">
                    {formatPaisaToBDT(p.amountPaisa)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[var(--success)] font-medium">
                    {formatPaisaToBDT(p.netAmountPaisa)}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusChip status={p.status} reviewReason={p.reviewReason} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 text-right text-[var(--ink-3)] font-mono">
                    {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
