import React, { useState, useEffect } from 'react';
import { RouterProvider, useRouter } from '../../../src/router/index.tsx';
import { PayGateProvider, usePayGate } from '../../../src/context/PayGateContext.tsx';
import { CollapsibleSidebar } from '../../../src/components/layout/CollapsibleSidebar.tsx';
import { TopNavbar } from '../../../src/components/layout/TopNavbar.tsx';
import { OverviewTab } from '../../../src/components/merchant/OverviewTab.tsx';
import { PaymentsTab } from '../../../src/components/merchant/PaymentsTab.tsx';
import { PlansTab } from '../../../src/components/merchant/PlansTab.tsx';
import { SettlementsTab } from '../../../src/components/merchant/SettlementsTab.tsx';
import { DevelopersTab } from '../../../src/components/merchant/DevelopersTab.tsx';
import { SettingsTab } from '../../../src/components/merchant/SettingsTab.tsx';
import { PaymentDrawer } from '../../../src/components/gate-ui/PaymentDrawer.tsx';
import { CommandPalette } from '../../../src/components/gate-ui/CommandPalette.tsx';
import { MobileBottomNav } from '../../../src/components/layout/MobileBottomNav.tsx';
import { OfflineIndicator } from '../../../src/components/pwa/OfflineIndicator.tsx';

function MerchantAppContent() {
  const { currentPath } = useRouter();
  const {
    activeMerchantTab,
    setActiveMerchantTab,
    selectedPaymentId,
    setSelectedPaymentId,
  } = usePayGate();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    if (currentPath === '/payments') setActiveMerchantTab('payments');
    else if (currentPath === '/plans') setActiveMerchantTab('plans');
    else if (currentPath === '/settlements') setActiveMerchantTab('settlements');
    else if (currentPath === '/developers') setActiveMerchantTab('developers');
    else if (currentPath === '/settings') setActiveMerchantTab('settings');
    else setActiveMerchantTab('overview');
  }, [currentPath, setActiveMerchantTab]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)] flex flex-row font-sans transition-colors">
      <CollapsibleSidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopNavbar
          onOpenSearch={() => setIsSearchOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-6 pb-24 md:pb-8">
          {activeMerchantTab === 'overview' && <OverviewTab />}
          {activeMerchantTab === 'payments' && <PaymentsTab />}
          {activeMerchantTab === 'plans' && <PlansTab />}
          {activeMerchantTab === 'settlements' && <SettlementsTab />}
          {activeMerchantTab === 'developers' && <DevelopersTab />}
          {activeMerchantTab === 'settings' && <SettingsTab />}
        </main>
        <MobileBottomNav />
      </div>
      <OfflineIndicator />
      <CommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      {selectedPaymentId && (
        <PaymentDrawer
          paymentId={selectedPaymentId}
          onClose={() => setSelectedPaymentId(null)}
        />
      )}
    </div>
  );
}

export default function MerchantApp() {
  return (
    <RouterProvider>
      <PayGateProvider>
        <MerchantAppContent />
      </PayGateProvider>
    </RouterProvider>
  );
}
