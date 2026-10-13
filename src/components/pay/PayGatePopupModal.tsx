import React from 'react';
import { HostedPayPage } from './HostedPayPage';
import { usePayGate } from '../../context/PayGateContext';

export const PayGatePopupModal: React.FC = () => {
  const { popupPayModalId, setPopupPayModalId } = usePayGate();

  if (!popupPayModalId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-in zoom-in-95 duration-200">
        <HostedPayPage
          paymentId={popupPayModalId}
          isModal
          onClose={() => setPopupPayModalId(null)}
        />
      </div>
    </div>
  );
};
