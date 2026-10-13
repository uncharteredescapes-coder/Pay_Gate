import React from 'react';
import { RouterProvider } from '../../../src/router/index.tsx';
import { PayGateProvider } from '../../../src/context/PayGateContext.tsx';
import { AdminDashboardLayout } from '../../../src/components/admin/AdminDashboardLayout.tsx';

export default function AdminApp() {
  return (
    <RouterProvider>
      <PayGateProvider>
        <AdminDashboardLayout />
      </PayGateProvider>
    </RouterProvider>
  );
}
