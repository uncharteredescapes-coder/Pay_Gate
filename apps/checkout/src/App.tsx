import React from 'react';
import { HostedPayPage } from '../../../src/components/pay/HostedPayPage.tsx';
import { PayGateProvider } from '../../../src/context/PayGateContext.tsx';
import { RouterProvider, useRouter } from '../../../src/router/index.tsx';

function CheckoutRoute() {
  const { params } = useRouter();
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <HostedPayPage paymentId={params.id} />
    </div>
  );
}

export default function CheckoutApp() {
  return (
    <RouterProvider>
      <PayGateProvider>
        <CheckoutRoute />
      </PayGateProvider>
    </RouterProvider>
  );
}
