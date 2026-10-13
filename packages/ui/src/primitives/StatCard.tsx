import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface StatCardProps {
  caption: string;
  value: string;
  delta?: {
    value: string;
    isPositive: boolean;
    period?: string;
  };
  subtext?: string;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({
  caption,
  value,
  delta,
  subtext,
  icon,
}) => {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex flex-col justify-between transition-colors">
      <div className="flex items-center justify-between text-[var(--ink-2)] text-xs font-medium mb-3">
        <span>{caption}</span>
        {icon && <span className="text-[var(--ink-3)]">{icon}</span>}
      </div>

      <div className="space-y-2">
        <div className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--ink)] font-mono tabular-nums">
          {value}
        </div>

        {(delta || subtext) && (
          <div className="flex items-center gap-2 text-xs">
            {delta && (
              <span
                className={`inline-flex items-center gap-0.5 font-medium ${
                  delta.isPositive ? 'text-[var(--success)]' : 'text-[var(--danger)]'
                }`}
              >
                {delta.isPositive ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {delta.value}
              </span>
            )}
            {delta?.period && <span className="text-[var(--ink-3)]">{delta.period}</span>}
            {!delta && subtext && <span className="text-[var(--ink-3)]">{subtext}</span>}
          </div>
        )}
      </div>
    </div>
  );
};
