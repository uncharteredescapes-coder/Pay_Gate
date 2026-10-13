import React, { useState, useEffect } from 'react';
import {
  Send,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Terminal,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { usePayGate } from '../../context/PayGateContext';
import { ProviderType } from '../../types';
import { ProviderBadge } from '../gate-ui/ProviderBadge';
import { GateButton } from '../gate-ui/GateButton';
import { GateInput } from '../gate-ui/GateInput';
import { formatPaisaToBDT } from '../../utils/smsParser';

export const SmsForwarderSimulator: React.FC = () => {
  const {
    payments,
    wallets,
    devices,
    ingestForwardedSms,
    setSelectedPaymentId,
    setActiveView,
    addToast,
  } = usePayGate();

  // Find a pending payment or default
  const pendingPayments = payments.filter((p) => p.status === 'awaiting_payment' || p.status === 'confirming');
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
  const [isSending, setIsSending] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  // Sync when target payment selection changes
  useEffect(() => {
    const cur = payments.find((p) => p.id === selectedPaymentId);
    if (cur) {
      setProvider(cur.provider);
      setAmountBDT((cur.amountPaisa / 100).toFixed(2));
      setReference(cur.reference);
      setSenderName(cur.provider.toUpperCase());
    }
  }, [selectedPaymentId, payments]);

  // Regenerate realistic SMS template when inputs change
  useEffect(() => {
    let body = '';
    const nowStr = new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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

  const handleSimulateForward = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setLastResult(null);

    try {
      const res = await ingestForwardedSms(rawSmsBody, senderName, simSlot);
      setLastResult(res);

      if (res.matchedPayment) {
        addToast(
          'Matching Complete!',
          `Payment ${res.matchedPayment.orderId} resolved to ${res.matchedPayment.status}`,
          'success'
        );
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[var(--ink)]">SMS Forwarder & Matching Engine Simulator</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
              Fleet Sandbox
            </span>
          </div>
          <p className="text-xs text-[var(--ink-2)] mt-0.5">
            Test the entire platform loop: simulate a phone forwarder pushing an SMS to POST /v1/sms/webhook, watch
            the parser extract tokens, and verify that the matching engine updates the payment atomically.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Ingest Inputs (7 cols) */}
        <div className="lg:col-span-7 bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-xs space-y-5">
          <form onSubmit={handleSimulateForward} className="space-y-4">
            {/* Payment Link Selection */}
            <div>
              <label className="text-xs font-medium text-[var(--ink-2)] block mb-1">
                Target Payment to Reconcile
              </label>
              <select
                value={selectedPaymentId}
                onChange={(e) => setPaymentSelect(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--ink)] outline-none"
              >
                {payments.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.orderId} — {p.planSnapshot.name} ({formatPaisaToBDT(p.amountPaisa)}) · Ref: {p.reference} [{p.status}]
                  </option>
                ))}
              </select>
            </div>

            {/* Provider and SIM Slot */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-[var(--ink-2)] block mb-1">MFS Provider</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                  {(['bkash', 'nagad', 'rocket', 'upay', 'cellfin'] as ProviderType[]).map((prov) => (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => setProvider(prov)}
                      className={`h-9 px-1 rounded-lg border text-xs font-medium capitalize flex items-center justify-center gap-1 cursor-pointer ${
                        provider === prov
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]/50 text-[var(--accent)] font-semibold'
                          : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-2)]'
                      }`}
                    >
                      <ProviderBadge provider={prov} showLabel={false} size="sm" />
                      <span className="truncate">{prov}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[var(--ink-2)] block mb-1">Handset SIM Slot</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSimSlot(1)}
                    className={`h-9 rounded-lg border text-xs font-medium cursor-pointer ${
                      simSlot === 1
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]/50 text-[var(--accent)] font-semibold'
                        : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-2)]'
                    }`}
                  >
                    SIM 1
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimSlot(2)}
                    className={`h-9 rounded-lg border text-xs font-medium cursor-pointer ${
                      simSlot === 2
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)]/50 text-[var(--accent)] font-semibold'
                        : 'border-[var(--border)] bg-[var(--surface-2)] text-[var(--ink-2)]'
                    }`}
                  >
                    SIM 2
                  </button>
                </div>
              </div>
            </div>

            {/* Amount & Reference */}
            <div className="grid grid-cols-2 gap-4">
              <GateInput
                label="Amount (BDT)"
                value={amountBDT}
                onChange={(e) => setAmountBDT(e.target.value)}
                isMono
                required
              />

              <GateInput
                label="Payment Reference"
                value={reference}
                onChange={(e) => setReference(e.target.value.toUpperCase())}
                isMono
                required
              />
            </div>

            {/* TrxID with Randomizer */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-[var(--ink-2)]">Transaction ID (TrxID)</label>
                <button
                  type="button"
                  onClick={handleGenerateRandomTrx}
                  className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" /> Randomize
                </button>
              </div>
              <GateInput
                value={trxId}
                onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                isMono
                required
              />
            </div>

            {/* Raw SMS Template Preview */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[var(--ink-2)]">
                Raw Handset Received SMS (Simulated from Tower)
              </label>
              <textarea
                rows={3}
                value={rawSmsBody}
                onChange={(e) => setRawSmsBody(e.target.value)}
                className="w-full p-3 font-mono text-xs bg-[var(--surface-2)] border border-[var(--border)] rounded-xl text-[var(--ink)] outline-none focus:border-[var(--accent)] leading-relaxed select-all"
              />
            </div>

            <GateButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full font-semibold"
              isLoading={isSending}
              icon={<Send className="w-4 h-4" />}
            >
              Push Forwarded SMS to PayGate Ingest
            </GateButton>
          </form>
        </div>

        {/* Right Info / Execution Flow (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl space-y-4 shadow-xs">
            <h4 className="text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-[var(--accent)]" /> How SMS Matching Works
            </h4>

            <div className="space-y-3 text-xs text-[var(--ink-2)]">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center font-mono font-bold text-[10px] text-[var(--ink)] shrink-0">
                  1
                </span>
                <span>
                  <strong>SMS Ingest:</strong> The forwarder handset hits <code className="font-mono text-[var(--ink)]">POST /v1/sms/webhook</code>. Dedupes by <code className="font-mono text-[var(--ink)]">client_msg_id</code>.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center font-mono font-bold text-[10px] text-[var(--ink)] shrink-0">
                  2
                </span>
                <span>
                  <strong>Parsing:</strong> Regex maps provider patterns, pulls <code className="font-mono text-[var(--ink)]">TrxID</code>, converts BDT to integer <code className="font-mono text-[var(--ink)]">paisa</code>, and normalizes the 8-char reference.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center font-mono font-bold text-[10px] text-[var(--ink)] shrink-0">
                  3
                </span>
                <span>
                  <strong>Atomic Claim:</strong> The database checks for matching claims. If TrxID, amount, wallet, and reference agree, the payment turns <strong className="text-[var(--success)]">paid</strong>.
                </span>
              </div>

              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] flex items-center justify-center font-mono font-bold text-[10px] text-[var(--ink)] shrink-0">
                  4
                </span>
                <span>
                  <strong>Ledger & Webhook:</strong> PayGate ledger records 5% fee and net balance. Signed HMAC webhook fires to merchant.
                </span>
              </div>
            </div>
          </div>

          {/* Result Card if executed */}
          {lastResult && (
            <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl space-y-3 animate-in fade-in shadow-xs">
              <span className="text-xs font-bold text-[var(--ink)] block uppercase tracking-wider">
                Simulation Execution Output
              </span>

              <div className="p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-[var(--ink-3)]">Extracted TrxID:</span>
                  <span className="font-bold text-[var(--ink)]">{lastResult.parsed?.trxId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ink-3)]">Extracted Amount:</span>
                  <span className="font-bold text-[var(--ink)]">
                    {formatPaisaToBDT(lastResult.parsed?.amountPaisa || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--ink-3)]">Normalized Ref:</span>
                  <span className="text-[var(--accent)] font-bold">{lastResult.parsed?.refNormalized || 'None'}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[var(--border)]">
                  <span className="text-[var(--ink-3)]">Matching Result:</span>
                  <span className="font-bold">
                    {lastResult.matchedPayment ? (
                      <span className="text-[var(--success)]">
                        MATCHED: {lastResult.matchedPayment.orderId} ({lastResult.matchedPayment.status})
                      </span>
                    ) : (
                      <span className="text-[var(--ink-3)]">Stored in unmatched pool</span>
                    )}
                  </span>
                </div>
              </div>

              {lastResult.matchedPayment && (
                <GateButton
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setSelectedPaymentId(lastResult.matchedPayment.id);
                    setActiveView('merchant');
                  }}
                >
                  View Updated Merchant Payment Details
                </GateButton>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
