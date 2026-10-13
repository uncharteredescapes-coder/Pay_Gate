-- ============================================================================
-- PayGate Platform v3.1 — Production Database Schema Reference
-- For Supabase migrations, see: supabase/migrations/20261013000001_paygate_v3_core_schema.sql
-- ============================================================================

-- Core Enums
CREATE TYPE provider_type AS ENUM ('bkash', 'nagad', 'rocket', 'upay', 'cellfin');
CREATE TYPE payment_status AS ENUM ('created', 'awaiting_payment', 'confirming', 'paid', 'expired', 'cancelled', 'needs_review');
CREATE TYPE review_reason AS ENUM ('underpaid', 'overpaid', 'wrong_wallet', 'late_after_expiry', 'duplicate_trx_id', 'unmatched_reference', 'manual_hold');
CREATE TYPE kyb_status AS ENUM ('pending', 'verified', 'rejected', 'under_review');
CREATE TYPE payout_status AS ENUM ('pending', 'approved', 'rejected', 'completed');
CREATE TYPE payout_account_type AS ENUM ('bank', 'mfs');
CREATE TYPE device_status AS ENUM ('online', 'offline', 'draining', 'revoked');
CREATE TYPE wallet_status AS ENUM ('active', 'draining', 'disabled', 'limit_reached');
CREATE TYPE ledger_entry_type AS ENUM ('payin_credit', 'platform_fee_debit', 'payout_debit', 'reversal_debit', 'adjustment');

-- Merchants
CREATE TABLE merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  kyb_status kyb_status NOT NULL DEFAULT 'verified',
  payout_type payout_account_type NOT NULL DEFAULT 'bank',
  payout_account_number VARCHAR(64) NOT NULL,
  payout_account_name VARCHAR(255) NOT NULL,
  payout_bank_name VARCHAR(128),
  payout_routing_number VARCHAR(32),
  fee_rate_bps INT NOT NULL DEFAULT 500, -- 5.00%
  risk_tier VARCHAR(32) NOT NULL DEFAULT 'tier_1',
  live_api_key VARCHAR(128) NOT NULL UNIQUE,
  test_api_key VARCHAR(128) NOT NULL UNIQUE,
  webhook_secret VARCHAR(128) NOT NULL,
  webhook_url TEXT,
  balance_paisa BIGINT NOT NULL DEFAULT 0,
  held_paisa BIGINT NOT NULL DEFAULT 0,
  auto_confirm_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Merchant Authentication & User Credentials
CREATE TYPE merchant_user_role AS ENUM ('super_admin', 'merchant_admin', 'merchant_operator', 'merchant_viewer');

CREATE TABLE merchant_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT,
  role merchant_user_role NOT NULL DEFAULT 'merchant_admin',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret_encrypted TEXT,
  mfa_backup_codes TEXT[] DEFAULT '{}',
  api_key_hash TEXT,
  api_key_prefix VARCHAR(16),
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  last_login_ip VARCHAR(45),
  password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pricing Plans (Server-Authoritative in Paisa)
