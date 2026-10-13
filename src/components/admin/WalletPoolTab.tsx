import React from 'react';
import {
  Wallet as WalletIcon,
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { usePayGate } from '../../context/PayGateContext';
import { ProviderBadge } from '../gate-ui/ProviderBadge';
import { StatusChip } from '../gate-ui/StatusChip';
import { GateButton } from '../gate-ui/GateButton';
import { formatPaisaToBDT } from '../../utils/smsParser';

export const WalletPoolTab: React.FC = () => {
  const { wallets, toggleWalletDrain } = usePayGate();

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[var(--ink)]">MFS Receiving Wallet Pool</h3>
          <p className="text-xs text-[var(--ink-2)] mt-0.5">
            Wallets receive payments from customers. PayGate automatically assigns active wallets with the lowest
            recent assignments, and auto-drains wallets reaching &gt;80% of daily limits to avoid operator freezes.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--ink-3)]">
          <span>{wallets.filter((w) => w.status === 'active').length} Active</span>
          <span>·</span>
          <span>{wallets.filter((w) => w.status === 'draining').length} Draining</span>
        </div>
      </div>

      {/* Wallet Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {wallets.map((wallet) => {
          const utilPct = Math.min(100, Math.round((wallet.todayTotalPaisa / wallet.dailyLimitPaisa) * 100));
          const isHighUtil = utilPct >= 80;

          return (
            <div
              key={wallet.id}
              className={`p-5 bg-[var(--surface)] border rounded-2xl flex flex-col justify-between transition-all shadow-xs ${
                wallet.status === 'draining'
                  ? 'border-[var(--warning)]/40 bg-[var(--warning)]/5'
                  : 'border-[var(--border)] hover:border-[var(--border)]'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <ProviderBadge provider={wallet.provider} />
                    <div className="text-base font-bold font-mono text-[var(--ink)] tracking-wider mt-1">
                      {wallet.msisdn}
                    </div>
                    <span className="text-xs text-[var(--ink-3)]">{wallet.holderName}</span>
                  </div>
                  <StatusChip status={wallet.status} size="sm" />
                </div>

                {/* Utilization Limit Progress Bar */}
                <div className="mt-4 p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--ink-3)]">Daily Limit Utilization</span>
                    <span className={`font-mono font-bold ${isHighUtil ? 'text-[var(--warning)]' : 'text-[var(--ink)]'}`}>
                      {utilPct}%
                    </span>
                  </div>

                  <div className="w-full bg-[var(--surface)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                    <div
                      className={`h-full transition-all ${
                        isHighUtil ? 'bg-[var(--warning)]' : 'bg-[var(--accent)]'
                      }`}
                      style={{ width: `${utilPct}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] font-mono text-[var(--ink-3)] pt-0.5">
                    <span>Used: {formatPaisaToBDT(wallet.todayTotalPaisa)}</span>
                    <span>Max: {formatPaisaToBDT(wallet.dailyLimitPaisa)}</span>
                  </div>
                </div>

                {/* Concurrency and Queuing Details */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--ink-3)] block uppercase">Pending Claims</span>
                    <span className="font-mono font-bold text-[var(--ink)]">
                      {wallet.activePendingCount} / {wallet.concurrencyCap} cap
                    </span>
                  </div>
                  <div className="p-2.5 bg-[var(--surface-2)] rounded-lg border border-[var(--border)]">
                    <span className="text-[10px] text-[var(--ink-3)] block uppercase">Sim Slot</span>
                    <span className="font-mono font-bold text-[var(--ink)]">
                      Slot {wallet.simSlot}
                    </span>
                  </div>
                </div>

                <div className="mt-2 text-[11px] font-mono text-[var(--ink-3)]">
                  Last assigned: {new Date(wallet.lastAssignedAt).toLocaleTimeString()}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 mt-4 border-t border-[var(--border)]">
                <GateButton
                  variant={wallet.status === 'draining' ? 'primary' : 'secondary'}
                  size="sm"
                  className="w-full"
                  onClick={() => toggleWalletDrain(wallet.id)}
                >
                  {wallet.status === 'draining' ? 'Restore to Active Pool' : 'Enable Drain Mode'}
                </GateButton>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
