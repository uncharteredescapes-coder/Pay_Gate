import React from 'react';
import {
  LayoutDashboard,
  CreditCard,
  Layers,
  DollarSign,
  Settings,
  Smartphone,
  Wallet,
  AlertTriangle,
  History,
  Radio,
} from 'lucide-react';
import { usePayGate } from '../../context/PayGateContext';
import { useRouter } from '../../router';

export const MobileBottomNav: React.FC = () => {
  const { currentPath } = useRouter();
  const {
    superAdminDevice,
    activeMerchantTab,
    setActiveMerchantTab,
    activeAdminTab,
    setActiveAdminTab,
    payments,
    payouts,
    devices,
    language,
  } = usePayGate();

  const isOpsAdmin = currentPath.startsWith('/admin');

  const merchantTabs = [
    {
      id: 'overview' as const,
      label: language === 'bn' ? 'ওভারভিউ' : 'Overview',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'payments' as const,
      label: language === 'bn' ? 'পেমেন্টস' : 'Payments',
      badge: payments.length > 0 ? payments.length.toString() : undefined,
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      id: 'plans' as const,
      label: language === 'bn' ? 'প্ল্যান' : 'Plans',
      icon: <Layers className="w-5 h-5" />,
    },
    {
      id: 'settlements' as const,
      label: language === 'bn' ? 'সেটেলমেন্ট' : 'Payouts',
      icon: <DollarSign className="w-5 h-5" />,
    },
    {
      id: 'settings' as const,
      label: language === 'bn' ? 'সেটিংস' : 'Settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const adminTabs = [
    {
      id: 'device' as const,
      label: language === 'bn' ? 'ডিভাইস' : 'Device',
      badge: superAdminDevice.status === 'online' ? 'live' : 'off',
      icon: <Radio className="w-5 h-5 text-emerald-500" />,
    },
    {
      id: 'wallets' as const,
      label: language === 'bn' ? 'ওয়ালেট' : 'Wallets',
      icon: <Wallet className="w-5 h-5" />,
    },
    {
      id: 'review' as const,
      label: language === 'bn' ? 'রিভিউ' : 'Review',
      badge: payments.filter((p) => p.status === 'needs_review').length || undefined,
      icon: <AlertTriangle className="w-5 h-5" />,
    },
    {
      id: 'payouts' as const,
      label: language === 'bn' ? 'পেআউট' : 'Batches',
      badge: payouts.filter((p) => p.status === 'pending').length || undefined,
      icon: <DollarSign className="w-5 h-5" />,
    },
    {
      id: 'audit' as const,
      label: language === 'bn' ? 'অডিট' : 'Audit',
      icon: <History className="w-5 h-5" />,
    },
  ];

  const tabs = isOpsAdmin ? adminTabs : merchantTabs;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--surface)]/95 backdrop-blur-md border-t border-[var(--border)] transition-colors pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 h-14 items-center">
        {tabs.map((tab) => {
          const isActive = isOpsAdmin
            ? activeAdminTab === tab.id
            : activeMerchantTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (isOpsAdmin) {
                  setActiveAdminTab(tab.id as any);
                } else {
                  setActiveMerchantTab(tab.id as any);
                }
              }}
              className={`flex flex-col items-center justify-center h-full w-full relative transition-colors cursor-pointer select-none ${
                isActive ? 'text-[var(--accent)] font-semibold' : 'text-[var(--ink-3)] hover:text-[var(--ink)]'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge && (
                  <span className="absolute -top-1.5 -right-2 px-1 min-w-[14px] h-3.5 rounded-full bg-[var(--accent)] text-white text-[9px] font-bold font-mono flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight font-medium">
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[var(--accent)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
