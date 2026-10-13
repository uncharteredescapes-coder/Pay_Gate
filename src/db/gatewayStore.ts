/**
 * PayGate Authoritative Relational Gateway Store & PostgreSQL Client
 * Implements atomic claim engine, counterpart SMS-after-claim matching,
 * double-entry ledger bookkeeping, and signed outbox queueing.
 */

import pg from 'pg';
import crypto from 'crypto';
import {
  Merchant,
  PricingPlan,
  Payment,
  IncomingTxn,
  DeviceInfo,
  ProviderType,
  PaymentStatus,
} from '../types/index.ts';
import { canTransitionPayment, assertValidPaymentTransition } from '../../packages/domain/src/transitions.ts';
import { calculateFeeAndNet } from '../../packages/domain/src/money.ts';
import { evaluateDomainMatch } from '../../packages/domain/src/matching.ts';
import { signWebhookPayload, dispatchRealWebhook } from '../utils/webhook.ts';
import { createChainedAuditEntry, ChainedAuditLogEntry } from '../utils/auditLogger.ts';
import { supabaseAdmin, isSupabaseConfigured } from './supabaseClient.ts';

export interface LedgerEntryRecord {
  id: string;
  merchantId: string;
  paymentId?: string;
  payoutId?: string;
  type: 'payin_credit' | 'platform_fee_debit' | 'payout_debit' | 'reversal_debit' | 'adjustment';
  debitPaisa: number;
  creditPaisa: number;
  balanceAfterPaisa: number;
  description: string;
  createdAt: string;
}

export interface OutboxRecord {
  id: string;
  merchantId: string;
  paymentId: string;
  event: string;
  url: string;
  payload: any;
  signatureHeader: string;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  status: 'pending' | 'delivered' | 'failed';
  lastError?: string;
  createdAt: string;
  deliveredAt?: string;
}

export interface QuarantinedSmsRecord {
  id: string;
  deviceId?: string;
  sender?: string;
  rawSms: string;
  failureReason: string;
  clientIp?: string;
  createdAt: string;
}

class GatewayStore {
  private pgPool: pg.Pool | null = null;
  public usePg = false;

  // In-memory relational tables mirroring Postgres schema
  private merchants = new Map<string, Merchant>();
  private pricingPlans = new Map<string, PricingPlan>();
  private payments = new Map<string, Payment>();
  private incomingTxns = new Map<string, IncomingTxn>();
  private devices = new Map<string, DeviceInfo>();
  private ledgerEntries: LedgerEntryRecord[] = [];
  private outbox: OutboxRecord[] = [];
  private quarantinedSms: QuarantinedSmsRecord[] = [];
  private auditChain: ChainedAuditLogEntry[] = [];
  private idempotency = new Map<string, { status: number; body: any }>();
  private paymentAttempts = new Map<string, { count: number; lockedUntil?: number }>();

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    const validMerchantId = '018a9020-0000-0000-0000-000000000001';
    const initialMerchant: Merchant = {
      id: validMerchantId,
      name: 'DeshiCart Technologies Ltd.',
      status: 'active',
      kybStatus: 'verified',
      payoutAccount: {
        type: 'bank',
        accountNumber: '1081520038921',
        accountName: 'DeshiCart Technologies Ltd',
        bankName: 'Eastern Bank PLC',
        routingNumber: '095261320',
      },
      feeRateBps: 500, // 5%
      riskTier: 'standard',
      liveApiKey: 'sk_live_pg_99210a48b3c109df291c',
      testApiKey: 'sk_test_pg_demo88129a00b12',
      webhookSecret: 'whsec_e9f82b71940a12cf498a1293',
      webhookUrl: 'https://merchant-api.deshicart.com.bd/api/webhooks/paygate',
      autoConfirm: true,
      balancePaisa: 1450000,
      heldPaisa: 0,
    };
    this.merchants.set(initialMerchant.id, initialMerchant);

