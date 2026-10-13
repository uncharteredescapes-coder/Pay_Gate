import React, { useState } from 'react';
import { Download, Share, PlusSquare, X, Smartphone, Check } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { GateButton } from '../gate-ui/GateButton';

interface PWAInstallButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIconOnlyOnMobile?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'secondary',
  size = 'sm',
  className = '',
  showIconOnlyOnMobile = false,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <GateButton
        variant={variant}
        size={size}
        onClick={install}
        className={className}
        icon={<Download className="w-3.5 h-3.5 text-[var(--accent)]" />}
      >
        <span className={showIconOnlyOnMobile ? 'hidden sm:inline' : ''}>Install App</span>
      </GateButton>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <GateButton
          variant={variant}
          size={size}
          onClick={() => setShowIOSModal(true)}
          className={className}
          icon={<Download className="w-3.5 h-3.5 text-[var(--accent)]" />}
        >
          <span className={showIconOnlyOnMobile ? 'hidden sm:inline' : ''}>Install App</span>
        </GateButton>

        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 shadow-2xl text-[var(--ink)] space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center font-bold text-xs">
                    PG
                  </div>
                  <h3 className="text-sm font-bold text-[var(--ink)]">Install PayGate on iOS</h3>
                </div>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="p-1 rounded-md text-[var(--ink-3)] hover:text-[var(--ink)] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[var(--ink-2)] leading-relaxed">
                Install PayGate Platform directly on your iPhone or iPad home screen for standalone native performance:
              </p>

              <div className="space-y-3 p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-xs text-[var(--ink)]">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center font-bold text-[10px] text-[var(--accent)] shrink-0">
                    1
                  </span>
                  <span>
                    Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline text-[var(--accent)] ml-0.5" /> in your Safari bottom navigation bar.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center font-bold text-[10px] text-[var(--accent)] shrink-0">
                    2
                  </span>
                  <span>
                    Scroll down and tap <strong>Add to Home Screen</strong> <PlusSquare className="w-3.5 h-3.5 inline text-[var(--success)] ml-0.5" />.
                  </span>
                </div>

                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center font-bold text-[10px] text-[var(--accent)] shrink-0">
                    3
                  </span>
                  <span>
                    Tap <strong>Add</strong> in the top-right corner to finish installing.
                  </span>
                </div>
              </div>

              <GateButton
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => setShowIOSModal(false)}
              >
                Got it
              </GateButton>
            </div>
          </div>
        )}
      </>
    );
  }

  // Fallback for browsers without beforeinstallprompt yet
  return (
    <GateButton
      variant={variant}
      size={size}
      onClick={() => {
        // Show lightweight instructions
        setShowIOSModal(true);
      }}
      className={className}
      icon={<Download className="w-3.5 h-3.5 text-[var(--accent)]" />}
    >
      <span className={showIconOnlyOnMobile ? 'hidden sm:inline' : ''}>Install App</span>
    </GateButton>
  );
};
