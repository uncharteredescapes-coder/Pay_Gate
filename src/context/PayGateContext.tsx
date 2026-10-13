import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Merchant,
  PricingPlan,
  Wallet,
  Device,
  SuperAdminDevice,
  IpVerificationAttempt,
  Payment,
  IncomingTxn,
  LedgerEntry,
  Payout,
  PayoutBatch,
  PayoutBatchStatus,
  WebhookDelivery,
  AuditLogEntry,
  ProviderType,
  ParsedSmsResult,
  MatchedByType,
  UserRole,
} from '../types';
import {
  initialMerchant,
  initialPlans,
  initialDevices,
  initialSuperAdminDevice,
  initialWallets,
  initialPayments,
  initialIncomingTxns,
  initialLedgerEntries,
  initialPayouts,
  initialPayoutBatches,
  initialWebhookDeliveries,
  initialAuditLogs,
} from '../data/seedData';
import { generateReference } from '../utils/reference';
import { parseIncomingSms } from '../utils/smsParser';
import { evaluatePaymentMatch, MatchEvaluationResult } from '../utils/matchingEngine';
import { signWebhookPayload } from '../utils/webhook';
import { apiClient } from '../api/client';

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'error' | 'info';
}

interface PayGateContextType {
  merchant: Merchant;
  superAdminDevice: SuperAdminDevice;
  plans: PricingPlan[];
  devices: Device[];
  wallets: Wallet[];
  payments: Payment[];
  incomingTxns: IncomingTxn[];
  ledgerEntries: LedgerEntry[];
  payouts: Payout[];
  payoutBatches: PayoutBatch[];
  webhookDeliveries: WebhookDelivery[];
  auditLogs: AuditLogEntry[];
  theme: 'light' | 'dark';
  language: 'en' | 'bn';
  currentUserRole: UserRole;
  activeView: 'merchant' | 'pay' | 'admin' | 'simulator';
  activeMerchantTab: 'overview' | 'payments' | 'plans' | 'settlements' | 'developers' | 'settings';
  activeAdminTab: 'device' | 'wallets' | 'review' | 'payouts' | 'audit' | 'fleet';
  selectedPaymentId: string | null;
  popupPayModalId: string | null;
  toasts: ToastItem[];

  // Setters
  setTheme: (t: 'light' | 'dark') => void;
  setLanguage: (l: 'en' | 'bn') => void;
  setCurrentUserRole: (r: UserRole) => void;
  setActiveView: (v: 'merchant' | 'pay' | 'admin' | 'simulator') => void;
  setActiveMerchantTab: (t: 'overview' | 'payments' | 'plans' | 'settlements' | 'developers' | 'settings') => void;
  setActiveAdminTab: (t: 'device' | 'wallets' | 'review' | 'payouts' | 'audit' | 'fleet') => void;
  setSelectedPaymentId: (id: string | null) => void;
  setPopupPayModalId: (id: string | null) => void;
  addToast: (title: string, message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  // Super Admin SMS Forwarder Device & IP Whitelisting
  updateSuperAdminDevice: (updates: Partial<SuperAdminDevice>) => void;
  addWhitelistedIp: (ip: string) => void;
  removeWhitelistedIp: (ip: string) => void;
  toggleIpEnforcement: () => void;
  setActiveClientIp: (ip: string) => void;
  pingSuperAdminDevice: () => { latencyMs: number; status: 'online' | 'offline'; ipAllowed: boolean };
  verifyClientIp: (ip: string) => { allowed: boolean; reason: string };

  // Domain Actions
  createPayment: (
    planId: string,
    provider: ProviderType,
    orderId?: string,
    customerPhone?: string
  ) => Payment;
  submitCustomerPaymentClaim: (
    paymentId: string,
    submittedTrxId: string
  ) => Promise<MatchEvaluationResult>;
  ingestForwardedSms: (
    rawSms: string,
    sender?: string,
    simSlot?: 1 | 2,
    clientIp?: string
  ) => Promise<{ parsed: ParsedSmsResult; matchedPayment?: Payment; ipBlocked?: boolean; ipReason?: string }>;
  resolveReviewPayment: (
    paymentId: string,
    resolution: 'force_match' | 'reject' | 'refund_record',
    note: string,
    staffName?: string
  ) => void;
  createPlan: (
    name: string,
    amountBDT: number,
    externalSku: string,
    description?: string
  ) => PricingPlan;
  updatePlanVersion: (
    planId: string,
    newAmountBDT: number,
    name: string
  ) => PricingPlan;
  requestPayout: (amountBDT: number, makerId?: string) => { success: boolean; message: string };
  approvePayout: (payoutId: string, checkerId?: string) => { success: boolean; message: string };
  rejectPayout: (payoutId: string, checkerId: string, reason: string) => void;
  createPayoutBatch: (rail?: 'beftn' | 'npsb' | 'mfs', makerActor?: string) => { success: boolean; batch?: PayoutBatch; message: string };
  verifyPayoutBatch: (batchId: string, makerActor?: string) => { success: boolean; message: string };
  approvePayoutBatch: (batchId: string, checkerActor?: string) => { success: boolean; message: string };
  exportBatchFile: (batchId: string) => { filename: string; content: string };
  resendWebhook: (deliveryId: string) => Promise<void>;
  toggleWalletDrain: (walletId: string) => void;
  deviceHeartbeat: (deviceId: string) => void;
  revokeDevice: (deviceId: string) => void;
  updateMerchantSettings: (updates: Partial<Merchant>) => void;
}

const PayGateContext = createContext<PayGateContextType | undefined>(undefined);

export const PayGateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [merchant, setMerchant] = useState<Merchant>(() => {
    const saved = localStorage.getItem('paygate_merchant');
    return saved ? JSON.parse(saved) : initialMerchant;
  });

  const [plans, setPlans] = useState<PricingPlan[]>(() => {
    const saved = localStorage.getItem('paygate_plans');
    return saved ? JSON.parse(saved) : initialPlans;
  });

  const [devices, setDevices] = useState<Device[]>(() => {
    const saved = localStorage.getItem('paygate_devices');
    return saved ? JSON.parse(saved) : initialDevices;
  });

  const [wallets, setWallets] = useState<Wallet[]>(() => {
    const saved = localStorage.getItem('paygate_wallets');
    return saved ? JSON.parse(saved) : initialWallets;
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem('paygate_payments');
    return saved ? JSON.parse(saved) : initialPayments;
  });

  const [incomingTxns, setIncomingTxns] = useState<IncomingTxn[]>(() => {
    const saved = localStorage.getItem('paygate_incoming_txns');
    return saved ? JSON.parse(saved) : initialIncomingTxns;
  });

  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>(() => {
    const saved = localStorage.getItem('paygate_ledger');
    return saved ? JSON.parse(saved) : initialLedgerEntries;
  });

