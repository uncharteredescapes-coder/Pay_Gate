import React, { useState } from 'react';
import { Search, Shield, Filter, FileText, CheckCircle2 } from 'lucide-react';
import { usePayGate } from '../../context/PayGateContext';

export const AuditLogTab: React.FC = () => {
  const { auditLogs } = usePayGate();
  const [search, setSearch] = useState('');

  const filteredLogs = auditLogs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.actor.toLowerCase().includes(search.toLowerCase()) ||
      l.entityId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[var(--ink)]">Immutable Operational Audit Log</h3>
          <p className="text-xs text-[var(--ink-2)] mt-0.5">
            Every staff decision, payout approval, wallet status change, and matching event is permanently recorded with actor identity and IP address.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-[var(--ink-3)]" />
          <input
            type="text"
            placeholder="Search action, actor, or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full pl-9 pr-3 text-xs bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--ink)] placeholder:text-[var(--ink-3)] outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-2)]/60 text-[var(--ink-3)] font-medium border-b border-[var(--border)]">
              <tr>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Actor / Role</th>
                <th className="py-3 px-4">Entity</th>
                <th className="py-3 px-4">Details</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--ink)] font-mono text-[11px]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--surface-2)]/40 transition-colors">
                  <td className="py-3 px-4 font-bold text-[var(--accent)]">
                    {log.action}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-[var(--ink)]">{log.actor}</span>
                    <span className="block text-[10px] text-[var(--ink-3)] font-sans uppercase">{log.role}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[var(--ink-2)]">{log.entityType}</span>
                    <span className="block text-[10px] text-[var(--ink-3)]">{log.entityId}</span>
                  </td>
                  <td className="py-3 px-4 font-sans text-xs text-[var(--ink-2)] max-w-sm">
                    {log.details}
                  </td>
                  <td className="py-3 px-4 text-[var(--ink-3)]">
                    {log.ip}
                  </td>
                  <td className="py-3 px-4 text-right text-[var(--ink-3)]">
                    {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
