import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export interface ReferenceChipProps {
  reference: string;
  size?: 'sm' | 'md' | 'lg';
  showCopy?: boolean;
  className?: string;
}

export const ReferenceChip: React.FC<ReferenceChipProps> = ({
  reference,
  size = 'md',
  showCopy = true,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sizeClasses =
    size === 'lg'
      ? 'px-4 py-2 text-lg tracking-widest gap-2.5 rounded-xl font-semibold'
      : size === 'sm'
      ? 'px-2 py-0.5 text-[11px] tracking-wider gap-1 rounded font-medium'
      : 'px-2.5 py-1 text-xs tracking-wider gap-1.5 rounded-md font-medium';

  return (
    <div
      className={`inline-flex items-center bg-[var(--accent-soft)] text-[var(--accent)] font-mono border border-[var(--accent)]/30 ${sizeClasses} select-all ${className}`}
      title="Click or press copy button"
    >
      <span className="whitespace-nowrap">{reference}</span>
      {showCopy && (
        <button
          type="button"
          onClick={handleCopy}
          className="p-0.5 hover:opacity-80 active:scale-95 transition-transform text-[var(--accent)] cursor-pointer"
          aria-label="Copy payment reference"
        >
          {copied ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
};
