import React from 'react';
import {
  LayoutDashboard,
  CreditCard,
  Layers,
  DollarSign,
  Code2,
  Settings,
  PanelLeftClose,
  PanelLeft,
  ShieldCheck,
  Smartphone,
  ShieldAlert,
  Wallet,
  AlertTriangle,
  History,
  ArrowRightLeft,
  Radio,
} from 'lucide-react';
import { usePayGate } from '../../context/PayGateContext';
import { useRouter } from '../../router';

interface CollapsibleSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { currentPath, navigate, setActiveDomain } = useRouter();
  const {
    superAdminDevice,
    activeMerchantTab,
    setActiveMerchantTab,
    activeAdminTab,
    setActiveAdminTab,
    payments,
    payouts,
    devices,
    merchant,
    language,
    setCurrentUserRole,
  } = usePayGate();

  const isOpsAdmin = currentPath.startsWith('/admin');
  const totalPaymentsCount = payments.length;
  const pendingReviewCount = payments.filter((p) => p.status === 'needs_review').length;
  const pendingPayoutsCount = payouts.filter((p) => p.status === 'pending').length;

  const merchantNavItems = [
    {
      id: 'overview' as const,
      label: language === 'bn' ? 'ওভারভিউ' : 'Overview',
      icon: <LayoutDashboard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'payments' as const,
      label: language === 'bn' ? 'পেমেন্টস' : 'Payments',
      badge: totalPaymentsCount.toString(),
      icon: <CreditCard className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'plans' as const,
      label: language === 'bn' ? 'প্রাইসিং প্ল্যান' : 'Pricing Plans',
      icon: <Layers className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'settlements' as const,
      label: language === 'bn' ? 'সেটেলমেন্ট ও লেজার' : 'Settlements & Ledger',
      icon: <DollarSign className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'developers' as const,
      label: language === 'bn' ? 'ডেভেলপার ও ওয়েবহুক' : 'Developers & Webhooks',
      icon: <Code2 className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'settings' as const,
      label: language === 'bn' ? 'সেটিংস ও কেওয়াইবি' : 'Settings & KYB',
      icon: <Settings className="w-4 h-4 shrink-0" />,
    },
  ];

  const adminNavItems = [
    {
      id: 'device' as const,
      label: language === 'bn' ? 'সুপার অ্যাডমিন ডিভাইস' : 'Super Admin Device',
      badge: superAdminDevice.status === 'online' ? 'active' : 'offline',
      icon: <Radio className="w-4 h-4 shrink-0 text-emerald-500 animate-pulse" />,
    },
    {
      id: 'wallets' as const,
      label: language === 'bn' ? 'ওয়ালেট পুল' : 'Wallet Pool',
      icon: <Wallet className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'review' as const,
      label: language === 'bn' ? 'রিভিউ কিউ' : 'Review Queue',
      badge: pendingReviewCount > 0 ? pendingReviewCount.toString() : undefined,
      icon: <AlertTriangle className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'payouts' as const,
      label: language === 'bn' ? 'পেআউট ব্যাচ ও অনুমোদন' : 'Payout Batches',
      badge: pendingPayoutsCount > 0 ? pendingPayoutsCount.toString() : undefined,
      icon: <DollarSign className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'audit' as const,
      label: language === 'bn' ? 'অডিট লগ' : 'Audit Trail',
      icon: <History className="w-4 h-4 shrink-0" />,
    },
    {
      id: 'fleet' as const,
      label: language === 'bn' ? 'ফ্লিট (স্থগিত)' : 'Fleet (Silenced)',
      badge: 'paused',
      icon: <Smartphone className="w-4 h-4 shrink-0 opacity-60" />,
    },
  ];

  const sidebarContent = (
    <aside
      className={`h-full bg-[var(--surface)] border-r border-[var(--border)] flex flex-col justify-between transition-all duration-200 select-none ${
        isCollapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Top Header inside sidebar */}
      <div>
        <div className="h-14 border-b border-[var(--border)] px-3.5 flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-7 h-7 rounded-lg text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                isOpsAdmin ? 'bg-amber-600' : 'bg-[var(--ink)]'
              }`}>
                {isOpsAdmin ? 'OP' : 'PG'}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-[var(--ink)] truncate block leading-tight">
                  {isOpsAdmin ? 'PayGate Ops Command' : merchant.name}
                </span>
                <span className="text-[10px] text-[var(--success)] flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3 h-3" /> {isOpsAdmin ? 'Super Admin Mode' : 'KYB Verified'}
                </span>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className={`w-7 h-7 mx-auto rounded-lg text-white flex items-center justify-center font-bold text-xs shadow-xs ${
              isOpsAdmin ? 'bg-amber-600' : 'bg-[var(--ink)]'
            }`}>
              {isOpsAdmin ? 'OP' : 'PG'}
            </div>
          )}

          {/* Collapse Toggle Icon (hidden on mobile drawer) */}
          <button
            onClick={onToggleCollapse}
            className={`hidden md:flex p-1.5 rounded-lg text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer ${
              isCollapsed ? 'mx-auto' : ''
            }`}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Section Label */}
        {!isCollapsed && (
          <div className="px-3 pt-3 pb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-3)]">
              {isOpsAdmin ? 'Operations Core' : 'Merchant SaaS'}
            </span>
          </div>
        )}

        {/* Navigation Items List */}
        <nav className="p-2 space-y-1">
          {isOpsAdmin
            ? adminNavItems.map((item) => {
                const isActive = activeAdminTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveAdminTab(item.id);
                      if (isMobileOpen) onCloseMobile();
                    }}
                    className={`w-full flex items-center rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
                      isCollapsed ? 'justify-center h-10 px-0' : 'justify-between h-10 px-3'
                    } ${
                      isActive
                        ? 'bg-[var(--surface-2)] text-[var(--ink)] font-semibold border border-[var(--border)] shadow-xs'
                        : 'text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]/60'
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
                      <span className={isActive ? 'text-[var(--accent)]' : 'text-[var(--ink-3)] group-hover:text-[var(--ink)]'}>
                        {item.icon}
                      </span>
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-tight ${
                        isActive ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-2)] text-[var(--ink-2)] border border-[var(--border)]'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })
            : merchantNavItems.map((item) => {
                const isActive = activeMerchantTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveMerchantTab(item.id);
                      if (isMobileOpen) onCloseMobile();
                    }}
                    className={`w-full flex items-center rounded-xl text-xs font-medium transition-colors cursor-pointer group ${
                      isCollapsed ? 'justify-center h-10 px-0' : 'justify-between h-10 px-3'
                    } ${
                      isActive
                        ? 'bg-[var(--surface-2)] text-[var(--ink)] font-semibold border border-[var(--border)] shadow-xs'
                        : 'text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)]/60'
                    }`}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div className={`flex items-center gap-2.5 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
                      <span className={isActive ? 'text-[var(--accent)]' : 'text-[var(--ink-3)] group-hover:text-[var(--ink)]'}>
                        {item.icon}
                      </span>
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </div>

                    {!isCollapsed && item.badge && (
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-tight ${
                        isActive ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-2)] text-[var(--ink-2)] border border-[var(--border)]'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
        </nav>
      </div>

      {/* Bottom Footer inside Sidebar: Quick Portal Navigation Jump */}
      <div className="p-3 border-t border-[var(--border)] space-y-2">
        {!isCollapsed && (
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ink-3)] block px-1">
              Cross-Portal Switch
            </span>

            {isOpsAdmin ? (
              <button
                onClick={() => {
                  setCurrentUserRole('merchant');
                  setActiveDomain('merchant', '/');
                  if (isMobileOpen) onCloseMobile();
                }}
                className="w-full h-8 px-2.5 text-xs text-left rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <LayoutDashboard className="w-3.5 h-3.5 text-[var(--accent)]" />
                  <span className="truncate font-medium">merchant.example.com</span>
                </div>
                <ArrowRightLeft className="w-3 h-3 text-[var(--ink-3)]" />
              </button>
            ) : (
              <button
                onClick={() => {
                  setCurrentUserRole('admin');
                  setActiveDomain('admin', '/');
                  if (isMobileOpen) onCloseMobile();
                }}
                className="w-full h-8 px-2.5 text-xs text-left rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span className="truncate font-medium">admin.example.com</span>
                </div>
                <ArrowRightLeft className="w-3 h-3 text-[var(--ink-3)]" />
              </button>
            )}

            <button
              onClick={() => {
                setActiveDomain('api', '/');
                if (isMobileOpen) onCloseMobile();
              }}
              className="w-full h-8 px-2.5 text-xs text-left rounded-lg bg-[var(--surface-2)] hover:bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)] flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Code2 className="w-3.5 h-3.5 text-emerald-500" />
                <span className="truncate font-medium">api.example.com</span>
              </div>
              <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-[var(--surface)] text-[var(--ink-3)] border border-[var(--border)]">
                REST
              </span>
            </button>
          </div>
        )}

        {!isCollapsed ? (
          <div className="p-2 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-[11px] flex items-center justify-between">
            <span className="text-[var(--ink-3)]">Gateway Version</span>
            <span className="font-mono font-bold text-[var(--accent)]">PayGate v4.0</span>
          </div>
        ) : (
          <div className="flex justify-center text-[10px] font-mono text-[var(--ink-3)]" title="PayGate v4.0">
            v4
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/50 backdrop-blur-xs flex">
          <div className="w-64 max-w-[80vw] h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
          <div className="flex-1" onClick={onCloseMobile} />
        </div>
      )}
    </>
  );
};
