-- ============================================================================
-- PayGate Platform v3.1 — Core Production Database Schema & Migration
-- Database Engine: PostgreSQL 15+ / Supabase
-- Modules: Multi-tenant Merchant SaaS, Pricing Plans, Wallet Fleet,
--          Forwarded SMS Ingestion, Atomic Matching Engine, Double-Entry Ledger,
--          Maker-Checker Payouts, HMAC Webhook Deliveries, Audit Log.
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom Enumerated Types
CREATE TYPE provider_type AS ENUM ('bkash', 'nagad', 'rocket');

CREATE TYPE payment_status AS ENUM (
  'created',
  'awaiting_payment',
  'confirming',
  'paid',
  'expired',
  'cancelled',
  'needs_review'
);

CREATE TYPE review_reason AS ENUM (
  'underpaid',
  'overpaid',
  'wrong_wallet',
  'late_after_expiry',
  'duplicate_trx_id',
  'unmatched_reference',
  'manual_hold'
);

CREATE TYPE kyb_status AS ENUM (
  'pending',
  'verified',
  'rejected',
  'under_review'
);

CREATE TYPE payout_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'completed'
);

CREATE TYPE payout_account_type AS ENUM (
  'bank',
  'mfs'
);

CREATE TYPE device_status AS ENUM (
  'online',
  'offline',
  'draining',
  'revoked'
);

CREATE TYPE wallet_status AS ENUM (
  'active',
  'draining',
  'disabled',
  'limit_reached'
);

CREATE TYPE ledger_entry_type AS ENUM (
  'payin_credit',
  'platform_fee_debit',
  'payout_debit',
  'reversal_debit',
  'adjustment'
);

CREATE TYPE webhook_delivery_status AS ENUM (
  'pending',
  'delivered',
  'failed',
  'retrying'
);

-- ============================================================================
-- 3. Core Tables
-- ============================================================================

-- 3.1 Merchants Table
CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  kyb_status kyb_status NOT NULL DEFAULT 'verified',
  payout_type payout_account_type NOT NULL DEFAULT 'bank',
  payout_account_number VARCHAR(64) NOT NULL,
  payout_account_name VARCHAR(255) NOT NULL,
  payout_bank_name VARCHAR(128),
  payout_routing_number VARCHAR(32),
  fee_rate_bps INT NOT NULL DEFAULT 500 CHECK (fee_rate_bps >= 0 AND fee_rate_bps <= 3000), -- 500 = 5.00%
  risk_tier VARCHAR(32) NOT NULL DEFAULT 'tier_1',
  live_api_key VARCHAR(128) NOT NULL UNIQUE,
  test_api_key VARCHAR(128) NOT NULL UNIQUE,
  webhook_secret VARCHAR(128) NOT NULL,
  webhook_url TEXT,
  auto_confirm_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.2 Pricing Plans Table (Server-Authoritative, Versioned)
CREATE TABLE IF NOT EXISTS pricing_plans (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'BDT',
  version INT NOT NULL DEFAULT 1,
  external_sku VARCHAR(64) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_merchant_sku_version UNIQUE (merchant_id, external_sku, version)
);

