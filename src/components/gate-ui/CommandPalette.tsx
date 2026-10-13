import React, { useState, useEffect, useRef } from 'react';
import { Search, CreditCard, Layers, Smartphone, Wallet as WalletIcon, ShieldAlert, ArrowRight, X } from 'lucide-react';
import { usePayGate } from '../../context/PayGateContext';
import { formatPaisaToBDT } from '../../utils/smsParser';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const {
    payments,
    plans,
    wallets,
    devices,
    setSelectedPaymentId,
    setActiveView,
    setActiveMerchantTab,
    setActiveAdminTab,
  } = usePayGate();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled externally
        }
      }
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Aggregate searchable items
  const matchedPayments = payments
    .filter(
      (p) =>
        p.reference.toLowerCase().includes(q) ||
        p.orderId.toLowerCase().includes(q) ||
        (p.submittedTrxId && p.submittedTrxId.toLowerCase().includes(q)) ||
        p.planSnapshot.name.toLowerCase().includes(q)
    )
    .slice(0, 5)
    .map((p) => ({
      type: 'payment' as const,
      id: p.id,
      title: `${p.orderId} · Ref: ${p.reference}`,
      subtitle: `${p.planSnapshot.name} (${formatPaisaToBDT(p.amountPaisa)}) - ${p.status}`,
      icon: <CreditCard className="w-4 h-4 text-[var(--accent)]" />,
      action: () => {
        setSelectedPaymentId(p.id);
        setActiveView('merchant');
        setActiveMerchantTab('payments');
        onClose();
      },
    }));

  const matchedPlans = plans
    .filter((p) => p.name.toLowerCase().includes(q) || p.externalSku.toLowerCase().includes(q))
    .slice(0, 3)
    .map((p) => ({
      type: 'plan' as const,
      id: p.id,
      title: `${p.name} (v${p.version})`,
      subtitle: `${p.externalSku} · ${formatPaisaToBDT(p.amountPaisa)}`,
      icon: <Layers className="w-4 h-4 text-[var(--ink-2)]" />,
      action: () => {
        setActiveView('merchant');
        setActiveMerchantTab('plans');
        onClose();
      },
    }));

  const matchedWallets = wallets
    .filter((w) => w.msisdn.includes(q) || w.holderName.toLowerCase().includes(q) || w.provider.includes(q))
    .slice(0, 3)
    .map((w) => ({
      type: 'wallet' as const,
      id: w.id,
      title: `${w.provider.toUpperCase()} · ${w.msisdn}`,
      subtitle: `${w.holderName} (${w.status})`,
      icon: <WalletIcon className="w-4 h-4 text-[var(--warning)]" />,
      action: () => {
        setActiveView('admin');
        setActiveAdminTab('wallets');
        onClose();
      },
    }));

  const matchedDevices = devices
    .filter((d) => d.name.toLowerCase().includes(q) || d.model.toLowerCase().includes(q))
    .slice(0, 3)
    .map((d) => ({
      type: 'device' as const,
      id: d.id,
      title: d.name,
      subtitle: `${d.model} (${d.status}, ${d.battery}%)`,
      icon: <Smartphone className="w-4 h-4 text-[var(--success)]" />,
      action: () => {
        setActiveView('admin');
        setActiveAdminTab('fleet');
        onClose();
      },
    }));

  const results = [...matchedPayments, ...matchedPlans, ...matchedWallets, ...matchedDevices];

  const handleSelect = (idx: number) => {
    if (results[idx]) {
      results[idx].action();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-20 px-4">
      <div
        className="w-full max-w-xl bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search header */}
        <div className="flex items-center px-4 border-b border-[var(--border)] h-14 gap-3 bg-[var(--surface)]">
          <Search className="w-5 h-5 text-[var(--ink-3)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search payments, references, TrxID, plans, wallets, devices..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                handleSelect(selectedIndex);
              }
            }}
            className="flex-1 bg-transparent text-sm text-[var(--ink)] placeholder:text-[var(--ink-3)] outline-none font-medium"
          />
          <button
            onClick={onClose}
            className="text-[var(--ink-3)] hover:text-[var(--ink)] p-1 rounded-md cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[var(--border)]/30">
          {results.length === 0 ? (
            <div className="py-12 text-center text-sm text-[var(--ink-3)]">
              No matching records found for "{query}"
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${item.type}_${item.id}`}
                  onClick={() => handleSelect(idx)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-[var(--surface-2)] text-[var(--ink)]' : 'text-[var(--ink-2)]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-1.5 rounded-md bg-[var(--surface)] border border-[var(--border)] shrink-0">
                      {item.icon}
                    </div>
                    <div className="min-w-0 truncate">
                      <div className="text-sm font-medium text-[var(--ink)] truncate">{item.title}</div>
                      <div className="text-xs text-[var(--ink-3)] truncate">{item.subtitle}</div>
                    </div>
                  </div>
                  <ArrowRight className={`w-4 h-4 text-[var(--ink-3)] shrink-0 ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-[var(--surface-2)] border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--ink-3)]">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[10px]">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[10px]">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[10px]">Enter</kbd> to select
            </span>
          </div>
          <span>
            <kbd className="px-1.5 py-0.5 rounded bg-[var(--surface)] border border-[var(--border)] text-[10px]">ESC</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
};
