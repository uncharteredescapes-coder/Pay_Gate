import React, { useState } from 'react';
import { RouterProvider, useRouter } from './router';
import { PayGateProvider, usePayGate } from './context/PayGateContext';
import { SignInPage } from './components/auth/SignInPage';
import { RegistrationPage } from './components/auth/RegistrationPage';
import { CollapsibleSidebar } from './components/layout/CollapsibleSidebar';
import { TopNavbar } from './components/layout/TopNavbar';
import { OverviewTab } from './components/merchant/OverviewTab';
import { PaymentsTab } from './components/merchant/PaymentsTab';
import { PlansTab } from './components/merchant/PlansTab';
import { SettlementsTab } from './components/merchant/SettlementsTab';
import { DevelopersTab } from './components/merchant/DevelopersTab';
import { SettingsTab } from './components/merchant/SettingsTab';
import { HostedPayPage } from './components/pay/HostedPayPage';
import { PayGatePopupModal } from './components/pay/PayGatePopupModal';
import { PaymentDrawer } from './components/gate-ui/PaymentDrawer';
import { CommandPalette } from './components/gate-ui/CommandPalette';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { OfflineIndicator } from './components/pwa/OfflineIndicator';
import { AdminDashboardLayout } from './components/admin/AdminDashboardLayout';
import { ApiSandboxLayout } from './components/api/ApiSandboxLayout';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

function MerchantDashboardLayout() {
  const { currentPath } = useRouter();
  const {
    activeMerchantTab,
    setActiveMerchantTab,
    selectedPaymentId,
    setSelectedPaymentId,
    toasts,
    removeToast,
  } = usePayGate();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Sync pathname with merchant tab
  React.useEffect(() => {
    if (currentPath === '/payments' || currentPath === '/merchant/payments') setActiveMerchantTab('payments');
    else if (currentPath === '/plans' || currentPath === '/merchant/plans') setActiveMerchantTab('plans');
    else if (currentPath === '/settlements' || currentPath === '/merchant/settlements') setActiveMerchantTab('settlements');
    else if (currentPath === '/developers' || currentPath === '/merchant/developers') setActiveMerchantTab('developers');
    else if (currentPath === '/settings' || currentPath === '/merchant/settings') setActiveMerchantTab('settings');
    else if (currentPath === '/overview' || currentPath === '/merchant/overview' || currentPath === '/' || currentPath === '/merchant') setActiveMerchantTab('overview');
  }, [currentPath, setActiveMerchantTab]);

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

        {/* Dynamic Merchant Tab Content (with bottom padding on mobile for MobileBottomNav) */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6 pb-24 md:pb-8">
          {activeMerchantTab === 'overview' && <OverviewTab />}
          {activeMerchantTab === 'payments' && <PaymentsTab />}
          {activeMerchantTab === 'plans' && <PlansTab />}
          {activeMerchantTab === 'settlements' && <SettlementsTab />}
          {activeMerchantTab === 'developers' && <DevelopersTab />}
          {activeMerchantTab === 'settings' && <SettingsTab />}
        </main>

        {/* Mobile PWA Bottom Navigation */}
        <MobileBottomNav />
      </div>

      <OfflineIndicator />

      {/* Global Modals & Utilities */}
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
}

function AppRoutes() {
  const { currentPath, params, activeDomain } = useRouter();

  // Route 1: /signin (Dual-role login selector)
  if (currentPath === '/signin') {
    return <SignInPage />;
  }

  // Route 2: /registration (Merchant KYB onboarding)
  if (currentPath === '/registration') {
    return <RegistrationPage />;
  }

  // Route 3: /pay/:id (Customer checkout page)
  if (currentPath.startsWith('/pay/')) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
        <HostedPayPage paymentId={params.id} />
      </div>
    );
  }

  // Route 4: API Backend (api.example.com or /api routes)
  if (activeDomain === 'api' || currentPath.startsWith('/api')) {
    return <ApiSandboxLayout />;
  }

  // Route 5: Ops Admin Console & Super Admin Device (admin.example.com or /admin routes)
  if (activeDomain === 'admin' || currentPath.startsWith('/admin')) {
    return <AdminDashboardLayout />;
  }

  // Route 6 / Default: Merchant SaaS Portal (merchant.example.com or /merchant or /)
  return <MerchantDashboardLayout />;
}

export default function App() {
  return (
    <RouterProvider>
      <PayGateProvider>
        <AppRoutes />
      </PayGateProvider>
    </RouterProvider>
  );
}