-- 3.3 Devices Table (Android SMS Forwarder Fleet)
CREATE TABLE IF NOT EXISTS devices (
  id VARCHAR(64) PRIMARY KEY,
  label VARCHAR(128) NOT NULL,
  model VARCHAR(128),
  status device_status NOT NULL DEFAULT 'online',
  battery_level INT NOT NULL DEFAULT 100 CHECK (battery_level BETWEEN 0 AND 100),
  is_charging BOOLEAN NOT NULL DEFAULT FALSE,
  app_version VARCHAR(32) NOT NULL DEFAULT '3.0.0',
  sms_queue_depth INT NOT NULL DEFAULT 0,
  sim1_operator VARCHAR(64),
  sim2_operator VARCHAR(64),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.4 Wallets Table (MFS SIM Pool)
CREATE TABLE IF NOT EXISTS wallets (
  id VARCHAR(64) PRIMARY KEY,
  provider provider_type NOT NULL,
  msisdn VARCHAR(24) NOT NULL UNIQUE,
  account_holder VARCHAR(128) NOT NULL,
  device_id VARCHAR(64) REFERENCES devices(id) ON DELETE SET NULL,
  sim_slot INT NOT NULL CHECK (sim_slot IN (1, 2)),
  status wallet_status NOT NULL DEFAULT 'active',
  daily_inflow_paisa BIGINT NOT NULL DEFAULT 0,
  daily_limit_paisa BIGINT NOT NULL DEFAULT 3000000, -- Tk 30,000.00 daily velocity limit
  current_balance_paisa BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.5 Payments Table (Master Transaction Ledger)
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  plan_id VARCHAR(64) NOT NULL REFERENCES pricing_plans(id),
  plan_snapshot JSONB NOT NULL,
  order_id VARCHAR(128) NOT NULL,
  customer_phone VARCHAR(24),
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  fee_amount_paisa BIGINT NOT NULL CHECK (fee_amount_paisa >= 0),
  net_amount_paisa BIGINT NOT NULL CHECK (net_amount_paisa >= 0),
  provider provider_type NOT NULL,
  assigned_wallet_id VARCHAR(64) NOT NULL REFERENCES wallets(id),
  reference VARCHAR(8) NOT NULL UNIQUE,
  status payment_status NOT NULL DEFAULT 'awaiting_payment',
  submitted_trx_id VARCHAR(64),
  submitted_at TIMESTAMPTZ,
  matched_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  review_reason review_reason,
  review_notes TEXT,
  idempotency_key VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.6 Incoming Transactions Table (Forwarded SMS Ingest Log)
CREATE TABLE IF NOT EXISTS incoming_txns (
  id VARCHAR(64) PRIMARY KEY,
  device_id VARCHAR(64) NOT NULL REFERENCES devices(id),
  client_msg_id VARCHAR(64),
  sim_slot INT NOT NULL,
  sender_address VARCHAR(64) NOT NULL,
  raw_sms_body TEXT NOT NULL,
  provider provider_type NOT NULL,
  trx_id VARCHAR(64) NOT NULL UNIQUE,
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  ref_raw VARCHAR(128),
  ref_normalized VARCHAR(8),
  counterparty_msisdn VARCHAR(24),
  received_at TIMESTAMPTZ NOT NULL,
  matched_payment_id VARCHAR(64) REFERENCES payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.7 Double-Entry Ledger Entries Table
CREATE TABLE IF NOT EXISTS ledger_entries (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  payment_id VARCHAR(64) REFERENCES payments(id) ON DELETE SET NULL,
  payout_id VARCHAR(64),
  type ledger_entry_type NOT NULL,
  debit_paisa BIGINT NOT NULL DEFAULT 0 CHECK (debit_paisa >= 0),
  credit_paisa BIGINT NOT NULL DEFAULT 0 CHECK (credit_paisa >= 0),
  balance_paisa_after BIGINT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3.8 Payout Disbursements Table (Maker-Checker Workflow)
CREATE TABLE IF NOT EXISTS payouts (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  reference_id VARCHAR(64) NOT NULL UNIQUE,
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa >= 100000), -- Minimum Tk 1,000.00
  destination_account JSONB NOT NULL,
  status payout_status NOT NULL DEFAULT 'pending',
  maker_id VARCHAR(128) NOT NULL,
  checker_id VARCHAR(128),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- 3.9 Webhook Delivery Logs Table
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  payment_id VARCHAR(64) REFERENCES payments(id) ON DELETE SET NULL,
  event VARCHAR(64) NOT NULL,
  url TEXT NOT NULL,
  status webhook_delivery_status NOT NULL DEFAULT 'pending',
  status_code INT,
  attempt INT NOT NULL DEFAULT 1,
  max_attempts INT NOT NULL DEFAULT 7,
  last_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_retry_at TIMESTAMPTZ,
  payload JSONB NOT NULL,
  signature_header TEXT NOT NULL
);

-- 3.10 System Audit Log Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  actor VARCHAR(128) NOT NULL,
  action VARCHAR(128) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. High-Performance B-Tree & Functional Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_payments_merchant_status ON payments (merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments (reference);
CREATE INDEX IF NOT EXISTS idx_payments_submitted_trx ON payments (submitted_trx_id) WHERE submitted_trx_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_expires_at ON payments (expires_at) WHERE status = 'awaiting_payment';
CREATE INDEX IF NOT EXISTS idx_payments_wallet_status ON payments (assigned_wallet_id, status);

CREATE INDEX IF NOT EXISTS idx_incoming_txns_trx_id ON incoming_txns (trx_id);
CREATE INDEX IF NOT EXISTS idx_incoming_txns_ref_normalized ON incoming_txns (ref_normalized);
CREATE INDEX IF NOT EXISTS idx_incoming_txns_received_at ON incoming_txns (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_merchant_created ON ledger_entries (merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_merchant_status ON payouts (merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_merchant ON webhook_deliveries (merchant_id, status);

-- ============================================================================
-- 5. Stored Procedures & Triggers
-- ============================================================================

-- 5.1 Automatic timestamp updater
CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_merchants_updated_at
BEFORE UPDATE ON merchants
FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_pricing_plans_updated_at
BEFORE UPDATE ON pricing_plans
FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_wallets_updated_at
BEFORE UPDATE ON wallets
FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION fn_update_timestamp();

-- 5.2 Atomic Matching Engine Evaluation Function
CREATE OR REPLACE FUNCTION fn_match_payment_claim(
  p_payment_id VARCHAR(64),
  p_claim_trx_id VARCHAR(64)
)
RETURNS TABLE (
  match_outcome VARCHAR(32),
  matched_amount_paisa BIGINT,
  review_reason review_reason
) AS $$
DECLARE
  v_payment payments%ROWTYPE;
  v_incoming incoming_txns%ROWTYPE;
BEGIN
  -- Lock payment row for update
  SELECT * INTO v_payment FROM payments WHERE id = p_payment_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment % not found', p_payment_id;
  END IF;

  -- Locate matching SMS transaction evidence
  SELECT * INTO v_incoming 
  FROM incoming_txns 
  WHERE trx_id = UPPER(TRIM(p_claim_trx_id))
  FOR UPDATE;

  IF NOT FOUND THEN
    -- No SMS evidence yet; keep confirming
    RETURN QUERY SELECT 'no_evidence'::VARCHAR(32), 0::BIGINT, NULL::review_reason;
    RETURN;
  END IF;

  -- Check if evidence was already claimed by another paid payment
  IF v_incoming.matched_payment_id IS NOT NULL AND v_incoming.matched_payment_id <> p_payment_id THEN
    UPDATE payments 
    SET status = 'needs_review', 
        review_reason = 'duplicate_trx_id',
        review_notes = 'TrxID was already claimed by payment ' || v_incoming.matched_payment_id
    WHERE id = p_payment_id;
    
    RETURN QUERY SELECT 'conflict'::VARCHAR(32), v_incoming.amount_paisa, 'duplicate_trx_id'::review_reason;
    RETURN;
  END IF;

  -- Check underpayment
  IF v_incoming.amount_paisa < v_payment.amount_paisa THEN
    UPDATE payments 
    SET status = 'needs_review', 
        review_reason = 'underpaid',
        review_notes = 'Expected ' || v_payment.amount_paisa || ' paisa but received ' || v_incoming.amount_paisa || ' paisa'
    WHERE id = p_payment_id;
    
    RETURN QUERY SELECT 'conflict'::VARCHAR(32), v_incoming.amount_paisa, 'underpaid'::review_reason;
    RETURN;
  END IF;

  -- Match verified! Mark payment paid and attach incoming txn
  UPDATE payments
  SET status = 'paid',
      submitted_trx_id = v_incoming.trx_id,
      matched_at = NOW(),
      review_reason = NULL
  WHERE id = p_payment_id;

  UPDATE incoming_txns
  SET matched_payment_id = p_payment_id
  WHERE id = v_incoming.id;

  RETURN QUERY SELECT 'matched'::VARCHAR(32), v_incoming.amount_paisa, NULL::review_reason;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Row Level Security (RLS) Configuration
-- ============================================================================

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE incoming_txns ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Merchants can read only their own records
CREATE POLICY merchants_read ON merchants
  FOR SELECT
  USING (id = auth.uid());

-- Policy: Merchants can update non-critical business profile fields only
CREATE POLICY merchants_update_profile ON merchants
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- Prevent merchants from tampering with their own fees, status, or balances
    fee_rate_bps IS NOT DISTINCT FROM (SELECT m.fee_rate_bps FROM merchants m WHERE m.id = auth.uid()) AND
    kyb_status IS NOT DISTINCT FROM (SELECT m.kyb_status FROM merchants m WHERE m.id = auth.uid()) AND
    status IS NOT DISTINCT FROM (SELECT m.status FROM merchants m WHERE m.id = auth.uid())
  );

CREATE POLICY merchant_pricing_plans ON pricing_plans
  FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

CREATE POLICY merchant_payments ON payments
  FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

CREATE POLICY merchant_ledger ON ledger_entries
  FOR SELECT
  USING (merchant_id = auth.uid());

CREATE POLICY merchant_payouts ON payouts
  FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

CREATE POLICY merchant_webhooks ON webhook_deliveries
  FOR ALL
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- Service role bypass for automated phone fleet and matching ingest
CREATE POLICY service_role_bypass_incoming ON incoming_txns
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 7. Seed Data
-- ============================================================================

INSERT INTO merchants (
  id, name, status, kyb_status, payout_type, payout_account_number, payout_account_name, payout_bank_name, payout_routing_number,
  fee_rate_bps, risk_tier, live_api_key, test_api_key, webhook_secret, webhook_url, auto_confirm_enabled
) VALUES (
  '018a9020-0000-0000-0000-000000000001',
  'DeshiCart Technologies Ltd.',
  'active',
  'verified',
  'bank',
  '1081520038921',
  'DeshiCart Technologies Ltd',
  'Eastern Bank PLC',
  '095261320',
  500,
  'tier_1',
  'sk_live_pg_99210a48b3c109df291c',
  'sk_test_pg_demo88129a00b12',
  'whsec_e9f82b71940a12cf498a1293',
  'https://merchant-api.deshicart.com.bd/api/webhooks/paygate',
  TRUE
) ON CONFLICT (id) DO NOTHING;

INSERT INTO devices (id, label, model, status, battery_level, is_charging, sim1_operator, sim2_operator)
VALUES 
  ('dev_pixel_01', 'Primary Fleet Hub (Gulshan)', 'Google Pixel 8a', 'online', 94, TRUE, 'Grameenphone (bKash)', 'Robi (Nagad)'),
  ('dev_samsung_02', 'Secondary Ingest Unit (Banani)', 'Samsung Galaxy A35', 'online', 82, FALSE, 'Banglalink (Rocket)', 'Grameenphone (bKash)')
ON CONFLICT (id) DO NOTHING;

INSERT INTO wallets (id, provider, msisdn, account_holder, device_id, sim_slot, status, daily_inflow_paisa, daily_limit_paisa, current_balance_paisa)
VALUES
  ('wal_bkash_01', 'bkash', '01712-984432', 'PayGate Pool Alpha', 'dev_pixel_01', 1, 'active', 650000, 3000000, 1850000),
  ('wal_nagad_01', 'nagad', '01911-543210', 'PayGate Pool Beta', 'dev_pixel_01', 2, 'active', 420000, 3000000, 940000),
  ('wal_rocket_01', 'rocket', '01633-889922', 'PayGate Pool Gamma', 'dev_samsung_02', 1, 'active', 150000, 3000000, 480000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO pricing_plans (id, merchant_id, name, amount_paisa, currency, version, external_sku, description)
VALUES
  ('plan_pro_monthly', '018a9020-0000-0000-0000-000000000001', 'Pro Membership (Monthly)', 120000, 'BDT', 1, 'SKU-PRO-M', '30-day access to Pro tier features'),
  ('plan_starter_single', '018a9020-0000-0000-0000-000000000001', 'Starter License Pass', 45000, 'BDT', 1, 'SKU-STARTER-1', 'Single site lifetime personal license')
ON CONFLICT (id) DO NOTHING;
