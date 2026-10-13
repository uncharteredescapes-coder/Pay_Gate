import React from 'react';
import { SearchX, Inbox, RefreshCw } from 'lucide-react';
import { GateButton } from './GateButton';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
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
      className={`py-12 px-6 flex flex-col items-center justify-center text-center max-w-md mx-auto ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-[var(--surface-2)] border border-[var(--border)] text-[var(--ink-2)] flex items-center justify-center mb-3.5 shadow-xs animate-in zoom-in-95 duration-200">
        {icon || <Inbox className="w-6 h-6 stroke-[1.5]" />}
      </div>
      <h3 className="text-sm font-bold text-[var(--ink)] tracking-tight">
        {title}
      </h3>
      <p className="text-xs text-[var(--ink-2)] mt-1.5 leading-relaxed max-w-sm">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex items-center gap-2.5 mt-5">
          {secondaryActionLabel && onSecondaryAction && (
            <GateButton
              variant="secondary"
              size="sm"
              onClick={onSecondaryAction}
            >
              {secondaryActionLabel}
            </GateButton>
          )}
          {actionLabel && onAction && (
            <GateButton
              variant="primary"
              size="sm"
              onClick={onAction}
            >
              {actionLabel}
            </GateButton>
          )}
        </div>
      )}
    </div>
  );
};
