import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateReference, validateReference, normalizeReference } from './src/utils/reference.ts';
import { parseIncomingSms, validateTrxIdFormat } from './src/utils/smsParser.ts';
import { verifyDeviceIngestSignature, DeviceSignPayload } from './src/utils/deviceSignature.ts';
import { calculateFeeAndNet } from './packages/domain/src/money.ts';
import { Payment, ProviderType, Merchant } from './src/types/index.ts';
import { gatewayStore } from './src/db/gatewayStore.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'adm_sec_paygate_prod9910';

app.use(express.json());

// Initialize Gateway Store
gatewayStore.init();

// ==========================================
// AUTHENTICATION MIDDLEWARES
// ==========================================

export interface AuthenticatedRequest extends Request {
  merchant?: Merchant;
  isAdmin?: boolean;
}

function requireMerchantAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({
      error: 'Unauthorized: Merchant API key required in Authorization header (Bearer sk_live_... / sk_test_...)',
    });
  }

  const merchant = gatewayStore.getMerchantByApiKey(authHeader);
  if (!merchant) {
    return res.status(401).json({
      error: 'Unauthorized: Invalid or revoked Merchant API key',
    });
  }

  req.merchant = merchant;
  next();
}

function requireAdminAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const adminHeader = (req.headers['x-admin-token'] as string) || '';
  const authHeader = (req.headers['authorization'] as string) || '';
  const token = adminHeader || authHeader.replace(/^Bearer\s+/i, '');

  if (!token || token !== ADMIN_SECRET_KEY) {
    return res.status(403).json({
      error: 'Forbidden: Admin authorization required (x-admin-token or Admin Bearer token)',
    });
  }

  req.isAdmin = true;
  next();
}

// ==========================================
// BACKGROUND AUTOMATED WORKERS
// ==========================================

// 1. Transactional Outbox Webhook Worker (dispatches every 3 seconds)
setInterval(async () => {
  try {
    await gatewayStore.processOutboxBatch(10);
  } catch (err: any) {
    console.error('[PayGate Outbox Worker] Error dispatching webhooks:', err.message);
  }
}, 3000);

// 2. Stale Payment Expiry Sweeper (runs every 30 seconds)
setInterval(() => {
  try {
    const swept = gatewayStore.sweepExpiredPayments();
    if (swept > 0) {
      console.log(`[PayGate Expiry Sweeper] Marked ${swept} stale payments as expired.`);
    }
  } catch (err: any) {
    console.error('[PayGate Expiry Sweeper] Error:', err.message);
  }
}, 30000);

// ==========================================
// MERCHANT API V1 ENDPOINTS
// ==========================================

// 1. POST /v1/payments (Merchant creates payment with mandatory API key auth & plan validation)
app.post('/v1/payments', requireMerchantAuth, async (req: AuthenticatedRequest, res: Response) => {
  const merchant = req.merchant!;
  const idempotencyKey = req.headers['idempotency-key'] as string;

  if (idempotencyKey) {
    const cached = gatewayStore.getIdempotentResponse(idempotencyKey);
    if (cached) {
      return res.status(cached.status).json(cached.body);
    }
  }

  const { plan_id, order_id, provider = 'bkash', customer_phone } = req.body;

  if (!plan_id) {
    return res.status(400).json({ error: 'plan_id is required' });
  }

  const plan = gatewayStore.getPlanForMerchant(merchant.id, plan_id);
  if (!plan) {
    return res.status(400).json({
      error: `Invalid plan_id "${plan_id}" for authenticated merchant "${merchant.name}"`,
    });
  }

  // Calculate fees using domain money engine
  const { feePaisa, netPaisa } = calculateFeeAndNet(plan.amountPaisa, merchant.feeRateBps);

  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const reference = generateReference();
  const superAdminDevice = gatewayStore.getDevice('dev_superadmin_01');
  const walletNumber =
    provider === 'rocket' || provider === 'upay' || provider === 'cellfin'
      ? superAdminDevice?.sim2.phoneNumber || '01912-345678'
      : superAdminDevice?.sim1.phoneNumber || '01712-750278';

  const newPayment: Payment = {
    id: paymentId,
    merchantId: merchant.id,
    planId: plan.id,
    planSnapshot: {
      name: plan.name,
      amountPaisa: plan.amountPaisa,
      version: plan.version,
    },
    orderId: order_id || `ORD-${Date.now()}`,
    amountPaisa: plan.amountPaisa,
    feeAmountPaisa: feePaisa,
    netAmountPaisa: netPaisa,
    provider: provider as ProviderType,
    walletId: `wal_${provider}_01`,
    offeredWalletIds: [`wal_${provider}_01`],
    reference,
    customerPhone: customer_phone,
    status: 'awaiting_payment',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
  };

  gatewayStore.createPayment(newPayment);

  const responseBody = {
    id: newPayment.id,
    order_id: newPayment.orderId,
    amount_paisa: newPayment.amountPaisa,
    currency: 'BDT',
    reference: newPayment.reference,
    provider: newPayment.provider,
    wallet: {
      provider: newPayment.provider,
      number: walletNumber,
      holder_name: merchant.name,
    },
    pay_url: `/pay/${newPayment.id}`,
    expires_at: newPayment.expiresAt,
  };

  if (idempotencyKey) {
    gatewayStore.setIdempotentResponse(idempotencyKey, 201, responseBody);
  }

  await gatewayStore.logAudit(
    merchant.name,
    'merchant',
    'CREATE_PAYMENT',
    'payment',
    newPayment.id,
    `Created payment for order ${newPayment.orderId} (Amount: Tk ${(newPayment.amountPaisa / 100).toFixed(2)})`,
    req.ip || '127.0.0.1'
  );

  return res.status(201).json(responseBody);
});

