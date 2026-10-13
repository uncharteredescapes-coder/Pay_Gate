import React, { forwardRef } from 'react';

export interface GateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
  isMono?: boolean;
}

export const GateInput = forwardRef<HTMLInputElement, GateInputProps>(
  ({ label, error, hint, leftIcon, rightElement, isMono = false, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? `input_${label.toLowerCase().replace(/\s+/g, '_')}` : undefined);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-[var(--ink-2)] flex items-center justify-between">
            <span>{label}</span>
          </label>
        )}
        <div className="relative flex items-center w-full">
          {leftIcon && (
            <div className="absolute left-3 text-[var(--ink-3)] flex items-center pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`h-11 w-full bg-[var(--surface-2)] text-[var(--ink)] border rounded-lg px-3.5 text-sm transition-all outline-none 
              ${leftIcon ? 'pl-9' : ''} 
              ${rightElement ? 'pr-12' : ''}
              ${isMono ? 'font-mono tracking-wider' : ''}
              ${
                error
                  ? 'border-[var(--danger)] focus:ring-2 focus:ring-[var(--danger)]/30'
                  : 'border-[var(--border)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20'
              }
              placeholder:text-[var(--ink-3)] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-2 flex items-center">
              {rightElement}
            </div>
          )}
        </div>
        {error && <span className="text-xs text-[var(--danger)] font-medium mt-0.5">{error}</span>}
        {!error && hint && <span className="text-xs text-[var(--ink-3)]">{hint}</span>}
      </div>
    );
  }
);

GateInput.displayName = 'GateInput';
