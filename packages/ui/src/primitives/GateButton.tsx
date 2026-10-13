import React from 'react';
import { Loader2 } from 'lucide-react';

export interface GateButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const GateButton: React.FC<GateButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'relative inline-flex items-center justify-center font-medium transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer';

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
    md: 'h-10 px-4 text-sm rounded-lg gap-2', // 40px desktop baseline per Gate UI spec
    lg: 'h-12 px-6 text-base rounded-xl gap-2.5', // 48px mobile / prominent CTA
  };

  const variantStyles = {
    primary:
      'bg-[var(--ink)] text-[var(--bg)] hover:opacity-90 active:scale-[0.99] focus-visible:ring-[var(--accent)] shadow-xs',
    secondary:
      'bg-[var(--surface)] text-[var(--ink)] border border-[var(--border)] hover:bg-[var(--surface-2)] active:scale-[0.99] focus-visible:ring-[var(--accent)]',
    ghost:
      'text-[var(--ink-2)] hover:text-[var(--ink)] hover:bg-[var(--surface-2)] focus-visible:ring-[var(--accent)]',
    danger:
      'bg-[var(--danger)] text-white hover:opacity-90 active:scale-[0.99] focus-visible:ring-[var(--danger)]',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span className="opacity-90">{children}</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          {children}
        </>
      )}
    </button>
  );
};