// 2. GET /v1/payments (List merchant payments)
app.get('/v1/payments', requireMerchantAuth, (req: AuthenticatedRequest, res: Response) => {
  const merchant = req.merchant!;
  const payments = gatewayStore.getAllPayments(merchant.id);
  return res.json(payments);
});

// 3. GET /v1/payments/:id
app.get('/v1/payments/:id', (req: Request, res: Response) => {
  const payment = gatewayStore.getPayment(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  return res.json(payment);
});

// 4. GET /v1/merchant/me
app.get('/v1/merchant/me', requireMerchantAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.json(req.merchant);
});

// 5. GET /v1/plans
app.get('/v1/plans', requireMerchantAuth, (req: AuthenticatedRequest, res: Response) => {
  const plans = gatewayStore.getAllPricingPlans(req.merchant!.id);
  return res.json(plans);
});

// 6. GET /v1/ledger
app.get('/v1/ledger', requireMerchantAuth, (req: AuthenticatedRequest, res: Response) => {
  const entries = gatewayStore.getLedgerEntries(req.merchant!.id);
  return res.json(entries);
});

// ==========================================
// CUSTOMER CHECKOUT ENDPOINTS
// ==========================================

// 7. GET /v1/pay/:id (Customer checkout page view)
app.get('/v1/pay/:id', (req: Request, res: Response) => {
  const payment = gatewayStore.getPayment(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment link expired or not found' });

  const attempts = gatewayStore.getPaymentAttempts(payment.id);
  const isLocked = attempts.lockedUntil ? Date.now() < attempts.lockedUntil : false;

  return res.json({
    payment,
    isLocked,
    lockedUntil: attempts.lockedUntil,
    attemptsRemaining: Math.max(0, 5 - attempts.count),
  });
});

// 8. POST /v1/pay/:id/confirm (Customer claims TrxID with anti-brute-force & atomic claim engine)
app.post('/v1/pay/:id/confirm', async (req: Request, res: Response) => {
  const payment = gatewayStore.getPayment(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });

  // Anti-brute-force lockout check
  const attempts = gatewayStore.getPaymentAttempts(payment.id);
  if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
    const remainingSeconds = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
    return res.status(429).json({
      error: `Too many failed attempts. Checkout locked for ${remainingSeconds} seconds.`,
      lockedUntil: attempts.lockedUntil,
    });
  }

  const { trx_id } = req.body;
  if (!trx_id) return res.status(400).json({ error: 'Transaction ID is required' });

  const cleanTrx = trx_id.trim().toUpperCase();
  const formatValidation = validateTrxIdFormat(cleanTrx, payment.provider);
  if (!formatValidation.isValid) {
    const updated = gatewayStore.recordPaymentAttempt(payment.id, true);
    return res.status(400).json({
      error: formatValidation.message,
      attemptsRemaining: Math.max(0, 5 - updated.count),
      isLocked: (updated.count >= 5),
    });
  }

  // Execute atomic claim procedure fn_claim_payment_v4
  const claimResult = await gatewayStore.claimPaymentV4(payment.id, cleanTrx, req.ip || '127.0.0.1');

  if (claimResult.outcome === 'illegal_transition') {
    return res.status(409).json({
      error: claimResult.errorMessage,
      payment: claimResult.payment,
    });
  }

  if (claimResult.outcome === 'already_claimed') {
    return res.status(409).json({
      outcome: 'already_claimed',
      error: claimResult.errorMessage,
      payment: claimResult.payment,
    });
  }

  if (claimResult.outcome === 'conflict') {
    return res.status(409).json({
      outcome: 'conflict',
      reviewReason: claimResult.reviewReason,
      error: claimResult.errorMessage,
      payment: claimResult.payment,
    });
  }

  if (claimResult.outcome === 'no_evidence') {
    return res.json({
      outcome: 'no_evidence',
      status: 'confirming',
      message: 'Verifying payment with the network...',
      payment: claimResult.payment,
    });
  }

  return res.json({
    outcome: 'matched',
    status: 'paid',
    payment: claimResult.payment,
  });
});

