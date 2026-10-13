/**
 * PayGate Platform v4.0 Core Domain Models & Types
 */

export type ProviderType = 'bkash' | 'nagad' | 'rocket' | 'upay' | 'cellfin';

export type UserRole = 'merchant' | 'admin';

export type PaymentStatus =
  | 'created'
  | 'awaiting_payment'
  | 'confirming'
  | 'paid'
  | 'expired'
  | 'cancelled'
  | 'needs_review';

export type ReviewReason =
  | 'underpaid'
  | 'overpaid'
  | 'wrong_wallet'
  | 'conflict'
  | 'late_payment'
  | 'duplicate_trx_id'
  | 'unmatched';

export type MatchedByType = 'trxid' | 'trxid+reference' | 'manual_review' | 'auto_confirm';

export type WalletStatus = 'active' | 'draining' | 'disabled';
export type DeviceStatus = 'online' | 'offline' | 'revoked';

export type PayoutStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export interface PayoutAccount {
  type: 'bank' | 'mfs';
  provider?: ProviderType; // for MFS
  accountNumber: string;
  accountName: string;
  bankName?: string;
  branchName?: string;
  routingNumber?: string;
}

export interface Merchant {
  id: string;
  name: string;
  status: 'active' | 'suspended' | 'pending';
  kybStatus: 'verified' | 'in_review' | 'rejected';
  payoutAccount: PayoutAccount;
  feeRateBps: number; // default 500 = 5%
  riskTier: 'standard' | 'low_risk' | 'high_volume';
  webhookSecret: string;
  webhookUrl: string;
  autoConfirm: boolean;
  balancePaisa: number;
  heldPaisa: number;
  testApiKey: string;
  liveApiKey: string;
}

export type MerchantUserRole = 'super_admin' | 'merchant_admin' | 'merchant_operator' | 'merchant_viewer';

