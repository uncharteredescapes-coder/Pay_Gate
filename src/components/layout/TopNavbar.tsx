import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Globe,
  Sun,
  Moon,
  ChevronDown,
  Settings,
  CreditCard,
  KeyRound,
  LogOut,
  ShieldCheck,
  Menu,
  Play,
  Layers,
  Smartphone,
  LayoutDashboard,
  ShieldAlert,
  ArrowRightLeft,
  Code2,
} from 'lucide-react';
import { useRouter } from '../../router';
import { usePayGate } from '../../context/PayGateContext';
import { GateButton } from '../gate-ui/GateButton';
import { PWAInstallButton } from '../pwa/PWAInstallButton';

interface TopNavbarProps {
  onOpenSearch: () => void;
  onToggleMobileSidebar: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onOpenSearch,
  onToggleMobileSidebar,
}) => {
  const { currentPath, navigate, activeDomain, setActiveDomain } = useRouter();
  const {
    merchant,
    theme,
    setTheme,
    language,
    setLanguage,
    currentUserRole,
    setCurrentUserRole,
    setActiveMerchantTab,
    createPayment,
    setPopupPayModalId,
    addToast,
  } = usePayGate();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Determine current portal from activeDomain & URL
  const isOpsAdmin = activeDomain === 'admin' || currentPath.startsWith('/admin');
  const isApi = activeDomain === 'api' || currentPath.startsWith('/api');
  const isMerchant = !isOpsAdmin && !isApi;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    setIsProfileOpen(false);
    addToast('Signed Out', 'You have been signed out of PayGate', 'info');
    navigate('/signin');
  };

  const handleTestCheckout = () => {
    const payment = createPayment('plan_pro_monthly', 'bkash');
    setPopupPayModalId(payment.id);
  };

  const handleRoleToggle = (newRole: 'merchant' | 'admin') => {
    setCurrentUserRole(newRole);
    if (newRole === 'admin') {
      addToast('Role Switched', 'Acting as Ops Admin (Tanvir Ahmed)', 'info');
      setActiveDomain('admin', '/');
    } else {
      addToast('Role Switched', `Acting as Merchant (${merchant.name})`, 'info');
      setActiveDomain('merchant', '/');
    }
    setIsProfileOpen(false);
  };

  return (
    <header className="h-14 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md sticky top-0 z-20 px-3 sm:px-6 flex items-center justify-between gap-3 transition-colors">
      {/* Left: Mobile hamburger + Context Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 rounded-lg text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] cursor-pointer"
          aria-label="Toggle Navigation Drawer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-xs">
          {isOpsAdmin ? (
            <>
              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> PayGate Ops
              </span>
              <span className="text-[var(--ink-3)] hidden sm:inline">/</span>
              <span className="text-[var(--ink)] font-semibold hidden sm:inline">admin.example.com</span>
            </>
          ) : isApi ? (
            <>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" /> PayGate API
              </span>
              <span className="text-[var(--ink-3)] hidden sm:inline">/</span>
              <span className="text-[var(--ink)] font-semibold hidden sm:inline">api.example.com</span>
            </>
          ) : (
            <>
              <span className="font-semibold text-[var(--ink)] hidden sm:inline truncate max-w-[150px]">
                {merchant.name}
              </span>
              <span className="text-[var(--ink-3)] hidden sm:inline">/</span>
              <span className="text-[var(--ink-2)] font-medium">merchant.example.com</span>
            </>
          )}
        </div>
      </div>

      {/* Center: Global Domain Switcher */}
      <div className="hidden md:flex items-center bg-[var(--surface-2)] p-0.5 rounded-lg border border-[var(--border)] text-xs font-medium">
        <button
          onClick={() => {
            setCurrentUserRole('merchant');
            setActiveDomain('merchant', '/');
          }}
          className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
            isMerchant
              ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs font-semibold'
              : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
          }`}
        >
          <LayoutDashboard className="w-3.5 h-3.5" />
          <span>Merchant</span>
        </button>

        <button
          onClick={() => {
            setCurrentUserRole('admin');
            setActiveDomain('admin', '/');
          }}
          className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
            isOpsAdmin
              ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs font-semibold'
              : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Ops Admin</span>
        </button>

        <button
          onClick={() => setActiveDomain('api', '/')}
          className={`px-3 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 ${
            isApi
              ? 'bg-[var(--surface)] text-[var(--ink)] shadow-xs font-semibold'
              : 'text-[var(--ink-2)] hover:text-[var(--ink)]'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>API Sandbox</span>
        </button>
      </div>

      {/* Right: Search, Utilities, and Profile */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenSearch}
          className="h-9 px-2.5 sm:px-3 bg-[var(--surface-2)] hover:bg-[var(--surface)] border border-[var(--border)] rounded-lg text-xs text-[var(--ink-3)] flex items-center gap-2 transition-colors cursor-pointer"
          title="Search (⌘K)"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden xl:inline">Search...</span>
          <kbd className="hidden sm:inline px-1 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[10px] font-mono text-[var(--ink-2)]">
            ⌘K
          </kbd>
        </button>

        {/* PWA Install Button */}
        <PWAInstallButton size="sm" showIconOnlyOnMobile />

        {/* Test Checkout CTA */}
        <GateButton
          variant="secondary"
          size="sm"
          onClick={handleTestCheckout}
          className="hidden lg:inline-flex"
          icon={<Play className="w-3 h-3 text-[var(--accent)]" />}
        >
          Test Pay
        </GateButton>

        {/* Language Switch */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
          className="h-9 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-xs font-medium text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-colors"
          title="Switch Language (English / বাংলা)"
        >
          <Globe className="w-3.5 h-3.5 text-[var(--ink-3)]" />
          <span className="font-semibold">{language === 'en' ? 'বাংলা' : 'EN'}</span>
        </button>

        {/* Theme Switch */}
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="w-9 h-9 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--ink)] flex items-center justify-center cursor-pointer transition-colors"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-[var(--warning)]" />}
        </button>

        {/* User Profile Settings Dropdown Menu */}
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 h-9 pl-1.5 pr-2 rounded-lg hover:bg-[var(--surface-2)] border border-[var(--border)] transition-colors cursor-pointer select-none"
            aria-expanded={isProfileOpen}
          >
            <div className={`w-6 h-6 rounded-md text-white flex items-center justify-center text-xs font-bold uppercase shadow-xs ${
              isOpsAdmin ? 'bg-amber-600' : 'bg-[var(--accent)]'
            }`}>
              {isOpsAdmin ? 'OP' : merchant.name.slice(0, 2)}
            </div>
            <div className="text-left hidden xl:block min-w-0 max-w-[120px]">
              <div className="text-xs font-semibold text-[var(--ink)] truncate leading-tight">
                {isOpsAdmin ? 'Ops Tanvir' : merchant.name}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--ink-3)]" />
          </button>

          {/* Dropdown Menu Modal */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              {/* Header profile info */}
              <div className="px-4 py-2.5 border-b border-[var(--border)]">
                <span className="text-xs font-bold text-[var(--ink)] block truncate">
                  {isOpsAdmin ? 'Tanvir Ahmed (Ops Checker)' : merchant.name}
                </span>
                <span className="text-[11px] font-mono text-[var(--ink-3)] block truncate">
                  {isOpsAdmin ? 'ops.checker@paygate.internal' : 'gmsinternationalbd5@gmail.com'}
                </span>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isOpsAdmin
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-[var(--success)]/10 text-[var(--success)]'
                  }`}>
                    <ShieldCheck className="w-3 h-3" /> {isOpsAdmin ? 'Ops Administrator' : 'Merchant Tier 1 KYB'}
                  </span>
                </div>
              </div>

              {/* Portal Switcher within Dropdown */}
              <div className="p-2 border-b border-[var(--border)] space-y-1">
                <span className="text-[10px] font-bold uppercase text-[var(--ink-3)] px-2 block">Switch Portal</span>
                <button
                  onClick={() => handleRoleToggle('merchant')}
                  className={`w-full px-3 py-1.5 text-left rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isMerchant ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold' : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    <span>Merchant SaaS Dashboard</span>
                  </div>
                  {isMerchant && <span className="text-[10px] font-bold">Active</span>}
                </button>

                <button
                  onClick={() => handleRoleToggle('admin')}
                  className={`w-full px-3 py-1.5 text-left rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isOpsAdmin ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold' : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Ops Admin Console & Fleet</span>
                  </div>
                  {isOpsAdmin && <span className="text-[10px] font-bold">Active</span>}
                </button>

                <button
                  onClick={() => {
                    setActiveDomain('api', '/');
                    setIsProfileOpen(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                    isApi ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold' : 'text-[var(--ink-2)] hover:bg-[var(--surface-2)]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Code2 className="w-3.5 h-3.5" />
                    <span>API Sandbox & Webhooks</span>
                  </div>
                  {isApi && <span className="text-[10px] font-bold">Active</span>}
                </button>
              </div>

              {/* Menu items */}
              <div className="py-1 text-xs">
                {isMerchant ? (
                  <>
                    <button
                      onClick={() => {
                        setActiveMerchantTab('settings');
                        setIsProfileOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-[var(--ink-3)]" />
                      <span>Account Settings & KYB</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMerchantTab('settlements');
                        setIsProfileOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <CreditCard className="w-4 h-4 text-[var(--ink-3)]" />
                      <span>Payout Bank & Ledger</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveMerchantTab('developers');
                        setIsProfileOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-4 h-4 text-[var(--ink-3)]" />
                      <span>API Keys & Webhooks</span>
                    </button>
                  </>
                ) : (
                  <div className="px-4 py-1.5 text-[11px] text-[var(--ink-3)]">
                    Ops Session active: All actions are written to tamper-evident audit logs.
                  </div>
                )}
              </div>

              {/* Divider & Sign Out */}
              <div className="pt-1 border-t border-[var(--border)]">
                <button
                  onClick={handleSignOut}
                  className="w-full px-4 py-2 text-left text-[var(--danger)] hover:bg-[var(--danger)]/10 flex items-center gap-2.5 transition-colors cursor-pointer font-medium text-xs"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out of Portal</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
