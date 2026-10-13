import React from 'react';
import { GateButton } from './GateButton.tsx';

export interface GateEmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const GateEmptyState: React.FC<GateEmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`py-12 px-6 text-center flex flex-col items-center justify-center max-w-md mx-auto ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--ink-2)] flex items-center justify-center mb-4 shadow-xs">
          {icon}
        </div>
      )}

      <h3 className="text-sm font-semibold text-[var(--ink)] tracking-tight">
        {title}
      </h3>

      <p className="text-xs text-[var(--ink-2)] mt-1.5 leading-relaxed max-w-sm">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-5 flex items-center gap-2.5">
          {secondaryActionLabel && onSecondaryAction && (
            <GateButton variant="secondary" size="sm" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </GateButton>
          )}

          {actionLabel && onAction && (
            <GateButton variant="primary" size="sm" onClick={onAction}>
              {actionLabel}
            </GateButton>
          )}
        </div>
      )}
    </div>
  );
};