  const [payouts, setPayouts] = useState<Payout[]>(() => {
    const saved = localStorage.getItem('paygate_payouts');
    return saved ? JSON.parse(saved) : initialPayouts;
  });

  const [payoutBatches, setPayoutBatches] = useState<PayoutBatch[]>(() => {
    const saved = localStorage.getItem('paygate_payout_batches');
    return saved ? JSON.parse(saved) : initialPayoutBatches;
  });

  const [webhookDeliveries, setWebhookDeliveries] = useState<WebhookDelivery[]>(() => {
    const saved = localStorage.getItem('paygate_webhooks');
    return saved ? JSON.parse(saved) : initialWebhookDeliveries;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem('paygate_audit');
    return saved ? JSON.parse(saved) : initialAuditLogs;
  });

  const [superAdminDevice, setSuperAdminDevice] = useState<SuperAdminDevice>(() => {
    const saved = localStorage.getItem('paygate_super_admin_device');
    return saved ? JSON.parse(saved) : initialSuperAdminDevice;
  });

  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<'en' | 'bn'>('en');
  const [currentUserRole, setCurrentUserRoleState] = useState<UserRole>(() => {
    const saved = localStorage.getItem('paygate_user_role');
    return (saved as UserRole) || 'merchant';
  });
  const [activeView, setActiveView] = useState<'merchant' | 'pay' | 'admin' | 'simulator'>('merchant');
  const [activeMerchantTab, setActiveMerchantTab] = useState<'overview' | 'payments' | 'plans' | 'settlements' | 'developers' | 'settings'>('overview');
  const [activeAdminTab, setActiveAdminTab] = useState<'device' | 'wallets' | 'review' | 'payouts' | 'audit' | 'fleet'>('device');
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>('pay_01ha9x202');
  const [popupPayModalId, setPopupPayModalId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    localStorage.setItem('paygate_super_admin_device', JSON.stringify(superAdminDevice));
  }, [superAdminDevice]);

  const setCurrentUserRole = (role: UserRole) => {
    setCurrentUserRoleState(role);
    localStorage.setItem('paygate_user_role', role);
  };

  useEffect(() => {
    localStorage.setItem('paygate_payout_batches', JSON.stringify(payoutBatches));
  }, [payoutBatches]);

  // Apply dark mode class to root HTML
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const setTheme = (t: 'light' | 'dark') => {
    setThemeState(t);
  };

  // Synchronize live state from server API (/v1)
  useEffect(() => {
    let isMounted = true;
    const syncWithServer = async () => {
      try {
        const [serverPayments, serverDevice] = await Promise.all([
          apiClient.getPayments().catch(() => null),
          apiClient.getDeviceStatus().catch(() => null),
        ]);

        if (isMounted) {
          if (serverPayments && serverPayments.length > 0) {
            setPayments((prev) => {
              const map = new Map<string, Payment>();
              for (const p of prev) map.set(p.id, p);
              for (const p of serverPayments) map.set(p.id, p);
              return Array.from(map.values()).sort(
                (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              );
            });
          }
          if (serverDevice) {
            setSuperAdminDevice((prev) => ({
              ...prev,
              battery: serverDevice.batteryLevel ?? prev.battery,
              status: serverDevice.status === 'online' ? 'online' : prev.status,
              lastPingAt: serverDevice.lastHeartbeat ?? prev.lastPingAt,
            }));
          }
        }
      } catch (e) {
        // Fallback to offline cache
      }
    };

    syncWithServer();
    const interval = setInterval(syncWithServer, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const addToast = (title: string, message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const logAudit = (action: string, entityType: string, entityId: string, details: string, actor = 'merchant_user', role: 'owner' | 'staff' | 'developer' | 'system' = 'staff') => {
    const entry: AuditLogEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      actor,
      role,
      action,
      entityType,
      entityId,
      details,
      ip: '103.114.98.24',
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [entry, ...prev]);
  };

  /**
   * Super Admin SMS Forwarder Device & IP Whitelisting Methods
   */
  const isIpWhitelisted = (clientIp: string, whitelistedIps: string[]): boolean => {
    const cleanClient = clientIp.trim();
    return whitelistedIps.some((rule) => {
      const cleanRule = rule.trim();
      if (cleanRule === cleanClient) return true;
      if (cleanRule === '127.0.0.1' && (cleanClient === 'localhost' || cleanClient === '::1')) return true;
      if (cleanRule.includes('/')) {
        const [base, mask] = cleanRule.split('/');
        const maskNum = parseInt(mask, 10);
        if (maskNum === 24) {
          const basePrefix = base.split('.').slice(0, 3).join('.');
          const clientPrefix = cleanClient.split('.').slice(0, 3).join('.');
          return basePrefix === clientPrefix;
        }
        if (maskNum === 16) {
          const basePrefix = base.split('.').slice(0, 2).join('.');
          const clientPrefix = cleanClient.split('.').slice(0, 2).join('.');
          return basePrefix === clientPrefix;
        }
      }
      return false;
    });
  };

  const updateSuperAdminDevice = (updates: Partial<SuperAdminDevice>) => {
    setSuperAdminDevice((prev) => ({ ...prev, ...updates }));
  };

  const addWhitelistedIp = (ip: string) => {
    const cleanIp = ip.trim();
    if (!cleanIp) return;
    if (superAdminDevice.whitelistedIps.includes(cleanIp)) {
      addToast('IP Already Whitelisted', `${cleanIp} is already in the authorized list`, 'warning');
      return;
    }
    setSuperAdminDevice((prev) => ({
      ...prev,
      whitelistedIps: [...prev.whitelistedIps, cleanIp],
    }));
    logAudit(
      'device.ip_whitelist_add',
      'device',
      superAdminDevice.id,
      `Added ${cleanIp} to forwarder firewall whitelist`,
      'admin_user',
      'owner'
    );
    addToast('IP Added', `Added ${cleanIp} to Super Admin device whitelist`, 'success');
  };

  const removeWhitelistedIp = (ip: string) => {
    setSuperAdminDevice((prev) => ({
      ...prev,
      whitelistedIps: prev.whitelistedIps.filter((item) => item !== ip),
    }));
    logAudit(
      'device.ip_whitelist_remove',
      'device',
      superAdminDevice.id,
      `Removed ${ip} from forwarder firewall whitelist`,
      'admin_user',
      'owner'
    );
    addToast('IP Removed', `Removed ${ip} from whitelist`, 'info');
  };

  const toggleIpEnforcement = () => {
    const nextState = !superAdminDevice.isIpEnforced;
    setSuperAdminDevice((prev) => ({
      ...prev,
      isIpEnforced: nextState,
    }));
    logAudit(
      'device.ip_enforcement_toggle',
      'device',
      superAdminDevice.id,
      `IP Whitelist strict enforcement set to ${nextState ? 'ENABLED' : 'DISABLED'}`,
      'admin_user',
      'owner'
    );
    addToast(
      nextState ? 'Firewall Enforcement Enabled' : 'Firewall Enforcement Disabled',
      nextState
        ? 'Strict IP checking active. Unwhitelisted devices will be rejected (403).'
        : 'Open mode: requests accepted without strict IP check.',
      nextState ? 'success' : 'warning'
    );
  };

  const setActiveClientIp = (ip: string) => {
    const cleanIp = ip.trim();
    setSuperAdminDevice((prev) => ({ ...prev, activeClientIp: cleanIp }));
    addToast('Client IP Updated', `Current simulated client IP set to ${cleanIp}`, 'info');
  };

  const pingSuperAdminDevice = () => {
    const latency = Math.floor(12 + Math.random() * 20); // 12-32ms
    const allowed = !superAdminDevice.isIpEnforced || isIpWhitelisted(superAdminDevice.activeClientIp, superAdminDevice.whitelistedIps);
    const nowIso = new Date().toISOString();

    const logEntry: IpVerificationAttempt = {
      id: `log_ping_${Date.now()}`,
      ip: superAdminDevice.activeClientIp,
      timestamp: nowIso,
      status: allowed ? 'allowed' : 'blocked',
      reason: allowed
        ? `Handshake successful (${latency}ms) - Authorized by IP whitelist`
        : `Handshake rejected - IP ${superAdminDevice.activeClientIp} not in whitelist`,
      action: 'ping',
    };

    setSuperAdminDevice((prev) => ({
      ...prev,
      lastPingAt: nowIso,
      battery: Math.max(15, Math.min(100, prev.battery + (Math.random() > 0.8 ? -1 : 0))),
      status: allowed ? 'online' : prev.status,
      verificationLogs: [logEntry, ...(prev.verificationLogs || []).slice(0, 49)],
    }));

    if (allowed) {
      addToast('Ping Handshake OK', `Latency ${latency}ms | IP ${superAdminDevice.activeClientIp} verified`, 'success');
    } else {
      addToast('Handshake Failed (403)', `Client IP ${superAdminDevice.activeClientIp} is not in whitelist`, 'error');
    }

    const returnStatus: 'online' | 'offline' = allowed ? 'online' : 'offline';
    return { latencyMs: latency, status: returnStatus, ipAllowed: allowed };
  };

  const verifyClientIp = (ip: string): { allowed: boolean; reason: string } => {
    const cleanIp = ip.trim();
    if (!superAdminDevice.isIpEnforced) {
      return { allowed: true, reason: 'IP enforcement is currently disabled (Permissive Mode)' };
    }
    const match = isIpWhitelisted(cleanIp, superAdminDevice.whitelistedIps);
    return {
      allowed: match,
      reason: match
        ? `IP ${cleanIp} matches whitelisted access rules (200 OK)`
        : `IP ${cleanIp} is NOT in the whitelisted IP list (403 Forbidden)`,
    };
  };

  /**
   * Dispatches signed webhook and records delivery log
   */
  const triggerSignedWebhook = async (
    payment: Payment,
    event: 'payment.paid' | 'payment.expired' | 'payment.needs_review' | 'payment.cancelled'
  ) => {
    const payload = {
      event_id: `evt_${Date.now()}_${payment.id.slice(-6)}`,
      event,
      timestamp: Math.floor(Date.now() / 1000),
      payment_id: payment.id,
      order_id: payment.orderId,
      reference: payment.reference,
      plan_id: payment.planId,
      amount_paisa: payment.amountPaisa,
      fee_paisa: payment.feeAmountPaisa,
      net_paisa: payment.netAmountPaisa,
      matched_by: payment.matchedBy,
      trx_id: payment.submittedTrxId,
      settlement_status: event === 'payment.paid' ? 'available' : 'cancelled',
    };

    const rawBody = JSON.stringify(payload);
    const { signatureHeader } = await signWebhookPayload(merchant.webhookSecret, rawBody);

    const delivery: WebhookDelivery = {
      id: `whd_${Date.now()}`,
      paymentId: payment.id,
      event,
      url: merchant.webhookUrl,
      status: 'success',
      attempt: 1,
      maxAttempts: 5,
      lastAttemptAt: new Date().toISOString(),
      payload,
      signature: signatureHeader,
      statusCode: 200,
      responseBody: '{"received": true, "status": "acknowledged"}',
    };

    setWebhookDeliveries((prev) => [delivery, ...prev]);
  };

  /**
   * Wallet assignment rule per PRD Section 4:
   * Choose active wallet for provider with phone heartbeat < 3 mins, limit headroom,
   * fewer pending payments than concurrency cap, least recently assigned.
   */
  const pickBestWallet = (provider: ProviderType): Wallet => {
    // 1. Filter candidates for the requested provider that are active and not drained
    const activeCandidates = wallets.filter(
      (w) =>
        w.provider === provider &&
        w.status === 'active' &&
        w.todayTotalPaisa < w.dailyLimitPaisa * 0.8 &&
        w.activePendingCount < w.concurrencyCap
    );

    if (activeCandidates.length > 0) {
      // Sort by least recently assigned
      activeCandidates.sort((a, b) => new Date(a.lastAssignedAt).getTime() - new Date(b.lastAssignedAt).getTime());
      return activeCandidates[0];
    }

    // 2. Fallback to any active wallet for this specific provider
    const anyActiveForProvider = wallets.find((w) => w.provider === provider && w.status === 'active');
    if (anyActiveForProvider) return anyActiveForProvider;

    // 3. Any wallet for this provider (even if draining)
    const anyForProvider = wallets.find((w) => w.provider === provider);
    if (anyForProvider) return anyForProvider;

    // 4. Guaranteed provider fallback using Super Admin / Merchant phone number for this provider
    const fallbackMsisdn =
      provider === 'rocket' || provider === 'upay' || provider === 'cellfin'
        ? superAdminDevice.sim2Msisdn
        : superAdminDevice.sim1Msisdn;

    return {
      id: `wal_${provider}_primary`,
      provider,
      msisdn: fallbackMsisdn,
      holderName: `${merchant.name} (${provider.toUpperCase()})`,
      simSlot: provider === 'rocket' || provider === 'upay' || provider === 'cellfin' ? 2 : 1,
      deviceId: superAdminDevice.id,
      status: 'active',
      dailyLimitPaisa: 3000000,
      monthlyLimitPaisa: 25000000,
      todayTotalPaisa: 0,
      concurrencyCap: 10,
      activePendingCount: 0,
      lastAssignedAt: new Date().toISOString(),
      currentBalancePaisa: 0,
    };
  };

  /**
   * Create Payment
   */
  const createPayment = (
    planId: string,
    provider: ProviderType,
    orderId = `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
    customerPhone?: string
  ): Payment => {
    const targetPlan = plans.find((p) => p.id === planId) || plans[0];
    const assignedWallet = pickBestWallet(provider);
    const reference = generateReference();

    // Pool of offered wallets: primary assigned + backup
    const backupWallets = wallets
      .filter((w) => w.provider === provider && w.id !== assignedWallet.id)
      .map((w) => w.id);
    const offeredWalletIds = [assignedWallet.id, ...backupWallets];

    const amountPaisa = targetPlan.amountPaisa;
    const feeAmountPaisa = Math.round((amountPaisa * merchant.feeRateBps) / 10000);
    const netAmountPaisa = amountPaisa - feeAmountPaisa;

    const newPayment: Payment = {
      id: `pay_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`,
      merchantId: merchant.id,
      planId: targetPlan.id,
      planSnapshot: {
        name: targetPlan.name,
        amountPaisa: targetPlan.amountPaisa,
      },
      orderId,
      provider,
      walletId: assignedWallet.id,
      offeredWalletIds,
      amountPaisa,
      feeAmountPaisa,
      netAmountPaisa,
      reference,
      status: 'awaiting_payment',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 mins window
      customerPhone,
      callbackUrl: `${merchant.webhookUrl}/callback`,
      successUrl: 'https://deshicart.com/checkout/success',
      cancelUrl: 'https://deshicart.com/checkout/cancel',
    };

    // Update wallet pending count and last assigned
    setWallets((prev) =>
      prev.map((w) =>
        w.id === assignedWallet.id
          ? {
              ...w,
              activePendingCount: w.activePendingCount + 1,
              lastAssignedAt: new Date().toISOString(),
            }
          : w
      )
    );

    setPayments((prev) => [newPayment, ...prev]);
    setSelectedPaymentId(newPayment.id);
    logAudit('payment.created', 'payment', newPayment.id, `Created payment for ${orderId} (${targetPlan.name}) with ref ${reference}`);
    addToast('Payment Link Ready', `Reference ${reference} issued for ${targetPlan.name}`, 'info');

    return newPayment;
  };

  /**
   * Complete payment settlement upon match
   */
  const markPaymentPaid = (
    payment: Payment,
    matchedTxn: IncomingTxn,
    matchedBy: MatchedByType
  ) => {
    const paidAt = new Date().toISOString();

    // 1. Update Payment
    const updatedPayment: Payment = {
      ...payment,
      status: 'paid',
      matchedBy,
      paidAt,
      submittedTrxId: payment.submittedTrxId || matchedTxn.trxId,
      confirmedAt: payment.confirmedAt || paidAt,
    };

    setPayments((prev) => prev.map((p) => (p.id === payment.id ? updatedPayment : p)));

    // 2. Mark Txn claimed
    setIncomingTxns((prev) =>
      prev.map((t) => (t.id === matchedTxn.id ? { ...t, claimedPaymentId: payment.id } : t))
    );

    // 3. Update Wallet totals
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id === matchedTxn.walletId) {
          const newToday = w.todayTotalPaisa + payment.amountPaisa;
          const isOver80 = newToday >= w.dailyLimitPaisa * 0.8;
          return {
            ...w,
            todayTotalPaisa: newToday,
            currentBalancePaisa: w.currentBalancePaisa + payment.amountPaisa,
            activePendingCount: Math.max(0, w.activePendingCount - 1),
            status: isOver80 ? 'draining' : w.status,
          };
        }
        return w;
      })
    );

    // 4. Update Merchant Balance and Ledger
    const oldMerchantBalance = merchant.balancePaisa;
    const grossCredit = payment.amountPaisa;
    const feeDebit = payment.feeAmountPaisa;
    const newMerchantBalance = oldMerchantBalance + payment.netAmountPaisa;

    setMerchant((prev) => ({
      ...prev,
      balancePaisa: newMerchantBalance,
    }));

    const balanceAfterPayIn = oldMerchantBalance + grossCredit;
    const balanceAfterFee = balanceAfterPayIn - feeDebit; // equals newMerchantBalance

    const ledgerPayIn: LedgerEntry = {
      id: `ledg_${Date.now()}_in`,
      merchantId: merchant.id,
      paymentId: payment.id,
      type: 'pay_in',
      debitPaisa: 0,
      creditPaisa: grossCredit,
      balancePaisaAfter: balanceAfterPayIn,
      description: `Customer pay-in for ${payment.orderId} (TrxID ${matchedTxn.trxId})`,
      createdAt: paidAt,
    };

    const ledgerFee: LedgerEntry = {
      id: `ledg_${Date.now()}_fee`,
      merchantId: merchant.id,
      paymentId: payment.id,
      type: 'fee',
      debitPaisa: feeDebit,
      creditPaisa: 0,
      balancePaisaAfter: balanceAfterFee,
      description: `PayGate 5.00% fee for ${payment.orderId}`,
      createdAt: paidAt,
    };

    setLedgerEntries((prev) => [ledgerFee, ledgerPayIn, ...prev]);

    // 5. Send signed webhook
    triggerSignedWebhook(updatedPayment, 'payment.paid');

    // 6. Audit log
    logAudit(
      'payment.matched',
      'payment',
      payment.id,
      `Payment paid via ${matchedBy}. TrxID: ${matchedTxn.trxId}, Ref: ${payment.reference}`,
      'system',
      'system'
    );

    addToast('Payment Received!', `Verified Tk ${(payment.amountPaisa / 100).toFixed(2)} for ${payment.orderId}`, 'success');
  };

  /**
   * Submit Customer Payment Claim from Hosted Pay Page
   */
  const submitCustomerPaymentClaim = async (
    paymentId: string,
    submittedTrxId: string
  ): Promise<MatchEvaluationResult> => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) {
      return { outcome: 'no_evidence', errorMessage: 'Payment record not found' };
    }

    const cleanTrx = submittedTrxId.trim().toUpperCase();

    // Check if TrxID has already been claimed by another payment
    const alreadyClaimed = incomingTxns.some(
      (t) => t.trxId.toUpperCase() === cleanTrx && t.claimedPaymentId && t.claimedPaymentId !== payment.id
    );
    if (alreadyClaimed) {
      addToast('TrxID Already Used', 'This Transaction ID was already claimed by another payment', 'error');
      return { outcome: 'already_claimed', errorMessage: 'This TrxID was already used' };
    }

    // Set state to confirming
    const confirmingPayment: Payment = {
      ...payment,
      status: 'confirming',
      submittedTrxId: cleanTrx,
      confirmedAt: new Date().toISOString(),
    };

    setPayments((prev) => prev.map((p) => (p.id === paymentId ? confirmingPayment : p)));

    // Evaluate matching engine against existing incoming transactions
    const result = evaluatePaymentMatch(confirmingPayment, incomingTxns);

    if (result.outcome === 'matched' && result.matchedTxn) {
      markPaymentPaid(confirmingPayment, result.matchedTxn, result.matchedBy || 'trxid');
    } else if (result.outcome === 'conflict') {
      const reviewPayment: Payment = {
        ...confirmingPayment,
        status: 'needs_review',
        reviewReason: result.reviewReason || 'conflict',
      };
      setPayments((prev) => prev.map((p) => (p.id === paymentId ? reviewPayment : p)));
      triggerSignedWebhook(reviewPayment, 'payment.needs_review');
      logAudit('payment.needs_review', 'payment', paymentId, `Flagged for review: ${result.reviewReason}. ${result.errorMessage}`);
      addToast('Payment Needs Review', result.errorMessage || 'Evidence inconsistency detected', 'warning');
    }

    return result;
  };

  /**
   * Ingest Forwarded SMS from Super Admin Device (or Phone Fleet)
   */
  const ingestForwardedSms = async (
    rawSms: string,
    sender = 'bKash',
    simSlot: 1 | 2 = 1,
    clientIp?: string
  ): Promise<{ parsed: ParsedSmsResult; matchedPayment?: Payment; ipBlocked?: boolean; ipReason?: string }> => {
    // 1. IP Whitelisting verification check on Super Admin Device
    const effectiveIp = clientIp || superAdminDevice.activeClientIp;
    if (superAdminDevice.isIpEnforced) {
      const isAllowed = isIpWhitelisted(effectiveIp, superAdminDevice.whitelistedIps);
      if (!isAllowed) {
        // Record blocked verification attempt
        const blockedLog: IpVerificationAttempt = {
          id: `log_blocked_${Date.now()}`,
          ip: effectiveIp,
          timestamp: new Date().toISOString(),
          status: 'blocked',
          reason: `Forwarding dropped: IP ${effectiveIp} is not in whitelist`,
          action: 'sms_forward',
        };
        setSuperAdminDevice((prev) => ({
          ...prev,
          verificationLogs: [blockedLog, ...(prev.verificationLogs || []).slice(0, 49)],
        }));
        logAudit(
          'device.firewall_blocked',
          'device',
          superAdminDevice.id,
          `SMS forward rejected: unauthorized client IP ${effectiveIp} attempted ingestion`,
          'system',
          'system'
        );
        addToast(
          'Firewall Blocked (403)',
          `Forwarder IP ${effectiveIp} is not in the whitelist! Rejecting ingestion.`,
          'error'
        );
        return {
          parsed: {
            isValid: false,
            error: `403 Forbidden: Client IP ${effectiveIp} is not in whitelisted IPs`,
            amountPaisa: 0,
            provider: 'bkash',
            trxId: '',
            rawSms,
            sender: sender || 'FORWARDER',
            simSlot,
            timestamp: new Date().toISOString(),
          },
          ipBlocked: true,
          ipReason: `Client IP ${effectiveIp} is not authorized in Super Admin device firewall`,
        };
      }
    }

    // 2. Parse SMS text
    const parsed = parseIncomingSms(rawSms, sender, simSlot);

    if (!parsed.isValid) {
      addToast('SMS Parsing Failed', parsed.error || 'Could not parse amount or TrxID', 'error');
      return { parsed };
    }

    // Record allowed verification attempt in device log
    const allowedLog: IpVerificationAttempt = {
      id: `log_allowed_${Date.now()}`,
      ip: effectiveIp,
      timestamp: new Date().toISOString(),
      status: 'allowed',
      reason: `SMS accepted from verified IP: ${effectiveIp} (${parsed.provider.toUpperCase()} TrxID: ${parsed.trxId})`,
      action: 'sms_forward',
    };
    setSuperAdminDevice((prev) => ({
      ...prev,
      lastPingAt: new Date().toISOString(),
      verificationLogs: [allowedLog, ...(prev.verificationLogs || []).slice(0, 49)],
    }));

    // Map SIM to target wallet
    const device = devices.find((d) => d.status === 'online') || devices[0];
    const walletId = simSlot === 1 ? device.sim1WalletId : device.sim2WalletId;
    const targetWallet = wallets.find((w) => w.id === walletId) || wallets.find((w) => w.provider === parsed.provider) || wallets[0];

    // Deduplication check: prevent duplicate ingestion of same provider + TrxID
    const alreadyIngested = incomingTxns.find(
      (t) => t.provider === parsed.provider && t.trxId.toUpperCase() === parsed.trxId.toUpperCase()
    );
    if (alreadyIngested) {
      addToast(
        'Duplicate Ingestion Ignored',
        `TrxID ${parsed.trxId} (${parsed.provider.toUpperCase()}) was already ingested`,
        'info'
      );
      const matched = payments.find((p) => p.id === alreadyIngested.claimedPaymentId);
      return { parsed, matchedPayment: matched };
    }

    const deterministicMsgId = `msg_${parsed.provider}_${parsed.trxId}`;

    const incomingTxn: IncomingTxn = {
      id: `txn_sms_${Date.now()}`,
      provider: parsed.provider,
      trxId: parsed.trxId,
      walletId: targetWallet.id,
      amountPaisa: parsed.amountPaisa,
      balanceAfterPaisa: parsed.balanceAfterPaisa || targetWallet.currentBalancePaisa + parsed.amountPaisa,
      refRaw: parsed.refRaw || '',
      refNormalized: parsed.refNormalized || '',
      rawSms,
      clientMsgId: deterministicMsgId,
      simSlot,
      flags: [],
      receivedAt: parsed.timestamp || new Date().toISOString(),
      senderPhone: sender,
    };

    setIncomingTxns((prev) => [incomingTxn, ...prev]);

    // Check if any payment is currently in 'confirming' or 'awaiting_payment'
    const pendingPayments = payments.filter(
      (p) => p.status === 'confirming' || p.status === 'awaiting_payment'
    );

    let matchedPayment: Payment | undefined;

    // Check exact TrxID matching on confirming payments
    for (const payment of pendingPayments) {
      if (payment.status === 'confirming' && payment.submittedTrxId === parsed.trxId) {
        const evalResult = evaluatePaymentMatch(payment, [incomingTxn]);
        if (evalResult.outcome === 'matched') {
          markPaymentPaid(payment, incomingTxn, evalResult.matchedBy || 'trxid');
          matchedPayment = payment;
          break;
        } else if (evalResult.outcome === 'conflict') {
          const reviewPayment: Payment = {
            ...payment,
            status: 'needs_review',
            reviewReason: evalResult.reviewReason || 'conflict',
          };
          setPayments((prev) => prev.map((p) => (p.id === payment.id ? reviewPayment : p)));
          triggerSignedWebhook(reviewPayment, 'payment.needs_review');
          matchedPayment = reviewPayment;
          break;
        }
      }

      // Check auto-confirm if enabled and reference matches
      if (merchant.autoConfirm && parsed.refNormalized && payment.reference === parsed.refNormalized) {
        if (parsed.amountPaisa === payment.amountPaisa) {
          markPaymentPaid(payment, incomingTxn, 'auto_confirm');
          matchedPayment = payment;
          break;
        }
      }
    }

    if (!matchedPayment) {
      addToast('SMS Stored in Pool', `Recorded ${parsed.provider} TrxID: ${parsed.trxId} (Tk ${(parsed.amountPaisa / 100).toFixed(2)})`, 'info');
    }

    return { parsed, matchedPayment };
  };

  /**
   * Reconciliation Staff Actions
   */
  const resolveReviewPayment = (
    paymentId: string,
    resolution: 'force_match' | 'reject' | 'refund_record',
    note: string,
    staffName = 'ops_tanvir'
  ) => {
    const payment = payments.find((p) => p.id === paymentId);
    if (!payment) return;

    if (resolution === 'force_match') {
      const dummyTxn: IncomingTxn = {
        id: `txn_manual_${Date.now()}`,
        provider: payment.provider,
        trxId: payment.submittedTrxId || `MANUAL-${Date.now().toString(36).toUpperCase()}`,
        walletId: payment.walletId,
        amountPaisa: payment.amountPaisa,
        balanceAfterPaisa: 0,
        refRaw: payment.reference,
        refNormalized: payment.reference,
        rawSms: `[Manual Ops Resolution by ${staffName}]: ${note}`,
        clientMsgId: `manual_${Date.now()}`,
        simSlot: 1,
        flags: ['staff_override'],
        receivedAt: new Date().toISOString(),
        senderPhone: 'Manual Staff Override',
      };
      markPaymentPaid(
        { ...payment, staffResolutionNote: note },
        dummyTxn,
        'manual_review'
      );
      logAudit('payment.resolved_force_match', 'payment', paymentId, `Staff ${staffName} force-matched payment. Note: ${note}`, staffName);
    } else if (resolution === 'reject') {
      setPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId
            ? { ...p, status: 'cancelled', staffResolutionNote: note }
            : p
        )
      );
      triggerSignedWebhook({ ...payment, status: 'cancelled' }, 'payment.cancelled');
      logAudit('payment.resolved_rejected', 'payment', paymentId, `Staff ${staffName} rejected claim. Note: ${note}`, staffName);
      addToast('Payment Rejected', `Review closed for ${payment.orderId}`, 'info');
    }
  };

  /**
   * Plans management
   */
  const createPlan = (
    name: string,
    amountBDT: number,
    externalSku: string,
    description?: string
  ): PricingPlan => {
    const newPlan: PricingPlan = {
      id: `plan_${Date.now().toString(36)}`,
      merchantId: merchant.id,
      name,
      amountPaisa: Math.round(amountBDT * 100),
      currency: 'BDT',
      externalSku,
      version: 1,
      status: 'active',
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setPlans((prev) => [newPlan, ...prev]);
    logAudit('plan.created', 'plan', newPlan.id, `Created pricing plan ${name} (Tk ${amountBDT})`);
    addToast('Pricing Plan Created', `${name} is now available`, 'success');
    return newPlan;
  };

  const updatePlanVersion = (
    planId: string,
    newAmountBDT: number,
    name: string
  ): PricingPlan => {
    const existing = plans.find((p) => p.id === planId);
    if (!existing) throw new Error('Plan not found');

    const updated: PricingPlan = {
      ...existing,
      name,
      amountPaisa: Math.round(newAmountBDT * 100),
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };

    setPlans((prev) => prev.map((p) => (p.id === planId ? updated : p)));
    logAudit('plan.versioned', 'plan', planId, `Updated ${name} to v${updated.version} (Tk ${newAmountBDT})`);
    addToast('Plan Updated', `Version ${updated.version} published`, 'info');
    return updated;
  };

  /**
   * Payouts & Settlements (Double Entry Ledger, Tk 1,000 min)
   */
  const requestPayout = (amountBDT: number, makerId = 'staff_sakib'): { success: boolean; message: string } => {
    const amountPaisa = Math.round(amountBDT * 100);

    // Rule: Minimum Tk 1,000 threshold
    if (amountBDT < 1000) {
      addToast('Minimum Not Met', 'Minimum payout amount is Tk 1,000.00', 'warning');
      return { success: false, message: 'Minimum payout is Tk 1,000' };
    }

    if (amountPaisa > merchant.balancePaisa) {
      addToast('Insufficient Balance', 'Requested payout exceeds current merchant balance', 'error');
      return { success: false, message: 'Insufficient balance' };
    }

    const newPayout: Payout = {
      id: `payout_${Date.now()}`,
      merchantId: merchant.id,
      amountPaisa,
      feePaisa: 0,
      netAmountPaisa: amountPaisa,
      status: 'pending', // Maker-checker 2-person approval!
      payoutAccount: merchant.payoutAccount,
      makerId,
      requestedAt: new Date().toISOString(),
      referenceId: `PO-2026-10-${Math.floor(100 + Math.random() * 900)}`,
    };

    // Hold the balance
    setMerchant((prev) => ({
      ...prev,
      balancePaisa: prev.balancePaisa - amountPaisa,
      heldPaisa: prev.heldPaisa + amountPaisa,
    }));

    setPayouts((prev) => [newPayout, ...prev]);
    logAudit('payout.requested', 'payout', newPayout.id, `Maker ${makerId} requested payout of Tk ${amountBDT.toLocaleString()}`);
    addToast('Payout Requested', `Tk ${amountBDT.toLocaleString()} submitted for 2-person checker approval`, 'info');

    return { success: true, message: 'Payout requested' };
  };

  const approvePayout = (payoutId: string, checkerId = 'ops_tanvir'): { success: boolean; message: string } => {
    const payout = payouts.find((p) => p.id === payoutId);
    if (!payout) return { success: false, message: 'Payout not found' };

    // Maker-checker rule: same person cannot approve their own payout
    if (payout.makerId === checkerId) {
      addToast('Maker-Checker Violation', 'A different staff member must act as the checker', 'error');
      return { success: false, message: 'Maker cannot be checker' };
    }

    const approvedAt = new Date().toISOString();
    const updatedPayout: Payout = {
      ...payout,
      status: 'approved',
      checkerId,
      approvedAt,
    };

    setPayouts((prev) => prev.map((p) => (p.id === payoutId ? updatedPayout : p)));

    // Settle balance from held
    setMerchant((prev) => ({
      ...prev,
      heldPaisa: Math.max(0, prev.heldPaisa - payout.amountPaisa),
    }));

    // Record ledger debit
    const ledgerEntry: LedgerEntry = {
      id: `ledg_${Date.now()}_payout`,
      merchantId: merchant.id,
      payoutId: payout.id,
      type: 'payout',
      debitPaisa: payout.amountPaisa,
      creditPaisa: 0,
      balancePaisaAfter: merchant.balancePaisa,
      description: `Settled payout ${payout.referenceId} to ${payout.payoutAccount.bankName || payout.payoutAccount.provider}`,
      createdAt: approvedAt,
    };

    setLedgerEntries((prev) => [ledgerEntry, ...prev]);
    logAudit('payout.approved', 'payout', payoutId, `Checker ${checkerId} approved payout ${payout.referenceId}`, checkerId);
    addToast('Payout Approved & Settled', `Disbursed Tk ${(payout.amountPaisa / 100).toLocaleString()}`, 'success');

    return { success: true, message: 'Payout approved' };
  };

  const rejectPayout = (payoutId: string, checkerId: string, reason: string) => {
    const payout = payouts.find((p) => p.id === payoutId);
    if (!payout) return;

    // Refund held back to available balance
    setMerchant((prev) => ({
      ...prev,
      balancePaisa: prev.balancePaisa + payout.amountPaisa,
      heldPaisa: Math.max(0, prev.heldPaisa - payout.amountPaisa),
    }));

    setPayouts((prev) =>
      prev.map((p) =>
        p.id === payoutId
          ? { ...p, status: 'rejected', checkerId, rejectionReason: reason }
          : p
      )
    );

    logAudit('payout.rejected', 'payout', payoutId, `Checker ${checkerId} rejected payout: ${reason}`, checkerId);
    addToast('Payout Rejected', 'Funds returned to available merchant balance', 'warning');
  };

  /**
   * Automated Payout Batching Engine (PRD v4.0 / Bangladesh Bank BEFTN/NPSB Clearing)
   */
  const createPayoutBatch = (
    rail: 'beftn' | 'npsb' | 'mfs' = 'beftn',
    makerActor = 'staff_sakib'
  ): { success: boolean; batch?: PayoutBatch; message: string } => {
    const eligiblePayouts = payouts.filter((p) => p.status === 'pending' && !p.batchId);
    if (eligiblePayouts.length === 0) {
      addToast('No Eligible Payouts', 'No pending payouts available to include in a new batch', 'warning');
      return { success: false, message: 'No pending unbatched payouts available' };
    }

    const batchId = `pob_${Date.now()}`;
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const batchNumber = `BATCH-${datePrefix}-${rail.toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;
    const totalAmountPaisa = eligiblePayouts.reduce((sum, p) => sum + p.amountPaisa, 0);
    const totalFeePaisa = eligiblePayouts.reduce((sum, p) => sum + p.feePaisa, 0);
    const uniqueMerchants = new Set(eligiblePayouts.map((p) => p.merchantId)).size;
    const payoutIds = eligiblePayouts.map((p) => p.id);

    const newBatch: PayoutBatch = {
      id: batchId,
      batchNumber,
      totalAmountPaisa,
      totalFeePaisa,
      payoutCount: eligiblePayouts.length,
      merchantCount: uniqueMerchants,
      status: 'created',
      rail,
      payoutIds,
      makerActor,
      createdAt: new Date().toISOString(),
    };

    setPayouts((prev) =>
      prev.map((p) => (payoutIds.includes(p.id) ? { ...p, batchId } : p))
    );

    setPayoutBatches((prev) => [newBatch, ...prev]);
    logAudit('batch.created', 'payout_batch', batchId, `Created batch ${batchNumber} with ${payoutIds.length} payouts totaling Tk ${(totalAmountPaisa / 100).toLocaleString()}`, makerActor);
    addToast('Batch Generated', `${batchNumber} created with ${payoutIds.length} disbursements`, 'success');

    return { success: true, batch: newBatch, message: 'Batch successfully created' };
  };

  const verifyPayoutBatch = (batchId: string, makerActor = 'staff_sakib'): { success: boolean; message: string } => {
    const batch = payoutBatches.find((b) => b.id === batchId);
    if (!batch) return { success: false, message: 'Batch not found' };

    const verifiedAt = new Date().toISOString();
    setPayoutBatches((prev) =>
      prev.map((b) =>
        b.id === batchId
          ? { ...b, status: 'verified', verifiedAt, makerActor }
          : b
      )
    );

    logAudit('batch.verified', 'payout_batch', batchId, `Maker ${makerActor} verified totals and accounts for ${batch.batchNumber}`, makerActor);
    addToast('Batch Verified', `${batch.batchNumber} verified by Maker. Ready for Checker.`, 'info');
    return { success: true, message: 'Batch verified' };
  };

  const approvePayoutBatch = (batchId: string, checkerActor = 'ops_tanvir'): { success: boolean; message: string } => {
    const batch = payoutBatches.find((b) => b.id === batchId);
    if (!batch) return { success: false, message: 'Batch not found' };

    if (batch.makerActor === checkerActor) {
      addToast('Maker-Checker Violation', 'Batch Checker must be independent from Maker', 'error');
      return { success: false, message: 'Maker and Checker cannot be the same staff member' };
    }

    const approvedAt = new Date().toISOString();
    const clearingReference = `BB-${batch.rail.toUpperCase()}-TXN-${Date.now().toString().slice(-8)}`;

    setPayoutBatches((prev) =>
      prev.map((b) =>
        b.id === batchId
          ? {
              ...b,
              status: 'approved',
              checkerActor,
              approvedAt,
              clearingReference,
            }
          : b
      )
    );

    const memberPayouts = payouts.filter((p) => batch.payoutIds.includes(p.id));
    setPayouts((prev) =>
      prev.map((p) =>
        batch.payoutIds.includes(p.id)
          ? { ...p, status: 'approved', checkerId: checkerActor, approvedAt }
          : p
      )
    );

    const totalDeductionPaisa = memberPayouts.reduce((sum, p) => sum + p.amountPaisa, 0);
    setMerchant((prev) => ({
      ...prev,
      heldPaisa: Math.max(0, prev.heldPaisa - totalDeductionPaisa),
    }));

    const newLedgerEntries: LedgerEntry[] = memberPayouts.map((p) => ({
      id: `ledg_${Date.now()}_batch_${p.id}`,
      merchantId: p.merchantId,
      payoutId: p.id,
      type: 'payout',
      debitPaisa: p.amountPaisa,
      creditPaisa: 0,
      balancePaisaAfter: merchant.balancePaisa,
      description: `Disbursed via batch ${batch.batchNumber} (${batch.rail.toUpperCase()}) Ref: ${clearingReference}`,
      createdAt: approvedAt,
    }));

    setLedgerEntries((prev) => [...newLedgerEntries, ...prev]);
    logAudit('batch.approved', 'payout_batch', batchId, `Checker ${checkerActor} approved batch ${batch.batchNumber}. Ref: ${clearingReference}`, checkerActor);
    addToast('Batch Disbursed!', `Approved ${batch.batchNumber} (Tk ${(batch.totalAmountPaisa / 100).toLocaleString()}) for clearing`, 'success');

    return { success: true, message: 'Batch approved and scheduled for clearing' };
  };

  const exportBatchFile = (batchId: string): { filename: string; content: string } => {
    const batch = payoutBatches.find((b) => b.id === batchId);
    if (!batch) throw new Error('Batch not found');

    const memberPayouts = payouts.filter((p) => batch.payoutIds.includes(p.id));
    const filename = `${batch.batchNumber}.csv`;

    const headers = [
      'BatchNumber',
      'PayoutReference',
      'MerchantName',
      'AccountType',
      'ProviderOrBank',
      'BranchName',
      'RoutingNumber',
      'AccountNumber',
      'AccountName',
      'AmountBDT',
      'ClearingReference',
      'Date',
    ];

    const sanitizeCsv = (val: any) => {
      const s = String(val ?? '');
      const clean = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return `"${clean.replace(/"/g, '""')}"`;
    };

    const rows = memberPayouts.map((p) => [
      sanitizeCsv(batch.batchNumber),
      sanitizeCsv(p.referenceId),
      sanitizeCsv(merchant.name),
      sanitizeCsv(p.payoutAccount.type.toUpperCase()),
      sanitizeCsv(p.payoutAccount.bankName || p.payoutAccount.provider?.toUpperCase() || 'MFS'),
      sanitizeCsv(p.payoutAccount.branchName || 'N/A'),
      sanitizeCsv(p.payoutAccount.routingNumber || 'N/A'),
      sanitizeCsv(p.payoutAccount.accountNumber),
      sanitizeCsv(p.payoutAccount.accountName),
      sanitizeCsv((p.amountPaisa / 100).toFixed(2)),
      sanitizeCsv(batch.clearingReference || 'PENDING'),
      sanitizeCsv(new Date().toISOString().slice(0, 10)),
    ]);

    const content = [headers.map(sanitizeCsv).join(','), ...rows.map((r) => r.join(','))].join('\n');
    return { filename, content };
  };

  const resendWebhook = async (deliveryId: string) => {
    const delivery = webhookDeliveries.find((w) => w.id === deliveryId);
    if (!delivery) return;

    // Update attempt
    setWebhookDeliveries((prev) =>
      prev.map((w) =>
        w.id === deliveryId
          ? {
              ...w,
              attempt: w.attempt + 1,
              status: 'success',
              lastAttemptAt: new Date().toISOString(),
              statusCode: 200,
            }
          : w
      )
    );

    logAudit('webhook.resend', 'webhook', deliveryId, `Manual resend for ${delivery.event}`);
    addToast('Webhook Dispatched', `Resent ${delivery.event} to ${merchant.webhookUrl}`, 'success');
  };

  const toggleWalletDrain = (walletId: string) => {
    setWallets((prev) =>
      prev.map((w) => {
        if (w.id === walletId) {
          const nextStatus = w.status === 'draining' ? 'active' : 'draining';
          logAudit('wallet.status_change', 'wallet', walletId, `Status toggled to ${nextStatus}`);
          addToast('Wallet Status Updated', `${w.provider.toUpperCase()} (${w.msisdn}) is now ${nextStatus}`, 'info');
          return { ...w, status: nextStatus };
        }
        return w;
      })
    );
  };

  const deviceHeartbeat = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === deviceId ? { ...d, lastHeartbeatAt: new Date().toISOString(), status: 'online' } : d))
    );
    addToast('Device Heartbeat Sent', 'Node reported online with 0 queue backlog', 'info');
  };

  const revokeDevice = (deviceId: string) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === deviceId ? { ...d, status: 'revoked' } : d))
    );
    logAudit('device.revoked', 'device', deviceId, 'Device token revoked by staff');
    addToast('Device Token Revoked', 'Fleet node disconnected', 'warning');
  };

  const updateMerchantSettings = (updates: Partial<Merchant>) => {
    setMerchant((prev) => {
      const updated = { ...prev, ...updates };
      logAudit('merchant.settings_updated', 'merchant', prev.id, 'Updated merchant profile or settings');
      addToast('Settings Saved', 'Merchant configuration successfully updated', 'success');
      return updated;
    });
  };

  return (
    <PayGateContext.Provider
      value={{
        merchant,
        superAdminDevice,
        plans,
        devices,
        wallets,
        payments,
        incomingTxns,
        ledgerEntries,
        payouts,
        webhookDeliveries,
        auditLogs,
        theme,
        language,
        currentUserRole,
        activeView,
        activeMerchantTab,
        activeAdminTab,
        selectedPaymentId,
        popupPayModalId,
        toasts,
        payoutBatches,
        setTheme,
        setLanguage,
        setCurrentUserRole,
        setActiveView,
        setActiveMerchantTab,
        setActiveAdminTab,
        setSelectedPaymentId,
        setPopupPayModalId,
        addToast,
        removeToast,
        updateSuperAdminDevice,
        addWhitelistedIp,
        removeWhitelistedIp,
        toggleIpEnforcement,
        setActiveClientIp,
        pingSuperAdminDevice,
        verifyClientIp,
        createPayment,
        submitCustomerPaymentClaim,
        ingestForwardedSms,
        resolveReviewPayment,
        createPlan,
        updatePlanVersion,
        requestPayout,
        approvePayout,
        rejectPayout,
        createPayoutBatch,
        verifyPayoutBatch,
        approvePayoutBatch,
        exportBatchFile,
        resendWebhook,
        toggleWalletDrain,
        deviceHeartbeat,
        revokeDevice,
        updateMerchantSettings,
      }}
    >
      {children}
    </PayGateContext.Provider>
  );
};

export const usePayGate = () => {
  const ctx = useContext(PayGateContext);
  if (!ctx) throw new Error('usePayGate must be used within PayGateProvider');
  return ctx;
};