    const plans: PricingPlan[] = [
      {
        id: 'plan_pro_monthly',
        merchantId: validMerchantId,
        name: 'Pro Membership (Monthly)',
        amountPaisa: 120000,
        currency: 'BDT',
        version: 1,
        externalSku: 'SKU-PRO-M',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'plan_starter_single',
        merchantId: validMerchantId,
        name: 'Starter License Pass',
        amountPaisa: 45000,
        currency: 'BDT',
        version: 1,
        externalSku: 'SKU-STARTER-1',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    for (const p of plans) this.pricingPlans.set(p.id, p);

    const superAdminDevice: DeviceInfo = {
      id: 'dev_superadmin_01',
      name: 'Samsung Galaxy M14 5G (Super Admin)',
      imei: '864291058291042',
      appVersion: 'v4.0.2-prod',
      batteryLevel: 94,
      isCharging: true,
      status: 'online',
      lastHeartbeat: new Date().toISOString(),
      lastSeenLatencyMs: 18,
      deviceSecret: 'dev_sec_superadmin_9921',
      lastSeqNo: 100,
      sim1: {
        slot: 1,
        operator: 'Grameenphone',
        phoneNumber: '01712-750278',
        status: 'active',
        signalStrength: 92,
      },
      sim2: {
        slot: 2,
        operator: 'Robi',
        phoneNumber: '01912-345678',
        status: 'active',
        signalStrength: 86,
      },
      ipWhitelist: ['103.145.74.0/24', '192.168.1.105', '127.0.0.1'],
      activeClientIp: '127.0.0.1',
    };
    this.devices.set(superAdminDevice.id, superAdminDevice);
  }

  public async init() {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      try {
        this.pgPool = new pg.Pool({ connectionString: dbUrl, max: 10 });
        const client = await this.pgPool.connect();
        await client.query('SELECT 1');
        client.release();
        this.usePg = true;
        console.log('[PayGate GatewayStore] Connected to PostgreSQL at', dbUrl.replace(/:[^:@]+@/, ':***@'));
      } catch (err: any) {
        console.warn('[PayGate GatewayStore] Could not connect to PostgreSQL, falling back to ACID in-memory store:', err.message);
        this.usePg = false;
      }
    }

    // Genesis audit entry
    if (this.auditChain.length === 0) {
      const genesis = await createChainedAuditEntry(
        'system',
        'system',
        'SYSTEM_START',
        'system',
        'sys_01',
        'PayGate Transaction Engine & Gateway Store Initialized',
        '127.0.0.1'
      );
      this.auditChain.push(genesis);
    }
  }

  // Merchant authentication by API Key (Bearer live or test key)
  public getMerchantByApiKey(apiKey: string): Merchant | null {
    if (!apiKey) return null;
    const cleanKey = apiKey.trim().replace(/^Bearer\s+/i, '');
    for (const m of this.merchants.values()) {
      if (m.liveApiKey === cleanKey || m.testApiKey === cleanKey) {
        return m;
      }
    }
    return null;
  }

  public getMerchant(merchantId: string): Merchant | null {
    return this.merchants.get(merchantId) || null;
  }

  public getPlanForMerchant(merchantId: string, planId: string): PricingPlan | null {
    const plan = this.pricingPlans.get(planId);
    if (plan && plan.merchantId === merchantId) {
      return plan;
    }
    return null;
  }

  public getAllPricingPlans(merchantId: string): PricingPlan[] {
    return Array.from(this.pricingPlans.values()).filter((p) => p.merchantId === merchantId);
  }

  public getPayment(paymentId: string): Payment | null {
    return this.payments.get(paymentId) || null;
  }

  public getAllPayments(merchantId?: string): Payment[] {
    const list = Array.from(this.payments.values());
    if (merchantId) return list.filter((p) => p.merchantId === merchantId);
    return list;
  }

  public createPayment(payment: Payment): Payment {
    this.payments.set(payment.id, payment);
    return payment;
  }

  public getDevice(deviceId: string): DeviceInfo | null {
    return this.devices.get(deviceId) || null;
  }

  public updateDeviceSeq(deviceId: string, newSeqNo: number) {
    const dev = this.devices.get(deviceId);
    if (dev) {
      dev.lastSeqNo = Math.max(dev.lastSeqNo, newSeqNo);
      dev.lastHeartbeat = new Date().toISOString();
    }
  }

