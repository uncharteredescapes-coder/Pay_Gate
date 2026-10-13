import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-[var(--warning)] px-3.5 py-2 text-xs font-semibold text-white shadow-xl animate-in slide-in-from-bottom duration-200">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Offline Mode — Cached payment ledger is active.</span>
    </div>
  );
};
