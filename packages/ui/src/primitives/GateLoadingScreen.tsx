import React from 'react';
import { Loader2 } from 'lucide-react';

export interface GateLoadingScreenProps {
  message?: string;
  subtext?: string;
  fullScreen?: boolean;
}

export const GateLoadingScreen: React.FC<GateLoadingScreenProps> = ({
  message = 'Loading PayGate Platform...',
  subtext = 'Synchronizing real-time ledger and MFS fleet data',
  fullScreen = false,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 transition-colors ${
        fullScreen
          ? 'fixed inset-0 z-50 bg-[var(--bg)]/95 backdrop-blur-md'
          : 'py-20 w-full'
      }`}
    >
      <div className="relative mb-5">
        {/* Outer glowing pulse */}
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent)]/15 animate-ping absolute inset-0" />
        
        {/* Core Monogram */}
        <div className="relative w-16 h-16 rounded-2xl bg-[var(--ink)] text-[var(--bg)] flex items-center justify-center font-bold text-xl shadow-lg border border-[var(--border)]">
          PG
        </div>

        {/* Small spinning ring */}
        <div className="absolute -bottom-2 -right-2 p-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[var(--accent)] shadow-xs">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      </div>

      <h3 className="text-sm font-semibold text-[var(--ink)] tracking-tight">
        {message}
      </h3>

      <p className="text-xs text-[var(--ink-2)] mt-1 max-w-xs leading-relaxed">
        {subtext}
      </p>

      {/* Sleek indeterminate progress bar */}
      <div className="w-48 h-1 bg-[var(--surface-2)] rounded-full overflow-hidden mt-4 border border-[var(--border)]">
        <div className="h-full bg-[var(--accent)] rounded-full animate-indeterminate" />
      </div>
    </div>
  );
};
