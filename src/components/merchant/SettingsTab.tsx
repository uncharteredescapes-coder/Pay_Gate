import React, { useState } from 'react';
import {
  ShieldCheck,
  Building,
  CheckCircle,
  AlertCircle,
  Lock,
  UserCheck,
  Percent,
  Sliders,
} from 'lucide-react';
import { usePayGate } from '../../context/PayGateContext';
import { GateButton } from '../gate-ui/GateButton';
import { GateInput } from '../gate-ui/GateInput';

export const SettingsTab: React.FC = () => {
  const { merchant, updateMerchantSettings, addToast } = usePayGate();

  const [companyName, setCompanyName] = useState(merchant.name);
  const [bankAccountNum, setBankAccountNum] = useState(merchant.payoutAccount.accountNumber);
  const [bankAccountName, setBankAccountName] = useState(merchant.payoutAccount.accountName);
  const [bankName, setBankName] = useState(merchant.payoutAccount.bankName || 'Eastern Bank PLC');
  const [routingNum, setRoutingNum] = useState(merchant.payoutAccount.routingNumber || '095261320');
  const [autoConfirm, setAutoConfirm] = useState(merchant.autoConfirm);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateMerchantSettings({
      name: companyName,
      payoutAccount: {
        ...merchant.payoutAccount,
        accountNumber: bankAccountNum,
        accountName: bankAccountName,
        bankName,
        routingNumber: routingNum,
      },
      autoConfirm,
    });
  };

  return (
    <div className="space-y-6">
      {/* KYB Verification Status Banner */}
      <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--ink)]">KYB Business Identity: Verified</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--success)]/10 text-[var(--success)] uppercase">
                Tier 1 Verified
              </span>
            </div>
            <p className="text-xs text-[var(--ink-2)] mt-0.5">
              Trade License #TRAD/DNCC/09281/2024 · e-TIN 891273910283 · Managing Director NID Verified
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-[var(--ink-3)] hidden sm:block">
          <span>Reviewed by PayGate Compliance Desk</span>
          <span className="block font-mono text-[11px]">Valid through Oct 2027</span>
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Business Settings */}
        <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl space-y-4">
          <h3 className="text-sm font-semibold text-[var(--ink)]">Business Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GateInput
              label="Merchant Registered Entity Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
            <GateInput
              label="Merchant Account ID"
              value={merchant.id}
              disabled
              isMono
            />
          </div>
        </div>

        {/* Settlement Account */}
        <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--ink)]">Registered Payout Account</h3>
            <p className="text-xs text-[var(--ink-2)] mt-0.5">
              Settlements exceeding the Tk 1,000 threshold are disbursed to this designated Bangladesh bank or MFS wallet.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <GateInput
              label="Bank / Financial Institution"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              required
            />
            <GateInput
              label="Account Holder Name"
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
              required
            />
            <GateInput
              label="Account Number / IBAN"
              value={bankAccountNum}
              onChange={(e) => setBankAccountNum(e.target.value)}
              isMono
              required
            />
            <GateInput
              label="Routing Number"
              value={routingNum}
              onChange={(e) => setRoutingNum(e.target.value)}
              isMono
              required
            />
          </div>
        </div>

        {/* Gateway Automation & Auto-Confirm Feature */}
        <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-[var(--ink)]">Matching Engine Automation</h3>
            <p className="text-xs text-[var(--ink-2)] mt-0.5">
              Control how customer claims and forwarded SMS evidence are resolved.
            </p>
          </div>

          <div className="p-4 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[var(--ink)]">Auto-Confirm Mode</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface)] text-[var(--ink-3)] border border-[var(--border)]">
                  Optional
                </span>
              </div>
              <p className="text-xs text-[var(--ink-2)] mt-1 leading-relaxed">
                If an incoming SMS carries a reference that matches a pending payment and the amount agrees,
                PayGate automatically marks it paid without waiting for the customer to press "Confirm".
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={autoConfirm}
                onChange={(e) => setAutoConfirm(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]" />
            </label>
          </div>

          {/* Fee & Security Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] flex items-center justify-between text-xs">
              <div>
                <span className="text-[var(--ink-3)] block">Platform Fee Rate</span>
                <span className="font-semibold text-[var(--ink)]">5.00% ({merchant.feeRateBps} bps)</span>
              </div>
              <Percent className="w-4 h-4 text-[var(--ink-3)]" />
            </div>

            <div className="p-3 bg-[var(--surface-2)] rounded-xl border border-[var(--border)] flex items-center justify-between text-xs">
              <div>
                <span className="text-[var(--ink-3)] block">Mandatory 2FA Security</span>
                <span className="font-semibold text-[var(--success)] flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Enforced (TOTP)
                </span>
              </div>
              <Lock className="w-4 h-4 text-[var(--ink-3)]" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <GateButton type="submit" variant="primary" size="md">
            Save Changes
          </GateButton>
        </div>
      </form>
    </div>
  );
};