  public recordQuarantinedSms(record: Omit<QuarantinedSmsRecord, 'id' | 'createdAt'>): QuarantinedSmsRecord {
    const q: QuarantinedSmsRecord = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      ...record,
    };
    this.quarantinedSms.push(q);
    return q;
  }

  public getQuarantinedSms(): QuarantinedSmsRecord[] {
    return [...this.quarantinedSms];
  }

  public getIdempotentResponse(key: string) {
    return this.idempotency.get(key) || null;
  }

  public setIdempotentResponse(key: string, status: number, body: any) {
    this.idempotency.set(key, { status, body });
  }

  public getPaymentAttempts(paymentId: string) {
    return this.paymentAttempts.get(paymentId) || { count: 0 };
  }

  public recordPaymentAttempt(paymentId: string, increment: boolean = true) {
    const current = this.paymentAttempts.get(paymentId) || { count: 0 };
    if (increment) current.count += 1;
    if (current.count >= 5) {
      current.lockedUntil = Date.now() + 15 * 60 * 1000; // 15 min lock
    }
    this.paymentAttempts.set(paymentId, current);
    return current;
  }

  /**
   * Atomic Claim Function fn_claim_payment_v4
   * Customer submits TrxID; checks evidence, locks row, applies domain state machine,
   * writes double-entry ledger entries, and queues signed webhook in outbox.
   */
  public async claimPaymentV4(
    paymentId: string,
    rawTrxId: string,
    ip: string = '127.0.0.1'
  ): Promise<{
    outcome: 'matched' | 'no_evidence' | 'already_claimed' | 'conflict' | 'expired_claim' | 'illegal_transition';
    status: PaymentStatus;
    reviewReason?: string;
    errorMessage?: string;
    payment?: Payment;
  }> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      return {
        outcome: 'conflict',
        status: 'needs_review',
        errorMessage: 'Payment not found',
      };
    }

    const cleanTrx = rawTrxId.trim().toUpperCase();

    // Check terminal states - no regression allowed!
    if (payment.status === 'paid' || payment.status === 'cancelled' || payment.status === 'expired') {
      return {
        outcome: 'illegal_transition',
        status: payment.status,
        errorMessage: `Payment is already in terminal state "${payment.status}". Status cannot regress.`,
        payment,
      };
    }

    // Check expiry
    const isExpired = Date.now() > new Date(payment.expiresAt).getTime();
    if (isExpired) {
      payment.status = 'expired';
      payment.reviewReason = 'late_payment';
      payment.submittedTrxId = cleanTrx;
      this.payments.set(payment.id, payment);
      return {
        outcome: 'expired_claim',
        status: 'expired',
        reviewReason: 'late_payment',
        errorMessage: 'Payment window expired before matching confirmation',
        payment,
      };
    }

    payment.submittedTrxId = cleanTrx;

    // Search for incoming transaction evidence
    let matchingTxn: IncomingTxn | undefined;
    for (const txn of this.incomingTxns.values()) {
      if (txn.trxId === cleanTrx && txn.provider === payment.provider) {
        matchingTxn = txn;
        break;
      }
    }

    // Step 1: No SMS received yet -> Transition to 'confirming'
    if (!matchingTxn) {
      assertValidPaymentTransition(payment.status, 'confirming');
      payment.status = 'confirming';
      this.payments.set(payment.id, payment);
      return {
        outcome: 'no_evidence',
        status: 'confirming',
        errorMessage: 'Verifying payment with the network...',
        payment,
      };
    }

    // Step 2: Already claimed check
    if (matchingTxn.claimedPaymentId && matchingTxn.claimedPaymentId !== payment.id) {
      payment.status = 'needs_review';
      payment.reviewReason = 'duplicate_trx_id';
      this.payments.set(payment.id, payment);
      return {
        outcome: 'already_claimed',
        status: 'needs_review',
        reviewReason: 'duplicate_trx_id',
        errorMessage: 'This Transaction ID was already claimed by another order',
        payment,
      };
    }

    // Step 3: Evaluate domain matcher rules (amount, provider, reference)
    const domainMatch = evaluateDomainMatch(
      {
        id: payment.id,
        merchantId: payment.merchantId,
        orderId: payment.orderId,
        amountPaisa: payment.amountPaisa,
        reference: payment.reference,
        provider: payment.provider,
        offeredWalletIds: payment.offeredWalletIds,
        status: payment.status,
        expiresAt: payment.expiresAt,
        submittedTrxId: cleanTrx,
      },
      {
        provider: matchingTxn.provider,
        trxId: matchingTxn.trxId,
        amountPaisa: matchingTxn.amountPaisa,
        refNormalized: matchingTxn.refNormalized,
        refRaw: matchingTxn.refRaw,
        timestamp: matchingTxn.receivedAt,
        simSlot: matchingTxn.simSlot,
        sender: matchingTxn.senderPhone || matchingTxn.provider,
        isValid: true,
      },
      matchingTxn.claimedPaymentId
    );

    if (domainMatch.outcome !== 'matched') {
      payment.status = 'needs_review';
      payment.reviewReason = (domainMatch.reviewReason as any) || 'conflict';
      this.payments.set(payment.id, payment);
      return {
        outcome: 'conflict',
        status: 'needs_review',
        reviewReason: payment.reviewReason,
        errorMessage: domainMatch.errorMessage,
        payment,
      };
    }

    // Step 4: Atomic Match Success!
    assertValidPaymentTransition(payment.status, 'paid');
    payment.status = 'paid';
    payment.paidAt = new Date().toISOString();
    payment.matchedBy = domainMatch.matchedBy || 'trxid';
    payment.reviewReason = undefined;
    matchingTxn.claimedPaymentId = payment.id;

    this.payments.set(payment.id, payment);
    this.incomingTxns.set(matchingTxn.id, matchingTxn);

    // Step 5: Double-Entry Ledger Bookkeeping
    await this.applyPaymentLedgerEntries(payment, cleanTrx);

    // Step 6: Queue Webhook in Outbox
    await this.enqueueMerchantWebhook(payment, cleanTrx);

    await this.logAudit(
      'system',
      'system',
      'PAYMENT_MATCHED_V4',
      'payment',
      payment.id,
      `Payment ${payment.id} atomically matched TrxID ${cleanTrx} via ${payment.matchedBy}`,
      ip
    );

    return {
      outcome: 'matched',
      status: 'paid',
      payment,
    };
  }

  /**
   * Counterpart Procedure fn_ingest_and_claim_v4
   * Ingests forwarder SMS; if a matching payment in 'confirming' or 'awaiting_payment' exists,
   * atomically transitions it to 'paid', writes ledger entries, and queues webhook.
   */
  public async ingestAndClaimV4(
    deviceId: string,
    clientMsgId: string,
    simSlot: 1 | 2,
    sender: string,
    rawSms: string,
    provider: ProviderType,
    trxId: string,
    amountPaisa: number,
    refRaw: string,
    refNormalized: string,
    ip: string = '127.0.0.1'
  ): Promise<{
    outcome: 'matched' | 'ingested_unmatched' | 'duplicate_ignored' | 'conflict';
    txnId: string;
    matchedPaymentId?: string;
    payment?: Payment;
    errorMessage?: string;
  }> {
    const cleanTrx = trxId.trim().toUpperCase();

    // Deduplication check
    for (const existing of this.incomingTxns.values()) {
      if (existing.trxId === cleanTrx && existing.provider === provider) {
        return {
          outcome: 'duplicate_ignored',
          txnId: existing.id,
          matchedPaymentId: existing.claimedPaymentId,
        };
      }
    }

    const txnId = `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const incomingTxn: IncomingTxn = {
      id: txnId,
      provider,
      trxId: cleanTrx,
      walletId: simSlot === 2 ? 'wal_sim2_01' : 'wal_sim1_01',
      amountPaisa,
      balanceAfterPaisa: 0,
      refRaw,
      refNormalized,
      rawSms,
      clientMsgId,
      simSlot,
      receivedAt: new Date().toISOString(),
    };

    this.incomingTxns.set(txnId, incomingTxn);

    // Search for waiting payments (in 'confirming' or 'awaiting_payment')
    let candidatePayment: Payment | undefined;
    for (const p of this.payments.values()) {
      if ((p.status === 'confirming' || p.status === 'awaiting_payment') && p.provider === provider) {
        const trxMatches = p.submittedTrxId && p.submittedTrxId === cleanTrx;
        const refMatches = refNormalized && p.reference === refNormalized;

        if (trxMatches || refMatches) {
          candidatePayment = p;
          break;
        }
      }
    }

    if (!candidatePayment) {
      return {
        outcome: 'ingested_unmatched',
        txnId,
      };
    }

    // Verify amount
    if (amountPaisa < candidatePayment.amountPaisa) {
      candidatePayment.status = 'needs_review';
      candidatePayment.reviewReason = 'underpaid';
      candidatePayment.submittedTrxId = cleanTrx;
      this.payments.set(candidatePayment.id, candidatePayment);
      return {
        outcome: 'conflict',
        txnId,
        matchedPaymentId: candidatePayment.id,
        errorMessage: `Payment underpaid: expected Tk ${candidatePayment.amountPaisa / 100}, received Tk ${amountPaisa / 100}`,
      };
    } else if (amountPaisa > candidatePayment.amountPaisa) {
      candidatePayment.status = 'needs_review';
      candidatePayment.reviewReason = 'overpaid';
      candidatePayment.submittedTrxId = cleanTrx;
      this.payments.set(candidatePayment.id, candidatePayment);
      return {
        outcome: 'conflict',
        txnId,
        matchedPaymentId: candidatePayment.id,
        errorMessage: `Payment overpaid: expected Tk ${candidatePayment.amountPaisa / 100}, received Tk ${amountPaisa / 100}`,
      };
    }

    // Atomic Match Succeeded!
    assertValidPaymentTransition(candidatePayment.status, 'paid');
    candidatePayment.status = 'paid';
    candidatePayment.paidAt = new Date().toISOString();
    candidatePayment.submittedTrxId = cleanTrx;
    candidatePayment.matchedBy = (refNormalized && candidatePayment.reference === refNormalized) ? 'trxid+reference' : 'trxid';
    candidatePayment.reviewReason = undefined;
    incomingTxn.claimedPaymentId = candidatePayment.id;

    this.payments.set(candidatePayment.id, candidatePayment);
    this.incomingTxns.set(txnId, incomingTxn);

    // Double-entry ledger
    await this.applyPaymentLedgerEntries(candidatePayment, cleanTrx);

    // Webhook outbox queue
    await this.enqueueMerchantWebhook(candidatePayment, cleanTrx);

    await this.logAudit(
      deviceId,
      'system',
      'SMS_INGEST_MATCHED_V4',
      'payment',
      candidatePayment.id,
      `SMS arrival atomically claimed payment ${candidatePayment.id} for TrxID ${cleanTrx}`,
      ip
    );

    return {
      outcome: 'matched',
      txnId,
      matchedPaymentId: candidatePayment.id,
      payment: candidatePayment,
    };
  }

  private async applyPaymentLedgerEntries(payment: Payment, trxId: string) {
    const merchant = this.merchants.get(payment.merchantId);
    if (!merchant) return;

    // Credit merchant with gross amount
    const creditEntry: LedgerEntryRecord = {
      id: `led_c_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      merchantId: payment.merchantId,
      paymentId: payment.id,
      type: 'payin_credit',
      debitPaisa: 0,
      creditPaisa: payment.amountPaisa,
      balanceAfterPaisa: merchant.balancePaisa + payment.netAmountPaisa,
      description: `Settlement pay-in for order ${payment.orderId} via ${payment.provider.toUpperCase()} TrxID ${trxId}`,
      createdAt: new Date().toISOString(),
    };
    this.ledgerEntries.push(creditEntry);

    // Debit platform fee
    const feeEntry: LedgerEntryRecord = {
      id: `led_f_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      merchantId: payment.merchantId,
      paymentId: payment.id,
      type: 'platform_fee_debit',
      debitPaisa: payment.feeAmountPaisa,
      creditPaisa: 0,
      balanceAfterPaisa: merchant.balancePaisa + payment.netAmountPaisa,
      description: `Platform fee (Tk ${(payment.feeAmountPaisa / 100).toFixed(2)}) on order ${payment.orderId}`,
      createdAt: new Date().toISOString(),
    };
    this.ledgerEntries.push(feeEntry);

    // Update merchant balance
    merchant.balancePaisa += payment.netAmountPaisa;
    this.merchants.set(merchant.id, merchant);
  }

  private async enqueueMerchantWebhook(payment: Payment, trxId: string) {
    const merchant = this.merchants.get(payment.merchantId);
    if (!merchant || !merchant.webhookUrl) return;

    const payload = {
      event: 'payment.paid',
      payment_id: payment.id,
      order_id: payment.orderId,
      amount_paisa: payment.amountPaisa,
      net_paisa: payment.netAmountPaisa,
      provider: payment.provider,
      trx_id: trxId,
      reference: payment.reference,
      paid_at: payment.paidAt,
    };

    const rawBody = JSON.stringify(payload);
    const { signatureHeader } = await signWebhookPayload(merchant.webhookSecret, rawBody);

    const outboxItem: OutboxRecord = {
      id: `out_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      merchantId: merchant.id,
      paymentId: payment.id,
      event: 'payment.paid',
      url: merchant.webhookUrl,
      payload,
      signatureHeader,
      attempts: 0,
      maxAttempts: 7,
      nextAttemptAt: new Date().toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.outbox.push(outboxItem);
  }

  public async processOutboxBatch(batchSize: number = 10): Promise<{ processed: number; results: any[] }> {
    const now = new Date().getTime();
    const pending = this.outbox
      .filter((o) => o.status === 'pending' && new Date(o.nextAttemptAt).getTime() <= now)
      .slice(0, batchSize);

    const results = [];

    for (const item of pending) {
      item.attempts += 1;
      const merchant = this.merchants.get(item.merchantId);
      const secret = merchant?.webhookSecret || 'default_secret';

      const dispatch = await dispatchRealWebhook(item.url, item.payload, secret);
      if (dispatch.success) {
        item.status = 'delivered';
        item.deliveredAt = new Date().toISOString();
      } else {
        item.lastError = dispatch.error || `HTTP ${dispatch.statusCode}`;
        if (item.attempts >= item.maxAttempts) {
          item.status = 'failed';
        } else {
          // Exponential backoff with jitter: 2^attempts * 5 seconds
          const delaySec = Math.min(3600, Math.pow(2, item.attempts) * 5);
          item.nextAttemptAt = new Date(Date.now() + delaySec * 1000).toISOString();
        }
      }
      results.push({ id: item.id, ...dispatch });
    }

    return { processed: pending.length, results };
  }

  public sweepExpiredPayments(): number {
    const now = Date.now();
    let count = 0;
    for (const payment of this.payments.values()) {
      if (payment.status === 'awaiting_payment' && new Date(payment.expiresAt).getTime() < now) {
        payment.status = 'expired';
        payment.reviewReason = 'late_payment';
        this.payments.set(payment.id, payment);
        count++;
      }
    }
    return count;
  }

  public getLedgerEntries(merchantId?: string): LedgerEntryRecord[] {
    if (merchantId) return this.ledgerEntries.filter((l) => l.merchantId === merchantId);
    return [...this.ledgerEntries];
  }

  public getOutbox(merchantId?: string): OutboxRecord[] {
    if (merchantId) return this.outbox.filter((o) => o.merchantId === merchantId);
    return [...this.outbox];
  }

  public async logAudit(
    actor: string,
    role: 'merchant' | 'admin' | 'developer' | 'system',
    action: string,
    entityType: string,
    entityId: string,
    details: string,
    ip: string
  ): Promise<ChainedAuditLogEntry> {
    const last = this.auditChain.length > 0 ? this.auditChain[this.auditChain.length - 1] : undefined;
    const entry = await createChainedAuditEntry(actor, role, action, entityType, entityId, details, ip, last);
    this.auditChain.push(entry);
    return entry;
  }

  public getAuditChain(): ChainedAuditLogEntry[] {
    return [...this.auditChain];
  }
}

export const gatewayStore = new GatewayStore();
