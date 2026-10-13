import React, { useState } from 'react';
import { Layers, Plus, Edit2, Play, ExternalLink, CheckCircle2 } from 'lucide-react';
import { usePayGate } from '../../context/PayGateContext';
import { GateButton } from '../gate-ui/GateButton';
import { GateInput } from '../gate-ui/GateInput';
import { EmptyState } from '../gate-ui/EmptyState';
import { formatPaisaToBDT } from '../../utils/smsParser';

export const PlansTab: React.FC = () => {
  const {
    plans,
    createPlan,
    updatePlanVersion,
    createPayment,
    setSelectedPaymentId,
    setActiveView,
    setPopupPayModalId,
    addToast,
  } = usePayGate();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // Create form state
  const [name, setName] = useState('');
  const [amountBDT, setAmountBDT] = useState('');
  const [externalSku, setExternalSku] = useState('');
  const [description, setDescription] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editAmountBDT, setEditAmountBDT] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amountBDT);
    if (isNaN(amt) || amt <= 0) {
      addToast('Invalid Amount', 'Please enter a valid price in BDT', 'error');
      return;
    }
    createPlan(name, amt, externalSku || `SKU-${Date.now().toString(36).toUpperCase()}`, description);
    setIsCreateModalOpen(false);
    setName('');
    setAmountBDT('');
    setExternalSku('');
    setDescription('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlanId) return;
    const amt = parseFloat(editAmountBDT);
    if (isNaN(amt) || amt <= 0) return;

    updatePlanVersion(editingPlanId, amt, editName);
    setEditingPlanId(null);
  };

  const startCheckoutTest = (planId: string, mode: 'redirect' | 'popup') => {
    const payment = createPayment(planId, 'bkash');
    setSelectedPaymentId(payment.id);
    if (mode === 'popup') {
      setPopupPayModalId(payment.id);
    } else {
      setActiveView('pay');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-[var(--ink)]">Merchant Pricing Plans</h3>
          <p className="text-xs text-[var(--ink-2)] mt-0.5">
            Plans lock transaction amounts in paisa on the server, guaranteeing customers cannot tamper with prices.
            Updating a plan increments its version while existing payments keep their immutable snapshot.
          </p>
        </div>
        <GateButton
          variant="primary"
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          Create New Plan
        </GateButton>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <div className="p-8 bg-[var(--surface)] border border-[var(--border)] rounded-2xl">
          <EmptyState
            title="No Pricing Plans Configured"
            description="Create your first server-authoritative pricing plan to start issuing checkout links and recurring invoices."
            actionLabel="Create First Plan"
            onAction={() => setIsCreateModalOpen(true)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => (
          <div
            key={plan.id}
            className="p-5 bg-[var(--surface)] border border-[var(--border)] rounded-2xl flex flex-col justify-between transition-all hover:border-[var(--accent)]/40 shadow-xs"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono text-[var(--accent)] uppercase font-semibold tracking-wider">
                    Version {plan.version} · {plan.externalSku}
                  </span>
                  <h4 className="text-base font-bold text-[var(--ink)] mt-0.5">{plan.name}</h4>
                </div>
                <button
                  onClick={() => {
                    setEditingPlanId(plan.id);
                    setEditName(plan.name);
                    setEditAmountBDT((plan.amountPaisa / 100).toString());
                  }}
                  className="p-1.5 text-[var(--ink-3)] hover:text-[var(--ink)] rounded-md hover:bg-[var(--surface-2)] cursor-pointer"
                  title="Update Plan (Increment Version)"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-2xl font-bold font-mono text-[var(--ink)]">
                  {formatPaisaToBDT(plan.amountPaisa)}
                </span>
                <span className="text-xs text-[var(--ink-3)]">/ fixed one-time</span>
              </div>

              {plan.description && (
                <p className="text-xs text-[var(--ink-2)] mt-2 leading-relaxed">
                  {plan.description}
                </p>
              )}
            </div>

            <div className="pt-5 mt-5 border-t border-[var(--border)] flex items-center justify-between">
              <span className="text-[11px] font-mono text-[var(--ink-3)]">
                ID: {plan.id}
              </span>
              <div className="flex items-center gap-2">
                <GateButton
                  variant="secondary"
                  size="sm"
                  onClick={() => startCheckoutTest(plan.id, 'popup')}
                >
                  Popup Test
                </GateButton>
                <GateButton
                  variant="primary"
                  size="sm"
                  onClick={() => startCheckoutTest(plan.id, 'redirect')}
                  icon={<Play className="w-3.5 h-3.5" />}
                >
                  Test Pay Page
                </GateButton>
              </div>
            </div>
          </div>
        ))}
      </div>
    )}

      {/* Create Plan Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[var(--ink)] mb-1">Create Pricing Plan</h3>
            <p className="text-xs text-[var(--ink-3)] mb-4">
              Server-authoritative plan with immutable amount in paisa.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <GateInput
                label="Plan Name"
                placeholder="e.g. Premium Monthly Pass"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <GateInput
                label="Amount (BDT)"
                placeholder="e.g. 1500.00"
                type="number"
                step="0.01"
                value={amountBDT}
                onChange={(e) => setAmountBDT(e.target.value)}
                isMono
                required
              />

              <GateInput
                label="External SKU (Merchant App Identifier)"
                placeholder="e.g. SKU-PREMIUM-MTH"
                value={externalSku}
                onChange={(e) => setExternalSku(e.target.value)}
                isMono
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--ink-2)]">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional billing terms or feature summary..."
                  rows={2}
                  className="w-full p-2.5 text-xs bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--ink)] placeholder:text-[var(--ink-3)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <GateButton
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </GateButton>
                <GateButton type="submit" variant="primary" className="flex-1">
                  Save Plan
                </GateButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Version Modal */}
      {editingPlanId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-[var(--ink)] mb-1">Create New Plan Version</h3>
            <p className="text-xs text-[var(--ink-3)] mb-4">
              Modifying price creates a new version. In-flight checkouts will retain the prior version's snapshot.
            </p>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <GateInput
                label="Plan Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
              />

              <GateInput
                label="New Amount (BDT)"
                type="number"
                step="0.01"
                value={editAmountBDT}
                onChange={(e) => setEditAmountBDT(e.target.value)}
                isMono
                required
              />

              <div className="flex items-center gap-2 pt-2">
                <GateButton
                  type="button"
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setEditingPlanId(null)}
                >
                  Cancel
                </GateButton>
                <GateButton type="submit" variant="primary" className="flex-1">
                  Publish Version
                </GateButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
