import React from 'react';

export type GeneralStatus =
  | 'created'
  | 'paid'
  | 'awaiting_payment'
  | 'confirming'
  | 'needs_review'
  | 'expired'
  | 'cancelled'
  | 'online'
  | 'offline'
  | 'revoked'
  | 'draining'
  | 'active'
  | 'disabled'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed';

export interface StatusChipProps {
  status: GeneralStatus;
  reviewReason?: string;
  size?: 'sm' | 'md';
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, reviewReason, size = 'md' }) => {
  let label = status.replace('_', ' ');
  let dotColor = 'bg-[var(--ink-3)]';
  let bgClass = 'bg-[var(--surface-2)] text-[var(--ink-2)] border-[var(--border)]';

  switch (status) {
    case 'paid':
    case 'completed':
    case 'approved':
    case 'online':
    case 'active':
      label = status === 'paid' ? 'Paid' : status === 'approved' ? 'Approved' : status === 'online' ? 'Online' : status === 'active' ? 'Active' : 'Completed';
      dotColor = 'bg-[var(--success)]';
      bgClass = 'bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20';
      break;
    case 'confirming':
      label = 'Confirming';
      dotColor = 'bg-[var(--accent)] animate-pulse';
      bgClass = 'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/20';
      break;
    case 'created':
    case 'awaiting_payment':
    case 'pending':
      label = status === 'created' ? 'Created' : status === 'awaiting_payment' ? 'Awaiting Payment' : 'Pending Approval';
      dotColor = 'bg-[var(--warning)]';
      bgClass = 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/25';
      break;
    case 'needs_review':
      label = reviewReason ? `Review (${reviewReason.replace('_', ' ')})` : 'Needs Review';
      dotColor = 'bg-[var(--warning)]';
      bgClass = 'bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/30 font-medium';
      break;
    case 'draining':
      label = 'Draining (>80%)';
      dotColor = 'bg-[var(--warning)]';
      bgClass = 'bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20';
      break;
    case 'expired':
      label = 'Expired';
      dotColor = 'bg-[var(--ink-3)]';
      bgClass = 'bg-[var(--surface-2)] text-[var(--ink-3)] border-[var(--border)]';
      break;
    case 'cancelled':
    case 'rejected':
    case 'offline':
    case 'revoked':
      label = status === 'offline' ? 'Offline' : status === 'revoked' ? 'Revoked' : status === 'rejected' ? 'Rejected' : 'Cancelled';
      dotColor = 'bg-[var(--danger)]';
      bgClass = 'bg-[var(--danger)]/10 text-[var(--danger)] border-[var(--danger)]/20';
      break;
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${bgClass} ${sizeClass} font-medium tracking-tight whitespace-nowrap`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
      <span>{label}</span>
    </span>
  );
};
