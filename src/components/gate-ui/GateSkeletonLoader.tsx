import React from 'react';

export const GateTableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 7,
}) => {
  return (
    <div className="w-full divide-y divide-[var(--border)] animate-pulse">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="py-3.5 px-4 flex items-center justify-between gap-4">
          <div className="h-4 bg-[var(--surface-2)] rounded w-28 shrink-0" />
          <div className="h-4 bg-[var(--surface-2)] rounded w-16 shrink-0" />
          <div className="h-4 bg-[var(--surface-2)] rounded w-20 shrink-0" />
          <div className="h-4 bg-[var(--surface-2)] rounded w-32 shrink-0 hidden sm:block" />
          <div className="h-4 bg-[var(--surface-2)] rounded w-20 shrink-0 text-right" />
          <div className="h-4 bg-[var(--surface-2)] rounded w-24 shrink-0" />
          <div className="h-4 bg-[var(--surface-2)] rounded w-16 shrink-0 text-right hidden md:block" />
        </div>
      ))}
    </div>
  );
};

export const GateStatCardSkeleton: React.FC = () => {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 flex flex-col justify-between animate-pulse space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-3 bg-[var(--surface-2)] rounded w-24" />
        <div className="w-4 h-4 bg-[var(--surface-2)] rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-8 bg-[var(--surface-2)] rounded w-36" />
        <div className="h-3 bg-[var(--surface-2)] rounded w-20" />
      </div>
    </div>
  );
};

export const GateCardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl animate-pulse space-y-3 ${className}`}
    >
      <div className="h-4 bg-[var(--surface-2)] rounded w-1/3" />
      <div className="h-3 bg-[var(--surface-2)] rounded w-2/3" />
      <div className="h-10 bg-[var(--surface-2)] rounded mt-4" />
    </div>
  );
};
