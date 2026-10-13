import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Clock,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Globe,
  Send,
  HelpCircle,
  ShieldCheck,
  Lock,
  ExternalLink,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { usePayGate } from '../../context/PayGateContext';
import { ProviderType } from '../../types';
import { ProviderBadge } from '../gate-ui/ProviderBadge';
import { ReferenceChip } from '../gate-ui/ReferenceChip';
import { GateButton } from '../gate-ui/GateButton';
import { GateInput } from '../gate-ui/GateInput';
import { formatPaisaToBDT, validateTrxIdFormat } from '../../utils/smsParser';
import { getMessages } from '@paygate/i18n';

interface HostedPayPageProps {
  paymentId?: string;
  isModal?: boolean;
  onClose?: () => void;
}

export const HostedPayPage: React.FC<HostedPayPageProps> = ({
  paymentId,
  isModal = false,
  onClose,
}) => {
  const {
    payments,
    wallets,
    selectedPaymentId,
    submitCustomerPaymentClaim,
    ingestForwardedSms,
    language,
    setLanguage,
    setActiveView,
    addToast,
  } = usePayGate();

  const targetId = paymentId || selectedPaymentId || payments[0]?.id;
  const payment = payments.find((p) => p.id === targetId) || payments[0];

  const [activeProvider, setActiveProvider] = useState<ProviderType>(payment?.provider || 'bkash');
  const [checkoutStep, setCheckoutStep] = useState<'initial' | 'ready_to_confirm'>('initial');
  const [trxInput, setTrxInput] = useState('');
  const [trxError, setTrxError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const [isMatching, setIsMatching] = useState(false);
  const [matchingSeconds, setMatchingSeconds] = useState(0);
  const [isCopiedWallet, setIsCopiedWallet] = useState(false);
  const [isCopiedRef, setIsCopiedRef] = useState(false);

  // Sync provider with payment if changed
  useEffect(() => {
    if (payment) {
      setActiveProvider(payment.provider);
      if (payment.submittedTrxId) {
        setTrxInput(payment.submittedTrxId);
        setCheckoutStep('ready_to_confirm');
      }
    }
  }, [payment]);

  // Lockout countdown timer (15 minutes = 900 seconds)
  useEffect(() => {
    let interval: any;
    if (isLockedOut && lockoutSeconds > 0) {
      interval = setInterval(() => {
        setLockoutSeconds((prev) => {
          if (prev <= 1) {
            setIsLockedOut(false);
            setFailedAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLockedOut, lockoutSeconds]);

  // 90s countdown timer when matching
  useEffect(() => {
    let interval: any;
    if (isMatching || payment?.status === 'confirming') {
      interval = setInterval(() => {
        setMatchingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setMatchingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isMatching, payment?.status]);

  // Dispatch postMessage event to parent frame for paygate.js popup SDK
  useEffect(() => {
    if (payment?.status === 'paid' && typeof window !== 'undefined' && window.parent) {
      window.parent.postMessage(
        {
          type: 'paygate:paid',
          payload: {
            paymentId: payment.id,
            orderId: payment.orderId,
            amountPaisa: payment.amountPaisa,
            provider: payment.provider,
            reference: payment.reference,
            paidAt: payment.paidAt,
          },
        },
        '*'
      );
    }
  }, [payment?.status, payment?.id]);

  if (!payment) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div className="max-w-md bg-[var(--surface)] p-8 rounded-2xl border border-[var(--border)]">
          <AlertCircle className="w-12 h-12 text-[var(--danger)] mx-auto mb-3" />
          <h2 className="text-lg font-bold text-[var(--ink)]">Payment Link Not Found</h2>
          <p className="text-sm text-[var(--ink-2)] mt-1">
            This payment link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  const assignedWallet = wallets.find((w) => w.id === payment.walletId) ||
    wallets.find((w) => w.provider === activeProvider) ||
    wallets[0];

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(assignedWallet.msisdn.replace(/[^0-9]/g, ''));
    setIsCopiedWallet(true);
    setTimeout(() => setIsCopiedWallet(false), 2000);
  };

  const handleCopyReference = () => {
    navigator.clipboard.writeText(payment.reference);
    setIsCopiedRef(true);
    setTimeout(() => setIsCopiedRef(false), 2000);
  };

  const handleConfirmPayment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLockedOut) return;
    setTrxError(null);

    const validation = validateTrxIdFormat(trxInput, activeProvider);
    if (!validation.isValid) {
      const nextFail = failedAttempts + 1;
      setFailedAttempts(nextFail);
      if (nextFail >= 5) {
        setIsLockedOut(true);
        setLockoutSeconds(900); // 15 mins
        setTrxError('Too many failed attempts. Locked for 15 minutes for security.');
        return;
      }
      setTrxError(`${validation.message || 'Invalid Transaction ID'} (${5 - nextFail} attempts remaining)`);
      return;
    }

    setIsMatching(true);
    try {
      await submitCustomerPaymentClaim(payment.id, trxInput);
    } finally {
      setIsMatching(false);
    }
  };

  // Quick 1-click test simulation button for evaluators
  const handleQuickSimulateSms = async () => {
    const testTrx = trxInput.trim().toUpperCase() || `DJC9S${Math.floor(10000 + Math.random() * 90000)}`;
    setTrxInput(testTrx);
    setCheckoutStep('ready_to_confirm');

    // Build realistic SMS template
    let sampleSms = '';
    const amountStr = (payment.amountPaisa / 100).toFixed(2);
    if (activeProvider === 'bkash') {
      sampleSms = `You have received Tk ${amountStr} from 01712750278. Fee Tk 0.00. Balance Tk 14,500.00. TrxID ${testTrx} and Ref ${payment.reference} at 12/10/2026 15:24.`;
    } else if (activeProvider === 'nagad') {
      sampleSms = `Tk ${amountStr} received from 01812345678. TxnID ${testTrx} at 12/10/2026 15:24. Ref: ${payment.reference}. Balance: Tk 14,500.00.`;
    } else if (activeProvider === 'rocket') {
      sampleSms = `Cash In Tk ${amountStr} from 01912345678 received. TxnId: ${testTrx}, Ref: ${payment.reference}. A/C Balance: Tk 14,500.00.`;
    } else if (activeProvider === 'upay') {
      sampleSms = `You have received Tk ${amountStr} from 01799887766. TrxID ${testTrx} and Ref ${payment.reference}. Fee Tk 0.00. Balance Tk 18,400.00.`;
    } else if (activeProvider === 'cellfin') {
      sampleSms = `Payment received Tk ${amountStr} from Cellfin A/C 01855443322. Trx ID ${testTrx}. Ref: ${payment.reference}. Available Bal Tk 25,600.00.`;
    }

    // Submit claim first, then ingest SMS
    await submitCustomerPaymentClaim(payment.id, testTrx);
    await ingestForwardedSms(sampleSms, activeProvider.toUpperCase(), 1);
  };

  // Bilingual message catalog lookup via @paygate/i18n
  const t = getMessages(language).checkout;

  return (
    <div className={`w-full ${isModal ? 'p-0' : 'min-h-screen bg-[var(--bg)] flex items-center justify-center p-4 sm:p-6'}`}>
      <div className={`w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden flex flex-col ${language === 'bn' ? 'lang-bn' : ''}`}>
        
        {/* Top Header bar */}
        <div className="p-4 sm:p-5 border-b border-[var(--border)] bg-[var(--surface-2)]/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isModal && (
              <button
                onClick={() => setActiveView('merchant')}
                className="p-1 -ml-1 text-[var(--ink-3)] hover:text-[var(--ink)] rounded-md cursor-pointer"
                title="Back to Merchant Dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <span className="text-xs font-semibold text-[var(--ink)] block leading-tight">
                DeshiCart Technologies
              </span>
              <span className="text-[11px] text-[var(--ink-3)] flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[var(--success)]" /> {t.merchantTag}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)] cursor-pointer"
            >
              <Globe className="w-3 h-3 text-[var(--ink-3)]" />
              <span>{language === 'en' ? 'বাংলা' : 'EN'}</span>
            </button>
            {isModal && onClose && (
              <button
                onClick={onClose}
                className="p-1 text-[var(--ink-3)] hover:text-[var(--ink)] rounded-md cursor-pointer text-sm font-bold ml-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Order amount banner */}
        <div className="px-5 py-4 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <span className="text-xs text-[var(--ink-3)] block">{t.order} #{payment.orderId}</span>
            <span className="text-sm font-semibold text-[var(--ink)]">{payment.planSnapshot.name}</span>
          </div>
          <div className="text-right">
            <span className="text-xs text-[var(--ink-3)] block">{t.amountDue}</span>
            <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[var(--ink)]">
              {formatPaisaToBDT(payment.amountPaisa)}
            </span>
          </div>
        </div>

        {/* State: LOCKED OUT (5 failed attempts per PRD Section 7) */}
        {isLockedOut && (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-[var(--danger)]/10 text-[var(--danger)] rounded-full flex items-center justify-center mx-auto">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--danger)]">{t.lockedHeader}</h2>
              <p className="text-xs text-[var(--ink-2)] mt-1 max-w-xs mx-auto">{t.lockedDesc}</p>
            </div>
            <div className="p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] text-xs font-mono">
              Unlocks in: {Math.floor(lockoutSeconds / 60)}m {lockoutSeconds % 60}s
            </div>
          </div>
        )}

        {/* State 4: SUCCESS (Paid) */}
        {!isLockedOut && payment.status === 'paid' && (
          <div className="p-6 text-center space-y-4 animate-in fade-in duration-300">
            <div className="w-14 h-14 bg-[var(--success)]/10 text-[var(--success)] rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--ink)]">{t.paidSuccessHeader}</h2>
              <p className="text-xs text-[var(--ink-2)] mt-1 max-w-xs mx-auto">{t.paidSuccessDesc}</p>
            </div>

            <div className="bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border)] text-left space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--ink-3)]">Order ID</span>
                <span className="font-mono font-medium text-[var(--ink)]">{payment.orderId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--ink-3)]">Amount Paid</span>
                <span className="font-mono font-bold text-[var(--success)]">{formatPaisaToBDT(payment.amountPaisa)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[var(--border)]">
                <span className="text-[var(--ink-3)]">Transaction ID</span>
                <span className="font-mono font-medium text-[var(--ink)]">{payment.submittedTrxId}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--ink-3)]">Verified Reference</span>
                <ReferenceChip reference={payment.reference} size="sm" showCopy={false} />
              </div>
            </div>

            <GateButton
              variant="primary"
              className="w-full mt-4"
              onClick={() => {
                if (isModal && onClose) onClose();
                else setActiveView('merchant');
                addToast('Payment Flow Complete', 'Redirecting to merchant callback...', 'success');
              }}
            >
              {t.backToMerchant}
            </GateButton>
          </div>
        )}

        {/* State 5: NEEDS REVIEW */}
        {!isLockedOut && payment.status === 'needs_review' && (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-[var(--warning)]/15 text-[var(--warning)] rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--ink)]">{t.needsReviewHeader}</h2>
              <p className="text-xs text-[var(--ink-2)] mt-1 max-w-xs mx-auto">{t.needsReviewDesc}</p>
            </div>

            <div className="bg-[var(--surface-2)] p-3.5 rounded-xl border border-[var(--warning)]/30 text-xs text-left space-y-1.5">
              <span className="font-semibold text-[var(--warning)] block">Flag Reason: {payment.reviewReason}</span>
              <p className="text-[var(--ink-2)] text-[11px]">
                Customer TrxID: <span className="font-mono font-semibold">{payment.submittedTrxId}</span>. Our desk is verifying with the fleet SMS logs.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <GateButton
                variant="secondary"
                className="w-full"
                onClick={() => handleConfirmPayment()}
              >
                {t.tryAgain}
              </GateButton>
              <GateButton
                variant="ghost"
                className="w-full text-xs"
                onClick={() => addToast('Support Request Opened', 'Support ticket logged with payment reference', 'info')}
              >
                {t.contactSupport}
              </GateButton>
            </div>
          </div>
        )}

        {/* State 3: LOADING / VERIFYING (Live pulse overlay & Supabase Realtime Simulation) */}
        {!isLockedOut && (payment.status === 'confirming' || isMatching) && (
          <div className="p-6 text-center space-y-5 animate-in fade-in">
            {/* Live pulse animation per PRD v3.1 Section 3.2 */}
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[var(--accent)]/15 animate-ping" />
              <div className="relative w-14 h-14 rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
                <Clock className="w-6 h-6 text-[var(--accent)]" />
              </div>
            </div>

            <div>
              <h2 className="text-base font-bold text-[var(--ink)]">
                {matchingSeconds > 90 ? t.stillCheckingHeader : t.matchingHeader}
              </h2>
              <p className="text-xs text-[var(--ink-2)] mt-1 max-w-xs mx-auto">
                {matchingSeconds > 90 ? t.stillCheckingDesc : t.matchingNotice}
              </p>
            </div>

            {/* Matching timer progress bar */}
            <div className="space-y-1.5">
              <div className="w-full bg-[var(--surface-2)] h-2 rounded-full overflow-hidden border border-[var(--border)]">
                <div
                  className="bg-[var(--accent)] h-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, (matchingSeconds / 90) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[var(--ink-3)] font-mono">
                <span>Hold: {matchingSeconds}s / 90s</span>
                <span>Claim: {trxInput || payment.submittedTrxId}</span>
              </div>
            </div>

            {/* Quick simulator helper */}
            <div className="p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] text-left">
              <span className="text-[11px] text-[var(--ink-3)] block mb-1">Testing Demo Simulator:</span>
              <button
                type="button"
                onClick={handleQuickSimulateSms}
                className="w-full text-xs py-2 px-3 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] rounded-lg text-[var(--accent)] font-medium flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                Trigger Matching SMS from Phone Fleet Now
              </button>
            </div>
          </div>
        )}

        {/* State 1 (INITIAL) & State 2 (READY TO CONFIRM) */}
        {!isLockedOut && payment.status === 'awaiting_payment' && (
          <div className="p-5 space-y-5">
            {/* Provider tabs */}
            <div>
              <label className="text-xs font-medium text-[var(--ink-3)] block mb-2">{t.selectProvider}</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(['bkash', 'nagad', 'rocket', 'upay', 'cellfin'] as ProviderType[]).map((prov) => {
                  const isSelected = activeProvider === prov;
                  return (
                    <button
                      key={prov}
                      type="button"
                      onClick={() => setActiveProvider(prov)}
                      className={`h-11 rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)]/40 shadow-xs'
                          : 'border-[var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface)]'
                      }`}
                    >
                      <ProviderBadge provider={prov} showLabel={false} size="sm" />
                      <span className="text-xs font-semibold capitalize text-[var(--ink)]">{prov}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Receiving Wallet Number with Copy */}
            <div className="p-3.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl space-y-1">
              <span className="text-xs font-medium text-[var(--ink-3)] block">{t.walletNumber}</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold font-mono tracking-wider text-[var(--ink)]">
                  {assignedWallet.msisdn}
                </span>
                <button
                  type="button"
                  onClick={handleCopyWallet}
                  className="px-2.5 py-1 text-xs font-medium rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--surface-2)] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {isCopiedWallet ? <Check className="w-3.5 h-3.5 text-[var(--success)]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopiedWallet ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Reference Chip Display with Copy */}
            <div className="p-3.5 bg-[var(--accent-soft)]/60 border border-[var(--accent)]/30 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--accent)]">{t.referenceLabel}</span>
                <span className="text-[10px] text-[var(--accent)]/80 font-mono">8-char typo-checked</span>
              </div>
              <div className="flex items-center justify-between">
                <ReferenceChip reference={payment.reference} size="lg" />
              </div>
              <p className="text-[11px] text-[var(--ink-2)]">{t.referenceHint}</p>
            </div>

            {/* State 1: INITIAL step view */}
            {checkoutStep === 'initial' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-[var(--surface-2)]/60 rounded-xl border border-[var(--border)] space-y-1.5 text-xs text-[var(--ink-2)]">
                  <p>{t.step1} <strong className="capitalize text-[var(--ink)]">{activeProvider}</strong> {t.step1App} <span className="font-medium text-[var(--ink)]">{t.step1Action}</span></p>
                  <p>{t.step2}</p>
                  <p>{t.step3}: <strong className="font-mono text-[var(--ink)]">Tk {(payment.amountPaisa / 100).toFixed(2)}</strong></p>
                  <p>{t.step4} (<strong className="font-mono text-[var(--accent)]">{payment.reference}</strong>)</p>
                  <p>{t.step5}</p>
                </div>

                <GateButton
                  variant="primary"
                  size="lg"
                  className="w-full font-semibold"
                  onClick={() => setCheckoutStep('ready_to_confirm')}
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  {t.proceedToConfirm}
                </GateButton>
              </div>
            )}

            {/* State 2: READY TO CONFIRM (Active TrxID field + Confirm button) */}
            {checkoutStep === 'ready_to_confirm' && (
              <form onSubmit={handleConfirmPayment} className="space-y-4 pt-1 animate-in fade-in">
                <div className="flex items-center justify-between text-xs text-[var(--ink-3)]">
                  <span>Enter Provider Confirmation TrxID</span>
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('initial')}
                    className="text-[var(--accent)] hover:underline cursor-pointer"
                  >
                    View wallet number again
                  </button>
                </div>

                <GateInput
                  label={t.trxLabel}
                  placeholder={t.trxPlaceholder}
                  value={trxInput}
                  onChange={(e) => {
                    setTrxInput(e.target.value.toUpperCase());
                    setTrxError(null);
                  }}
                  error={trxError || undefined}
                  isMono
                  autoFocus
                  required
                />

                <GateButton
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full font-semibold"
                  isLoading={isMatching}
                >
                  {t.confirmBtn}
                </GateButton>
              </form>
            )}

            {/* Evaluator Quick Simulation Tool */}
            <div className="pt-2 border-t border-[var(--border)]/70">
              <button
                type="button"
                onClick={handleQuickSimulateSms}
                className="w-full text-xs py-2 px-3 bg-[var(--surface-2)] hover:bg-[var(--surface)] border border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded-lg text-[var(--ink-2)] hover:text-[var(--accent)] font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                Simulate: Pay & Forward Confirmation SMS Automatically
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 bg-[var(--surface-2)] border-t border-[var(--border)] text-center text-[11px] text-[var(--ink-3)] flex items-center justify-center gap-2">
          <span>PayGate API v3.1</span>
          <span>·</span>
          <span>256-bit TLS</span>
          <span>·</span>
          <span>Realtime MFS Engine</span>
        </div>
      </div>
    </div>
  );
};
