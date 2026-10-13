import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Battery,
  Wifi,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  Plus,
  Trash2,
  Send,
  Sparkles,
  Terminal,
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { usePayGate } from '../../context/PayGateContext';
import { ProviderType } from '../../types';
import { GateButton } from '../gate-ui/GateButton';
import { GateInput } from '../gate-ui/GateInput';
import { ProviderBadge } from '../gate-ui/ProviderBadge';

export const SuperAdminDeviceTab: React.FC = () => {
  const {
    superAdminDevice,
    payments,
    wallets,
    addWhitelistedIp,
    removeWhitelistedIp,
    toggleIpEnforcement,
    setActiveClientIp,
    pingSuperAdminDevice,
    verifyClientIp,
    ingestForwardedSms,
    setSelectedPaymentId,
    addToast,
  } = usePayGate();

  // IP management state
  const [newIpInput, setNewIpInput] = useState('');
  const [simulatedIpInput, setSimulatedIpInput] = useState(superAdminDevice.activeClientIp);
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [lastPingLatency, setLastPingLatency] = useState<number | null>(null);

  // SMS Simulator state (Integrated inside this Super Admin Device tab)
  const pendingPayments = payments.filter(
    (p) => p.status === 'awaiting_payment' || p.status === 'confirming'
  );
  const targetPayment = pendingPayments[0] || payments[0];

  const [selectedPaymentId, setPaymentSelect] = useState<string>(targetPayment?.id || '');
  const [provider, setProvider] = useState<ProviderType>(targetPayment?.provider || 'bkash');
  const [trxId, setTrxId] = useState(`DJC9S${Math.floor(10000 + Math.random() * 90000)}`);
  const [amountBDT, setAmountBDT] = useState(
    targetPayment ? (targetPayment.amountPaisa / 100).toFixed(2) : '1200.00'
  );
  const [reference, setReference] = useState(targetPayment?.reference || 'K7M4X2QH');
  const [simSlot, setSimSlot] = useState<1 | 2>(1);
  const [senderName, setSenderName] = useState('bKash');
  const [rawSmsBody, setRawSmsBody] = useState('');
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsResult, setSmsResult] = useState<any>(null);

  // Connection check calculation
  const connectionCheck = verifyClientIp(superAdminDevice.activeClientIp);

  // Sync when target payment changes
  useEffect(() => {
    const cur = payments.find((p) => p.id === selectedPaymentId);
    if (cur) {
      setProvider(cur.provider);
      setAmountBDT((cur.amountPaisa / 100).toFixed(2));
      setReference(cur.reference);
      setSenderName(cur.provider.toUpperCase());
    }
  }, [selectedPaymentId, payments]);

  // Regenerate SMS text template
  useEffect(() => {
    let body = '';
    const nowStr =
      new Date().toLocaleDateString('en-GB') +
      ' ' +
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (provider === 'bkash') {
      body = `You have received Tk ${amountBDT} from 01712750278. Fee Tk 0.00. Balance Tk 14,500.00. TrxID ${trxId} and Ref ${reference} at ${nowStr}.`;
    } else if (provider === 'nagad') {
      body = `Tk ${amountBDT} received from 01812345678. TxnID ${trxId} at ${nowStr}. Ref: ${reference}. Balance: Tk 14,500.00.`;
    } else if (provider === 'rocket') {
      body = `Cash In Tk ${amountBDT} from 01912345678 received. TxnId: ${trxId}, Ref: ${reference}. A/C Balance: Tk 14,500.00.`;
    } else if (provider === 'upay') {
      body = `You have received Tk ${amountBDT} from 01799887766. TrxID ${trxId} and Ref ${reference}. Fee Tk 0.00. Balance Tk 18,400.00 at ${nowStr}.`;
    } else if (provider === 'cellfin') {
      body = `Payment received Tk ${amountBDT} from Cellfin A/C 01855443322. Trx ID ${trxId}. Ref: ${reference}. Available Bal Tk 25,600.00 on ${nowStr}.`;
    }

    setRawSmsBody(body);
  }, [provider, trxId, amountBDT, reference]);

  const handleGenerateRandomTrx = () => {
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    if (provider === 'bkash') setTrxId(`BK${randomHex}9X`);
    else if (provider === 'nagad') setTrxId(`NG${randomHex}`);
    else if (provider === 'rocket') setTrxId(`98${Math.floor(10000000 + Math.random() * 90000000)}`);
    else if (provider === 'upay') setTrxId(`UP${randomHex}83`);
    else setTrxId(`CF${randomHex}90`);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(superAdminDevice.token);
    setCopiedToken(true);
    addToast('Token Copied', 'Super Admin device bearer token copied', 'info');
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handlePingDevice = () => {
    setIsPinging(true);
    setTimeout(() => {
      const res = pingSuperAdminDevice();
      setLastPingLatency(res.latencyMs);
      setIsPinging(false);
    }, 350);
  };

  const handleAddIp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIpInput.trim()) return;
    addWhitelistedIp(newIpInput.trim());
    setNewIpInput('');
  };

  const handleApplySimulatedIp = () => {
    if (!simulatedIpInput.trim()) return;
    setActiveClientIp(simulatedIpInput.trim());
  };

  const handleTransmitSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSendingSms(true);
    setSmsResult(null);

    try {
      const res = await ingestForwardedSms(
        rawSmsBody,
        senderName,
        simSlot,
        superAdminDevice.activeClientIp
      );
      setSmsResult(res);

      if (res.matchedPayment) {
        addToast(
          'Matching Complete!',
          `Payment ${res.matchedPayment.orderId} resolved to ${res.matchedPayment.status}`,
          'success'
        );
      }
    } finally {
      setIsSendingSms(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Single Device System Notice */}
      <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--ink)]">
                Super Admin SMS Forwarder Active
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-600 font-bold">
                Single Node System
              </span>
            </div>
            <p className="text-xs text-[var(--ink-2)] mt-0.5 leading-relaxed">
              Multi-device fleet balancing is silenced. All SMS ingestion is consolidated through this dedicated Super Admin hardware node, verified via IP whitelisting.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <GateButton
            variant="secondary"
            size="sm"
            onClick={handlePingDevice}
            isLoading={isPinging}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Ping Device ({lastPingLatency ? `${lastPingLatency}ms` : 'Test'})
          </GateButton>
        </div>
      </div>

      {/* Grid: Device Hardware Profile + IP Whitelisting Firewall */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hardware & Telemetry Card (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--ink)]">{superAdminDevice.name}</h2>
                <span className="text-xs text-[var(--ink-3)] font-mono">{superAdminDevice.model}</span>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                superAdminDevice.status === 'online'
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                  : 'bg-zinc-500/10 text-zinc-600 border border-zinc-500/20'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {superAdminDevice.status.toUpperCase()}
            </span>
          </div>

          {/* Telemetry Metrics */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[var(--border)] text-xs">
            <div className="p-3 rounded-xl bg-[var(--surface-2)] space-y-1">
              <span className="text-[11px] text-[var(--ink-3)] flex items-center gap-1">
                <Battery className="w-3.5 h-3.5 text-emerald-500" /> Battery Level
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold font-mono text-[var(--ink)]">
                  {superAdminDevice.battery}%
                </span>
                <span className="text-[10px] text-[var(--success)] font-medium">AC Powered</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[var(--surface-2)] space-y-1">
              <span className="text-[11px] text-[var(--ink-3)] flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-500" /> Last Heartbeat
              </span>
              <span className="text-xs font-semibold block text-[var(--ink)] truncate">
                {new Date(superAdminDevice.lastPingAt).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* SIM Slots Binding */}
          <div className="space-y-2 pt-2 border-t border-[var(--border)]">
            <span className="text-xs font-bold text-[var(--ink)] block">
              Dual SIM Hardware Binding
            </span>
            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-[var(--surface-2)] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border)]">
                    SLOT 1
                  </span>
                  <ProviderBadge provider={superAdminDevice.sim1Provider} size="sm" />
                </div>
                <span className="font-mono font-semibold text-[var(--ink)]">
                  {superAdminDevice.sim1Msisdn}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[var(--surface-2)] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--ink-2)] border border-[var(--border)]">
                    SLOT 2
                  </span>
                  <ProviderBadge provider={superAdminDevice.sim2Provider} size="sm" />
                </div>
                <span className="font-mono font-semibold text-[var(--ink)]">
                  {superAdminDevice.sim2Msisdn}
                </span>
              </div>
            </div>
          </div>

          {/* Bearer Token */}
          <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-[var(--ink-3)]" /> Device Bearer Token
              </span>
              <button
                onClick={() => setShowToken(!showToken)}
                className="text-[11px] text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showToken ? 'Hide' : 'Reveal'}</span>
              </button>
            </div>
            <div className="flex items-center gap-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--ink-2)]">
              <span className="truncate flex-1">
                {showToken ? superAdminDevice.token : '••••••••••••••••••••••••••••••••'}
              </span>
              <button
                onClick={handleCopyToken}
                className="p-1 text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer shrink-0"
                title="Copy token"
              >
                {copiedToken ? (
                  <Check className="w-3.5 h-3.5 text-[var(--success)]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* IP Whitelisting & Firewall Controls (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[var(--ink)]">IP Whitelist Firewall</h2>
                <span className="text-xs text-[var(--ink-3)]">
                  Verify forwarder connection by strict source IP matching
                </span>
              </div>
            </div>

            {/* Toggle IP Enforcement */}
            <button
              onClick={toggleIpEnforcement}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                superAdminDevice.isIpEnforced
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-zinc-500/15 text-zinc-600 border-zinc-500/30'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  superAdminDevice.isIpEnforced ? 'bg-emerald-500' : 'bg-zinc-400'
                }`}
              />
              {superAdminDevice.isIpEnforced ? 'STRICT CHECK: ON' : 'STRICT CHECK: OFF'}
            </button>
          </div>

          {/* Connection Verification Status Box */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              connectionCheck.allowed
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {connectionCheck.allowed ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <div>
                <span className="text-xs font-bold block">
                  {connectionCheck.allowed
                    ? '200 OK — Connection Verified & Authorized'
                    : '403 Forbidden — Unauthorized Client IP'}
                </span>
                <span className="text-[11px] opacity-90 block mt-0.5">
                  {connectionCheck.reason}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)]">
                IP: {superAdminDevice.activeClientIp}
              </span>
            </div>
          </div>

          {/* Client IP Simulator & Tester */}
          <div className="p-3.5 rounded-xl bg-[var(--surface-2)] space-y-2">
            <span className="text-xs font-bold text-[var(--ink)] block">
              Simulated Client IP (Test Traffic Origin)
            </span>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={simulatedIpInput}
                onChange={(e) => setSimulatedIpInput(e.target.value)}
                placeholder="e.g. 103.114.98.12 or 185.220.101.5"
                className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
              />
              <GateButton
                variant="secondary"
                size="sm"
                onClick={handleApplySimulatedIp}
              >
                Apply Test IP
              </GateButton>
              <GateButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSimulatedIpInput('185.220.101.5');
                  setActiveClientIp('185.220.101.5');
                }}
                title="Simulate unwhitelisted rogue IP"
              >
                Set Rogue IP
              </GateButton>
            </div>
          </div>

          {/* Whitelisted IP List */}
          <div className="space-y-3 pt-2 border-t border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--ink)]">
                Whitelisted CIDR / IP Rules ({superAdminDevice.whitelistedIps.length})
              </span>
              <button
                onClick={() => addWhitelistedIp(superAdminDevice.activeClientIp)}
                className="text-xs text-[var(--accent)] hover:underline font-medium cursor-pointer"
              >
                + Whitelist Current IP
              </button>
            </div>

            {/* List */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {superAdminDevice.whitelistedIps.map((ip) => (
                <div
                  key={ip}
                  className="p-2 px-3 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--ink)] font-semibold">{ip}</span>
                    {ip === superAdminDevice.activeClientIp && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-600 font-sans font-bold">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeWhitelistedIp(ip)}
                    className="text-[var(--ink-3)] hover:text-rose-500 p-1 cursor-pointer transition-colors"
                    title={`Remove ${ip}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add IP Form */}
            <form onSubmit={handleAddIp} className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newIpInput}
                onChange={(e) => setNewIpInput(e.target.value)}
                placeholder="Add IP or CIDR (e.g. 192.168.1.0/24)"
                className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
              />
              <GateButton
                type="submit"
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
              >
                Add IP
              </GateButton>
            </form>
          </div>
        </div>
      </div>

      {/* Integrated Super Admin SMS Forwarder Engine (Moved from merchant) */}
      <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--ink)]">
                  Super Admin SMS Transmission & Matching Engine
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-purple-500/10 text-purple-600 font-bold border border-purple-500/20">
                  Engine v4.0
                </span>
              </div>
              <p className="text-xs text-[var(--ink-2)] mt-0.5">
                Simulate physical SMS reception on this Super Admin terminal and transmission into PayGate. Verifies source IP before matching.
              </p>
            </div>
          </div>

          <GateButton
            variant="secondary"
            size="sm"
            onClick={handleGenerateRandomTrx}
            icon={<Sparkles className="w-3.5 h-3.5" />}
          >
            Randomize TrxID
          </GateButton>
        </div>

        {/* Simulator Form */}
        <form onSubmit={handleTransmitSms} className="space-y-4">
          {/* Target Payment Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--ink)] block">
                Target Customer Payment
              </label>
              <select
                value={selectedPaymentId}
                onChange={(e) => setPaymentSelect(e.target.value)}
                className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
              >
                {payments.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.orderId} — {p.provider.toUpperCase()} (Tk {(p.amountPaisa / 100).toFixed(2)}) [{p.status}]
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--ink)] block">
                Provider Service
              </label>
              <div className="grid grid-cols-5 gap-1">
                {(['bkash', 'nagad', 'rocket', 'upay', 'cellfin'] as ProviderType[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setProvider(p)}
                    className={`py-1.5 rounded-lg text-center text-xs font-semibold capitalize border transition-all cursor-pointer ${
                      provider === p
                        ? 'bg-[var(--surface-2)] border-[var(--accent)] text-[var(--ink)] ring-1 ring-[var(--accent)]/30 font-bold'
                        : 'border-[var(--border)] text-[var(--ink-3)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--ink)] block">
                Physical SIM Slot
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSimSlot(1)}
                  className={`p-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                    simSlot === 1
                      ? 'bg-[var(--surface-2)] border-[var(--accent)] text-[var(--ink)] font-bold'
                      : 'border-[var(--border)] text-[var(--ink-3)]'
                  }`}
                >
                  SIM 1 ({superAdminDevice.sim1Provider.toUpperCase()})
                </button>
                <button
                  type="button"
                  onClick={() => setSimSlot(2)}
                  className={`p-2 rounded-xl text-xs font-medium border text-center transition-all cursor-pointer ${
                    simSlot === 2
                      ? 'bg-[var(--surface-2)] border-[var(--accent)] text-[var(--ink)] font-bold'
                      : 'border-[var(--border)] text-[var(--ink-3)]'
                  }`}
                >
                  SIM 2 ({superAdminDevice.sim2Provider.toUpperCase()})
                </button>
              </div>
            </div>
          </div>

          {/* SMS Content Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--ink)] block">
                Simulated SMS Text Body
              </label>
              <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--ink-3)]">
                <span>TrxID: <strong className="text-[var(--ink)]">{trxId}</strong></span>
                <span>•</span>
                <span>Ref: <strong className="text-[var(--accent)]">{reference}</strong></span>
              </div>
            </div>
            <textarea
              rows={3}
              value={rawSmsBody}
              onChange={(e) => setRawSmsBody(e.target.value)}
              className="w-full bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-3 text-xs font-mono text-[var(--ink)] focus:outline-none focus:border-[var(--accent)] leading-relaxed"
            />
          </div>

          {/* Submit Action */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-[var(--ink-3)]">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Transmitting with Client IP: </span>
              <strong className="font-mono text-[var(--ink)]">
                {superAdminDevice.activeClientIp}
              </strong>
            </div>

            <GateButton
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSendingSms}
              icon={<Send className="w-4 h-4" />}
            >
              Transmit SMS to PayGate Engine
            </GateButton>
          </div>
        </form>

        {/* Live Simulation Feedback */}
        {smsResult && (
          <div
            className={`p-4 rounded-xl border space-y-2 animate-in fade-in duration-200 ${
              smsResult.ipBlocked
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                : smsResult.matchedPayment
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-xs">
              {smsResult.ipBlocked ? (
                <>
                  <XCircle className="w-4 h-4 text-rose-600" />
                  <span>SMS Ingestion Dropped by IP Firewall (403 Forbidden)</span>
                </>
              ) : smsResult.matchedPayment ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Reconciliation Complete: Payment Paid via {smsResult.matchedPayment.matchedBy}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span>SMS Stored in Ingest Pool (Awaiting Customer Claim)</span>
                </>
              )}
            </div>

            <p className="text-xs leading-relaxed font-mono">
              {smsResult.ipBlocked
                ? smsResult.ipReason
                : smsResult.matchedPayment
                ? `Order ${smsResult.matchedPayment.orderId} • TrxID: ${smsResult.parsed.trxId} • Ledger & Webhook Dispatched`
                : `TrxID: ${smsResult.parsed.trxId} • Amount: Tk ${(smsResult.parsed.amountPaisa / 100).toFixed(2)}`}
            </p>
          </div>
        )}
      </div>

      {/* Verification & Handshake Logs */}
      <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-[var(--accent)]" />
            <h3 className="text-sm font-bold text-[var(--ink)]">
              Recent IP Verification & Handshake Trail
            </h3>
          </div>
          <span className="text-xs text-[var(--ink-3)] font-mono">
            {superAdminDevice.verificationLogs?.length || 0} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--ink-3)] font-semibold">
                <th className="pb-2.5">Timestamp</th>
                <th className="pb-2.5">Action</th>
                <th className="pb-2.5">Source IP</th>
                <th className="pb-2.5">Firewall Status</th>
                <th className="pb-2.5">Resolution Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {(superAdminDevice.verificationLogs || []).slice(0, 10).map((log) => (
                <tr key={log.id} className="hover:bg-[var(--surface-2)]/50 transition-colors">
                  <td className="py-2.5 font-mono text-[var(--ink-3)]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 font-semibold capitalize text-[var(--ink)]">
                    {log.action.replace('_', ' ')}
                  </td>
                  <td className="py-2.5 font-mono font-semibold text-[var(--ink)]">
                    {log.ip}
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        log.status === 'allowed'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                      }`}
                    >
                      {log.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-2.5 text-[var(--ink-2)] truncate max-w-xs">
                    {log.reason}
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