export interface MerchantAuth {
  id: string; // UUID
  merchantId: string; // UUID
  email: string;
  passwordHash: string;
  salt?: string;
  role: MerchantUserRole;
  isActive: boolean;
  mfaEnabled: boolean;
  mfaSecretEncrypted?: string;
  mfaBackupCodes?: string[];
  apiKeyHash?: string;
  apiKeyPrefix?: string;
  failedLoginAttempts: number;
  lockedUntil?: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  passwordChangedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PricingPlan {
  id: string;
  merchantId: string;
  name: string;
  amountPaisa: number; // stored in paisa (1 Tk = 100 paisa)
  currency: 'BDT';
  externalSku: string;
  version: number;
  status: 'active' | 'archived';
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  provider: ProviderType;
  msisdn: string; // phone number e.g. 01712-750278
  holderName: string;
  deviceId: string;
  simSlot: 1 | 2;
  status: WalletStatus;
  dailyLimitPaisa: number;
  monthlyLimitPaisa: number;
  todayTotalPaisa: number;
  concurrencyCap: number;
  activePendingCount: number;
  lastAssignedAt: string;
  currentBalancePaisa: number;
}

export type AppDomain = 'merchant' | 'admin' | 'api';

export interface IpVerificationAttempt {
  id: string;
  ip: string;
  timestamp: string;
  status: 'allowed' | 'blocked';
  reason: string;
  action: 'heartbeat' | 'sms_forward' | 'ping' | 'auth_check';
}

export interface SuperAdminDevice {
  id: string;
  name: string;
  model: string;
  token: string;
  status: 'online' | 'offline';
  lastPingAt: string;
  battery: number;
  sim1Provider: ProviderType;
  sim1Msisdn: string;
  sim2Provider: ProviderType;
  sim2Msisdn: string;
  whitelistedIps: string[];
  isIpEnforced: boolean;
  activeClientIp: string;
  verificationLogs?: IpVerificationAttempt[];
}

export interface DeviceInfo {
  id: string;
  name: string;
  imei: string;
  appVersion: string;
  batteryLevel: number;
  isCharging: boolean;
  status: 'online' | 'offline';
  lastHeartbeat: string;
  lastSeenLatencyMs: number;
  deviceSecret: string;
  lastSeqNo: number;
  publicKey?: string;
  sim1: {
    slot: 1;
    operator: string;
    phoneNumber: string;
    status: 'active' | 'disabled';
    signalStrength: number;
  };
  sim2: {
    slot: 2;
    operator: string;
    phoneNumber: string;
    status: 'active' | 'disabled';
    signalStrength: number;
  };
  ipWhitelist: string[];
  activeClientIp: string;
}

export interface Device {
  id: string;
  name: string;
  model: string;
  appVersion: string;
  status: DeviceStatus;
  lastHeartbeatAt: string;
  battery: number;
  queueDepth: number;
  sim1WalletId?: string;
  sim2WalletId?: string;
  permissions: {
    smsRead: boolean;
    smsReceive: boolean;
    batteryOptimizationDisabled: boolean;
  };
}

export interface Payment {
  id: string;
  merchantId: string;
  planId: string;
  planSnapshot: {
    name: string;
    amountPaisa: number;
    version?: number;
  };
  orderId: string;
  provider: ProviderType;
  walletId: string;
  offeredWalletIds: string[];
  amountPaisa: number;
  feeAmountPaisa: number;
  netAmountPaisa: number;
  reference: string; // 8 characters e.g. K7M4X2QH
  status: PaymentStatus;
  reviewReason?: ReviewReason;
  matchedBy?: MatchedByType;
  submittedTrxId?: string;
  confirmedAt?: string;
  idempotencyKey?: string;
  expiresAt: string;
  paidAt?: string;
  createdAt: string;
  customerPhone?: string;
  callbackUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
  staffResolutionNote?: string;
}

export interface IncomingTxn {
  id: string;
  provider: ProviderType;
  trxId: string;
  walletId: string;
  amountPaisa: number;
  balanceAfterPaisa: number;
  refRaw: string;
  refNormalized: string;
  rawSms: string;
  clientMsgId: string;
  simSlot: 1 | 2;
  claimedPaymentId?: string;
  flags?: string[];
  receivedAt: string;
  senderPhone?: string;
}

export interface LedgerEntry {
  id: string;
  merchantId: string;
  paymentId?: string;
  payoutId?: string;
  type: 'pay_in' | 'fee' | 'merchant_payable' | 'payout' | 'adjustment';
  debitPaisa: number;
  creditPaisa: number;
  balancePaisaAfter: number;
  description: string;
  createdAt: string;
}

export interface Payout {
  id: string;
  merchantId: string;
  amountPaisa: number;
  feePaisa: number;
  netAmountPaisa: number;
  status: PayoutStatus;
  payoutAccount: PayoutAccount;
  makerId: string;
  checkerId?: string;
  requestedAt: string;
  approvedAt?: string;
  rejectionReason?: string;
  referenceId: string;
  batchId?: string;
}

export type PayoutBatchStatus = 'created' | 'verified' | 'approved' | 'disbursed';

export interface PayoutBatch {
  id: string;
  batchNumber: string;
  totalAmountPaisa: number;
  totalFeePaisa: number;
  payoutCount: number;
  merchantCount: number;
  status: PayoutBatchStatus;
  rail: 'beftn' | 'npsb' | 'mfs';
  payoutIds: string[];
  makerActor: string;
  checkerActor?: string;
  createdAt: string;
  verifiedAt?: string;
  approvedAt?: string;
  clearingReference?: string;
}

export interface WebhookDelivery {
  id: string;
  paymentId: string;
  event: 'payment.paid' | 'payment.expired' | 'payment.needs_review' | 'payment.cancelled';
  url: string;
  status: 'success' | 'failed' | 'retrying';
  attempt: number;
  maxAttempts: number;
  lastAttemptAt: string;
  payload: Record<string, any>;
  signature: string;
  statusCode: number;
  responseBody?: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  role: 'owner' | 'staff' | 'developer' | 'system';
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ip: string;
  createdAt: string;
}

export interface ParsedSmsResult {
  provider: ProviderType;
  trxId: string;
  amountPaisa: number;
  balanceAfterPaisa?: number;
  refRaw?: string;
  refNormalized?: string;
  rawSms?: string;
  sender: string;
  simSlot: 1 | 2;
  timestamp: string;
  isValid: boolean;
  error?: string;
}
