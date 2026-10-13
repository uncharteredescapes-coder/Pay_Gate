import React, { useState } from 'react';
import {
  Globe,
  Shield,
  Layers,
  Code2,
  Lock,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  Server,
  CreditCard,
  Radio,
} from 'lucide-react';
import { useRouter } from '../../router';
import { usePayGate } from '../../context/PayGateContext';
import { AppDomain } from '../../types';

export const AmbientDomainSwitcher: React.FC = () => {
  const { activeDomain, setActiveDomain, domainHost, currentPath, fullSimulatedUrl } = useRouter();
  const { superAdminDevice, createPayment, setPopupPayModalId, addToast } = usePayGate();
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(fullSimulatedUrl);
    setCopied(true);
    addToast('URL Copied', `Copied ${fullSimulatedUrl} to clipboard`, 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestCheckout = () => {
    const payment = createPayment('plan_pro_monthly', 'bkash');
    setPopupPayModalId(payment.id);
  };

  const domains: {
    id: AppDomain;
    host: string;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    color: string;
  }[] = [
    {
      id: 'merchant',
      host: 'merchant.example.com',
      label: 'Merchant App',
      sublabel: 'SaaS Dashboard & Ledger',
      icon: <Layers className="w-3.5 h-3.5" />,
      color: 'border-blue-500/30 text-blue-600 dark:text-blue-400',
    },
    {
      id: 'admin',
      host: 'admin.example.com',
      label: 'Admin Portal',
      sublabel: 'Device Terminal & Operations',
      icon: <Shield className="w-3.5 h-3.5" />,
      color: 'border-amber-500/30 text-amber-600 dark:text-amber-400',
    },
    {
      id: 'api',
      host: 'api.example.com',
      label: 'API Backend',
      sublabel: 'REST Sandbox & Webhooks',
      icon: <Code2 className="w-3.5 h-3.5" />,
      color: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    },
  ];

  return (
    <div className="bg-[var(--surface-2)]/90 backdrop-blur-md border-b border-[var(--border)] text-[var(--ink)] px-3 sm:px-6 py-2 transition-colors z-40 relative">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 sm:gap-4">
        {/* Left: Domain Badges & Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 mr-1 text-[11px] font-bold uppercase tracking-wider text-[var(--ink-3)]">
            <Globe className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span className="hidden sm:inline">Connected Domains:</span>
          </div>

          {domains.map((dom) => {
            const isActive = activeDomain === dom.id;
            return (
              <button
                key={dom.id}
                onClick={() => setActiveDomain(dom.id, '/')}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-[var(--surface)] text-[var(--ink)] font-semibold shadow-xs border-[var(--border)] ring-1 ring-[var(--accent)]/30'
                    : 'bg-transparent text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface)]/60 border-transparent'
                }`}
                title={`Switch to ${dom.host}`}
              >
                <span className={isActive ? 'text-[var(--accent)]' : 'text-[var(--ink-3)]'}>
                  {dom.icon}
                </span>
                <span className="font-mono text-[11px] font-medium">{dom.host}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0" />
                )}
              </button>
            );
          })}

          {/* Direct Trigger to Customer Checkout */}
          <button
            onClick={handleTestCheckout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface)]/60 transition-all cursor-pointer border border-transparent"
            title="Launch test customer checkout session"
          >
            <CreditCard className="w-3.5 h-3.5 text-purple-500" />
            <span className="font-mono text-[11px]">pay.example.com</span>
          </button>
        </div>

        {/* Right: Active Simulated URL & Status Indicators */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
          {/* Simulated URL Pill with Copy */}
          <div className="flex items-center bg-[var(--surface)] border border-[var(--border)] rounded-lg px-2.5 py-1 text-[11px] font-mono text-[var(--ink-2)] gap-2 shadow-2xs max-w-full truncate">
            <Lock className="w-3 h-3 text-[var(--success)] shrink-0" />
            <span className="text-[var(--ink-3)] hidden lg:inline">https://</span>
            <span className="text-[var(--ink)] font-semibold truncate">{domainHost}</span>
            <span className="text-[var(--accent)] truncate">{currentPath === '/' ? '' : currentPath}</span>
            <button
              onClick={handleCopyUrl}
              className="p-1 rounded text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer shrink-0 ml-1"
              title="Copy active URL"
            >
              {copied ? (
                <Check className="w-3 h-3 text-[var(--success)]" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>

          {/* Super Admin Forwarder Device Status Mini-Pill */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium border ${
              superAdminDevice.status === 'online'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-zinc-500/10 text-zinc-600 border-zinc-500/20'
            }`}
            title={`Super Admin Forwarder: ${superAdminDevice.model} (${superAdminDevice.activeClientIp})`}
          >
            <Radio className="w-3 h-3 animate-pulse" />
            <span>Forwarder: {superAdminDevice.status.toUpperCase()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