CREATE TABLE pricing_plans (
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

-- Devices (Super Admin & Field SMS Ingest Fleet)
CREATE TABLE devices (
  id VARCHAR(64) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  model VARCHAR(128) NOT NULL,
  imei VARCHAR(64),
  status device_status NOT NULL DEFAULT 'online',
  battery_level INT NOT NULL DEFAULT 100,
  is_charging BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seq_no BIGINT NOT NULL DEFAULT 0,
  secret_hash TEXT NOT NULL,
  sim1_operator VARCHAR(64),
  sim2_operator VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Wallets
CREATE TABLE wallets (
  id VARCHAR(64) PRIMARY KEY,
  provider provider_type NOT NULL,
  msisdn VARCHAR(24) NOT NULL,
  account_holder VARCHAR(255) NOT NULL,
  device_id VARCHAR(64) REFERENCES devices(id),
  sim_slot INT NOT NULL,
  status wallet_status NOT NULL DEFAULT 'active',
  daily_inflow_paisa BIGINT NOT NULL DEFAULT 0,
  daily_limit_paisa BIGINT NOT NULL DEFAULT 3000000,
  current_balance_paisa BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payments (Core Transaction Claim)
CREATE TABLE payments (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  plan_id VARCHAR(64) NOT NULL REFERENCES pricing_plans(id),
  plan_snapshot JSONB NOT NULL,
  order_id VARCHAR(128) NOT NULL,
  customer_phone VARCHAR(24),
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  fee_amount_paisa BIGINT NOT NULL,
  net_amount_paisa BIGINT NOT NULL,
  provider provider_type NOT NULL,
  assigned_wallet_id VARCHAR(64) NOT NULL,
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

-- Incoming Transactions (Forwarded SMS Ingest)
CREATE TABLE incoming_txns (
  id VARCHAR(64) PRIMARY KEY,
  device_id VARCHAR(64) NOT NULL REFERENCES devices(id),
  client_msg_id VARCHAR(64),
  sim_slot INT NOT NULL,
  sender_address VARCHAR(64) NOT NULL,
  raw_sms_body TEXT NOT NULL,
  provider provider_type NOT NULL,
  trx_id VARCHAR(64) NOT NULL UNIQUE,
  amount_paisa BIGINT NOT NULL,
  ref_raw VARCHAR(128),
  ref_normalized VARCHAR(8),
  counterparty_msisdn VARCHAR(24),
  received_at TIMESTAMPTZ NOT NULL,
  matched_payment_id VARCHAR(64) REFERENCES payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactional Outbox
CREATE TABLE outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  payment_id VARCHAR(64) REFERENCES payments(id) ON DELETE CASCADE,
  event VARCHAR(64) NOT NULL,
  url TEXT NOT NULL,
  payload JSONB NOT NULL,
  signature_header TEXT NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 7,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ledger Entries (Double-Entry Bookkeeping)
CREATE TABLE ledger_entries (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  payment_id VARCHAR(64) REFERENCES payments(id),
  payout_id VARCHAR(64),
  type ledger_entry_type NOT NULL,
  debit_paisa BIGINT NOT NULL DEFAULT 0,
  credit_paisa BIGINT NOT NULL DEFAULT 0,
  balance_paisa_after BIGINT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payouts
CREATE TABLE payouts (
  id VARCHAR(64) PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  reference_id VARCHAR(64) NOT NULL UNIQUE,
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa >= 100000), -- Tk 1,000 threshold
  destination_account JSONB NOT NULL,
  status payout_status NOT NULL DEFAULT 'pending',
  maker_id VARCHAR(128) NOT NULL,
  checker_id VARCHAR(128),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Quarantined SMS (Failed parses, untrusted senders, signature rejections)
CREATE TABLE quarantined_sms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id VARCHAR(64),
  sender VARCHAR(64),
  raw_sms TEXT NOT NULL,
  failure_reason TEXT NOT NULL,
  client_ip VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cryptographically Chained Audit Trail (Immutable & Append-Only)
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_no BIGINT GENERATED ALWAYS AS IDENTITY,
  merchant_id UUID REFERENCES merchants(id) ON DELETE SET NULL,
  actor VARCHAR(128) NOT NULL,
  actor_id UUID,
  actor_type VARCHAR(32) NOT NULL DEFAULT 'system',
  action VARCHAR(128) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  previous_hash TEXT NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
  entry_hash TEXT NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce Immutability on Audit Logs
CREATE OR REPLACE FUNCTION fn_prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cryptographically chained. Modifying or deleting audit entries is prohibited.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION fn_prevent_audit_log_mutation();

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE incoming_txns ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE quarantined_sms ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Merchant Auth Policies
CREATE POLICY merchant_auth_service ON merchant_auth FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY merchant_auth_admin ON merchant_auth FOR ALL TO authenticated USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin')) WITH CHECK ((auth.jwt() ->> 'role') IN ('super_admin', 'admin'));
CREATE POLICY merchant_auth_self_read ON merchant_auth FOR SELECT TO authenticated USING (merchant_id = auth.uid() OR id = auth.uid());
CREATE POLICY merchant_auth_self_update ON merchant_auth FOR UPDATE TO authenticated USING (merchant_id = auth.uid() OR id = auth.uid()) WITH CHECK ((merchant_id = auth.uid() OR id = auth.uid()) AND role = (SELECT ma.role FROM merchant_auth ma WHERE ma.id = merchant_auth.id));

-- Devices Policies
CREATE POLICY devices_service ON devices FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY devices_admin ON devices FOR ALL TO authenticated USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin')) WITH CHECK ((auth.jwt() ->> 'role') IN ('super_admin', 'admin'));
CREATE POLICY devices_read ON devices FOR SELECT TO authenticated USING (status <> 'revoked');

-- Incoming Txns Policies
CREATE POLICY incoming_txns_service ON incoming_txns FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY incoming_txns_admin ON incoming_txns FOR SELECT TO authenticated USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin'));
CREATE POLICY incoming_txns_merchant ON incoming_txns FOR SELECT TO authenticated USING (matched_payment_id IN (SELECT p.id FROM payments p WHERE p.merchant_id = auth.uid()) OR merchant_id = auth.uid());

-- Audit Logs Policies
CREATE POLICY audit_logs_service ON audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY audit_logs_admin ON audit_logs FOR SELECT TO authenticated USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin'));
CREATE POLICY audit_logs_merchant ON audit_logs FOR SELECT TO authenticated USING (merchant_id = auth.uid());
CREATE POLICY audit_logs_insert ON audit_logs FOR INSERT TO authenticated WITH CHECK (merchant_id IS NULL OR merchant_id = auth.uid());

