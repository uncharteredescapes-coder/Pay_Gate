import React from 'react';

export type SupportedProvider = 'bkash' | 'nagad' | 'rocket' | 'upay' | 'cellfin';

export interface ProviderBadgeProps {
  provider: SupportedProvider;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProviderBadge: React.FC<ProviderBadgeProps> = ({
  provider,
  showLabel = true,
  size = 'md',
  className = '',
}) => {
  const meta: Record<SupportedProvider, { name: string; dotColor: string }> = {
    bkash: {
      name: 'bKash',
      dotColor: '#E2136E',
    },
    nagad: {
      name: 'Nagad',
      dotColor: '#F6921E',
    },
    rocket: {
      name: 'Rocket',
      dotColor: '#8C3494',
    },
    upay: {
      name: 'Upay',
      dotColor: '#FF5B00',
    },
    cellfin: {
      name: 'Cellfin',
      dotColor: '#008A44',
    },
  };

  const current = meta[provider] || meta.bkash;
  const dotSize = size === 'sm' ? 'w-2 h-2' : size === 'lg' ? 'w-3 h-3' : 'w-2.5 h-2.5';
  const textClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base font-medium' : 'text-sm font-medium';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span
        className={`${dotSize} rounded-full shrink-0 shadow-xs`}
        style={{ backgroundColor: current.dotColor }}
        aria-hidden="true"
      />
      {showLabel && <span className={`${textClass} text-[var(--ink)] tracking-tight`}>{current.name}</span>}
    </div>
  );
};
