import React from 'react';
import {
  Smartphone,
  Battery,
  BatteryCharging,
  Wifi,
  WifiOff,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { usePayGate } from '../../context/PayGateContext';
import { GateButton } from '../gate-ui/GateButton';
import { StatusChip } from '../gate-ui/StatusChip';

export const FleetTab: React.FC = () => {
  const { devices, wallets, deviceHeartbeat, revokeDevice, setActiveAdminTab, addToast } = usePayGate();

  return (
    <div className="space-y-6">
      {/* Silenced Fleet Notice */}
      <div className="p-4 sm:p-5 bg-zinc-500/10 border border-zinc-500/25 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-zinc-500/20 text-zinc-600 dark:text-zinc-400 shrink-0">
            <Smartphone className="w-5 h-5 opacity-70" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--ink)]">
                Multi-Node Fleet System Silenced
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-500/20 text-zinc-600 dark:text-zinc-400">
                Paused / Secondary
              </span>
            </div>
            <p className="text-xs text-[var(--ink-2)] mt-0.5 leading-relaxed">
              Multi-device load distribution is currently paused. Production SMS ingestion is unified under the <strong>Super Admin Terminal</strong> with strict IP whitelisting.
            </p>
          </div>
        </div>
        <GateButton
          variant="primary"
          size="sm"
          onClick={() => setActiveAdminTab('device')}
          icon={<ShieldAlert className="w-3.5 h-3.5" />}
        >
          Open Super Admin Device
        </GateButton>
      </div>

      {/* Fleet Overview Strip */}
      <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[var(--ink)]">Archived Phone Fleet Nodes</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-600">
              Standby Nodes
            </span>
          </div>
          <p className="text-xs text-[var(--ink-2)] mt-0.5">
            Registered handset telemetry for fallback multi-SIM tower distribution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GateButton
            variant="secondary"
            size="sm"
            onClick={() => {
              devices.forEach((d) => deviceHeartbeat(d.id));
              addToast('Heartbeats Polled', 'All active nodes reported normal connectivity', 'info');
            }}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Poll Heartbeats
          </GateButton>
        </div>
      </div>

      {/* Handset Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {devices.map((device) => {
          const sim1Wallet = wallets.find((w) => w.id === device.sim1WalletId);
          const sim2Wallet = wallets.find((w) => w.id === device.sim2WalletId);
          const isOnline = device.status === 'online';

          return (
            <div
              key={device.id}
              className={`p-5 bg-[var(--surface)] border rounded-2xl flex flex-col justify-between transition-all shadow-xs ${
                device.status === 'revoked'
                  ? 'border-[var(--danger)]/30 opacity-70'
                  : 'border-[var(--border)] hover:border-[var(--border)]'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--border)]">
                      <Smartphone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--ink)] leading-tight">{device.name}</h4>
                      <span className="text-[11px] text-[var(--ink-3)] font-mono">{device.model}</span>
                    </div>
                  </div>
                  <StatusChip status={device.status} size="sm" />
                </div>

                {/* Telemetry rows */}
                <div className="mt-4 p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--ink-3)] flex items-center gap-1.5">
                      <Battery className="w-3.5 h-3.5 text-[var(--success)]" /> Battery Level
                    </span>
                    <span className="font-mono font-bold text-[var(--ink)]">{device.battery}%</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[var(--ink-3)] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[var(--accent)]" /> Last Heartbeat
                    </span>
                    <span className="font-mono text-[var(--ink-2)]">
                      {new Date(device.lastHeartbeatAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[var(--ink-3)]">Queue Backlog</span>
                    <span className="font-mono font-bold text-[var(--ink)]">{device.queueDepth} SMS</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[var(--ink-3)]">Forwarder App</span>
                    <span className="font-mono text-[var(--ink-2)]">{device.appVersion}</span>
                  </div>
                </div>

                {/* SIM Slots mapping */}
                <div className="mt-3 space-y-1.5 text-xs">
                  <span className="text-[11px] font-semibold text-[var(--ink-3)] block uppercase tracking-wider">
                    Assigned SIM Wallets
                  </span>
                  {sim1Wallet && (
                    <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between font-mono text-[11px]">
                      <span>SIM 1: {sim1Wallet.provider.toUpperCase()}</span>
                      <span className="font-semibold text-[var(--ink)]">{sim1Wallet.msisdn}</span>
                    </div>
                  )}
                  {sim2Wallet && (
                    <div className="p-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] flex items-center justify-between font-mono text-[11px]">
                      <span>SIM 2: {sim2Wallet.provider.toUpperCase()}</span>
                      <span className="font-semibold text-[var(--ink)]">{sim2Wallet.msisdn}</span>
                    </div>
                  )}
                </div>

                {/* Permission checks */}
                <div className="mt-3 flex items-center gap-3 text-[11px] text-[var(--ink-3)]">
                  <span className="flex items-center gap-1 text-[var(--success)]">
                    <CheckCircle2 className="w-3 h-3" /> SMS Read
                  </span>
                  <span className="flex items-center gap-1 text-[var(--success)]">
                    <CheckCircle2 className="w-3 h-3" /> Receive
                  </span>
                  <span className="flex items-center gap-1 text-[var(--success)]">
                    <CheckCircle2 className="w-3 h-3" /> No Sleep
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 mt-4 border-t border-[var(--border)] flex items-center gap-2">
                <GateButton
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  disabled={device.status === 'revoked'}
                  onClick={() => deviceHeartbeat(device.id)}
                >
                  Send Ping
                </GateButton>
                {device.status !== 'revoked' ? (
                  <GateButton
                    variant="danger"
                    size="sm"
                    onClick={() => revokeDevice(device.id)}
                  >
                    Revoke
                  </GateButton>
                ) : (
                  <GateButton
                    variant="ghost"
                    size="sm"
                    disabled
                  >
                    Revoked
                  </GateButton>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