// ==========================================
// FORWARDER INGEST (MANDATORY HMAC CRYPTOGRAPHIC SIGNATURE)
// ==========================================

// 9. POST /v1/sms/webhook (Strict HMAC-SHA256 signature and monotonic sequence check)
app.post('/v1/sms/webhook', async (req: Request, res: Response) => {
  const deviceId = req.headers['x-device-id'] as string;
  const seqHeader = req.headers['x-device-seq'] as string;
  const timestampHeader = req.headers['x-device-timestamp'] as string;
  const signatureHeader = req.headers['x-device-signature'] as string;
  const clientIp = req.ip || '127.0.0.1';

  const { sender = '', raw_sms = '', sim_slot = 1, client_msg_id } = req.body;

  if (!raw_sms) {
    return res.status(400).json({ error: 'raw_sms payload is required' });
  }

  // MANDATORY SECURITY GATE: Device signature headers MUST be present!
  if (!deviceId || !seqHeader || !timestampHeader || !signatureHeader) {
    gatewayStore.recordQuarantinedSms({
      deviceId: deviceId || 'unknown',
      sender,
      rawSms: raw_sms,
      failureReason: 'Mandatory cryptographic device signature headers missing',
      clientIp,
    });
    return res.status(401).json({
      error: '401 Unauthorized: Mandatory device signature headers (x-device-id, x-device-seq, x-device-timestamp, x-device-signature) missing',
    });
  }

  const device = gatewayStore.getDevice(deviceId);
  if (!device) {
    gatewayStore.recordQuarantinedSms({
      deviceId,
      sender,
      rawSms: raw_sms,
      failureReason: `Unknown or unprovisioned device ID "${deviceId}"`,
      clientIp,
    });
    return res.status(403).json({ error: '403 Forbidden: Unrecognized device identifier' });
  }

  const seqNo = parseInt(seqHeader, 10);
  const timestamp = parseInt(timestampHeader, 10);

  const signPayload: DeviceSignPayload = {
    deviceId,
    seqNo,
    timestamp,
    rawSms: raw_sms,
  };

  // Verify HMAC-SHA256 and Monotonic sequence counter
  const verification = await verifyDeviceIngestSignature(
    device.deviceSecret,
    device.lastSeqNo,
    signPayload,
    signatureHeader,
    300 // 5-minute tolerance
  );

  if (!verification.isValid) {
    gatewayStore.recordQuarantinedSms({
      deviceId,
      sender,
      rawSms: raw_sms,
      failureReason: verification.reason || 'Cryptographic verification failure',
      clientIp,
    });

    await gatewayStore.logAudit(
      deviceId,
      'system',
      'SIGNATURE_REJECTED',
      'device',
      deviceId,
      verification.reason || 'Cryptographic signature verification failed',
      clientIp
    );

    return res.status(403).json({
      error: '403 Forbidden: Device signature verification failed',
      details: verification.reason,
    });
  }

  // Update monotonic sequence counter
  gatewayStore.updateDeviceSeq(deviceId, seqNo);

  // Parse incoming SMS using multi-provider registry
  const parsed = parseIncomingSms(raw_sms, sender, sim_slot as 1 | 2);

  if (!parsed.isValid) {
    gatewayStore.recordQuarantinedSms({
      deviceId,
      sender,
      rawSms: raw_sms,
      failureReason: parsed.error || 'Unparseable SMS structure',
      clientIp,
    });

    return res.status(422).json({
      error: 'Unparseable SMS payload',
      details: parsed.error,
    });
  }

  // Execute counterpart procedure fn_ingest_and_claim_v4
  const ingestResult = await gatewayStore.ingestAndClaimV4(
    deviceId,
    client_msg_id || `msg_${Date.now()}`,
    parsed.simSlot as 1 | 2,
    sender,
    raw_sms,
    parsed.provider as ProviderType,
    parsed.trxId,
    parsed.amountPaisa,
    parsed.refRaw || '',
    parsed.refNormalized || '',
    clientIp
  );

  if (ingestResult.outcome === 'duplicate_ignored') {
    return res.status(200).json({
      status: 'duplicate_ignored',
      message: `TrxID ${parsed.trxId} for ${parsed.provider} was already ingested.`,
      txnId: ingestResult.txnId,
    });
  }

  await gatewayStore.logAudit(
    deviceId,
    'system',
    'SMS_INGESTED',
    'incoming_txn',
    ingestResult.txnId,
    `Ingested ${parsed.provider.toUpperCase()} SMS TrxID ${parsed.trxId} (Tk ${(parsed.amountPaisa / 100).toFixed(2)}) - Outcome: ${ingestResult.outcome}`,
    clientIp
  );

  return res.status(200).json({
    received: true,
    txnId: ingestResult.txnId,
    outcome: ingestResult.outcome,
    matchedPaymentId: ingestResult.matchedPaymentId,
    parsed,
  });
});

