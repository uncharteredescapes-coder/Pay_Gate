import React, { useState } from 'react';
import { usePayGate } from '../../context/PayGateContext';
import { useRouter } from '../../router';
import { CollapsibleSidebar } from '../layout/CollapsibleSidebar';
import { TopNavbar } from '../layout/TopNavbar';
import { SuperAdminDeviceTab } from './SuperAdminDeviceTab';
import { FleetTab } from './FleetTab';
import { WalletPoolTab } from './WalletPoolTab';
import { ReviewQueueTab } from './ReviewQueueTab';
import { PayoutApprovalsTab } from './PayoutApprovalsTab';
import { AuditLogTab } from './AuditLogTab';
import { CommandPalette } from '../gate-ui/CommandPalette';
import { MobileBottomNav } from '../layout/MobileBottomNav';
import { OfflineIndicator } from '../pwa/OfflineIndicator';
import { PaymentDrawer } from '../gate-ui/PaymentDrawer';
import { PayGatePopupModal } from '../pay/PayGatePopupModal';
import { GateButton } from '../gate-ui/GateButton';
import { ShieldAlert, CheckCircle2, AlertCircle, Info, X, Lock } from 'lucide-react';

export const AdminDashboardLayout: React.FC = () => {
  const { navigate, currentPath } = useRouter();
  const {
    activeAdminTab,
    setActiveAdminTab,
    currentUserRole,
    setCurrentUserRole,
    selectedPaymentId,
    setSelectedPaymentId,
    toasts,
    removeToast,
  } = usePayGate();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Sync pathname with admin tab
  React.useEffect(() => {
    if (currentPath === '/wallets' || currentPath === '/admin/wallets') setActiveAdminTab('wallets');
    else if (currentPath === '/review' || currentPath === '/admin/review') setActiveAdminTab('review');
    else if (currentPath === '/payouts' || currentPath === '/admin/payouts') setActiveAdminTab('payouts');
    else if (currentPath === '/audit' || currentPath === '/admin/audit') setActiveAdminTab('audit');
    else if (currentPath === '/fleet' || currentPath === '/admin/fleet') setActiveAdminTab('fleet');
    else if (currentPath === '/device' || currentPath === '/admin/device' || currentPath === '/' || currentPath === '/admin') setActiveAdminTab('device');
  }, [currentPath, setActiveAdminTab]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-row font-sans transition-colors">
      {/* Collapsible Sidebar */}
      <CollapsibleSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Bar Nav */}
        <TopNavbar
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        {/* Role Guard Warning if not logged in as Admin */}
        {currentUserRole !== 'admin' && (
          <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-600">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[var(--ink)] block">
                  Ops Administration Access Guard
                </span>
                <span className="text-xs text-[var(--ink-2)]">
                  You are currently signed in as a Merchant. Elevate your session to Ops Admin to approve payouts and manage the SIM fleet.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <GateButton
                variant="secondary"
                size="sm"
                onClick={() => navigate('/merchant')}
              >
                Back to Merchant SaaS
              </GateButton>
              <GateButton
                variant="primary"
                size="sm"
                onClick={() => setCurrentUserRole('admin')}
                icon={<ShieldAlert className="w-3.5 h-3.5" />}
              >
                Elevate to Ops Admin
              </GateButton>
            </div>
          </div>
        )}

        {/* Dynamic Admin Tab Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6 pb-24 md:pb-8">
          {activeAdminTab === 'device' && <SuperAdminDeviceTab />}
          {activeAdminTab === 'wallets' && <WalletPoolTab />}
          {activeAdminTab === 'review' && <ReviewQueueTab />}
          {activeAdminTab === 'payouts' && <PayoutApprovalsTab />}
          {activeAdminTab === 'audit' && <AuditLogTab />}
          {activeAdminTab === 'fleet' && <FleetTab />}
        </main>

        {/* Mobile Navigation */}
        <MobileBottomNav />
      </div>

      <OfflineIndicator />

      {/* Modals & Drawers */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      <PayGatePopupModal />

      {selectedPaymentId && (
        <PaymentDrawer
          paymentId={selectedPaymentId}
          onClose={() => setSelectedPaymentId(null)}
        />
      )}

      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-3.5 bg-[var(--surface)] border rounded-xl shadow-lg pointer-events-auto flex items-start justify-between gap-3 animate-in slide-in-from-bottom duration-200 ${
              toast.type === 'success'
                ? 'border-[var(--success)]/40 text-[var(--success)]'
                : toast.type === 'error'
                ? 'border-[var(--danger)]/40 text-[var(--danger)]'
                : toast.type === 'warning'
                ? 'border-[var(--warning)]/40 text-[var(--warning)]'
                : 'border-[var(--border)] text-[var(--ink)]'
            }`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[var(--success)]" />}
              {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--danger)]" />}
              {toast.type === 'warning' && <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[var(--warning)]" />}
              {toast.type === 'info' && <Info className="w-4 h-4 shrink-0 mt-0.5 text-[var(--accent)]" />}
              <div className="min-w-0">
                <span className="text-xs font-bold block text-[var(--ink)]">{toast.title}</span>
                <span className="text-xs text-[var(--ink-2)] leading-relaxed block mt-0.5">{toast.message}</span>
              </div>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[var(--ink-3)] hover:text-[var(--ink)] p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