// ==========================================
// ADMIN OPERATIONS (MFA / TOKEN PROTECTED)
// ==========================================

// 10. GET /v1/devices/status (Sanitized: NO secret leakage, masked IMEI)
app.get('/v1/devices/status', (req: Request, res: Response) => {
  const device = gatewayStore.getDevice('dev_superadmin_01');
  if (!device) return res.status(404).json({ error: 'Device not found' });

  // Sanitize hardware identifiers and secrets!
  const sanitized = {
    id: device.id,
    name: device.name,
    imei_masked: device.imei ? device.imei.slice(0, 6) + '******' + device.imei.slice(-3) : undefined,
    appVersion: device.appVersion,
    batteryLevel: device.batteryLevel,
    isCharging: device.isCharging,
    status: device.status,
    lastHeartbeat: device.lastHeartbeat,
    lastSeenLatencyMs: device.lastSeenLatencyMs,
    lastSeqNo: device.lastSeqNo,
    sim1: device.sim1,
    sim2: device.sim2,
  };

  return res.json(sanitized);
});

// 11. POST /v1/devices/heartbeat
app.post('/v1/devices/heartbeat', requireAdminAuth, (req: Request, res: Response) => {
  const { battery_level, is_charging, latency_ms } = req.body;
  const device = gatewayStore.getDevice('dev_superadmin_01');
  if (!device) return res.status(404).json({ error: 'Device not found' });

  device.lastHeartbeat = new Date().toISOString();
  if (battery_level !== undefined) device.batteryLevel = battery_level;
  if (is_charging !== undefined) device.isCharging = is_charging;
  if (latency_ms !== undefined) device.lastSeenLatencyMs = latency_ms;

  return res.json({ status: 'ok', lastHeartbeat: device.lastHeartbeat });
});

// 12. GET /v1/audit/logs (Protected by Admin Authentication)
app.get('/v1/audit/logs', requireAdminAuth, (_req: Request, res: Response) => {
  return res.json(gatewayStore.getAuditChain());
});

// 13. POST /v1/outbox/process (Protected by Admin Authentication)
app.post('/v1/outbox/process', requireAdminAuth, async (_req: Request, res: Response) => {
  const result = await gatewayStore.processOutboxBatch(20);
  return res.json(result);
});

// 14. GET /v1/quarantine (Review queue for quarantined SMS)
app.get('/v1/quarantine', requireAdminAuth, (_req: Request, res: Response) => {
  return res.json(gatewayStore.getQuarantinedSms());
});

// ==========================================
// VITE SPA DEV SERVER MOUNTING
// ==========================================
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[PayGate API] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
