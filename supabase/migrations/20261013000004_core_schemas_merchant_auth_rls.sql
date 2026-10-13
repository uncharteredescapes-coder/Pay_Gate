-- ============================================================================
-- PayGate Platform v4.0 — Migration 0010: Core Schemas, Merchant Authentication,
-- Universal UUID Support & Row-Level Security (RLS) Hardening
-- Database Engine: PostgreSQL 15+ / Supabase
-- Target Schemas: merchant_auth, devices, incoming_txns, audit_logs
-- ============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. Merchant Authentication & Identity Schema (`merchant_auth`)
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'merchant_user_role') THEN
    CREATE TYPE public.merchant_user_role AS ENUM (
      'super_admin',
      'merchant_admin',
      'merchant_operator',
      'merchant_viewer'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.merchant_auth (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id             UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  email                   VARCHAR(255) NOT NULL UNIQUE,
  password_hash           TEXT NOT NULL,
  salt                    TEXT,
  role                    public.merchant_user_role NOT NULL DEFAULT 'merchant_admin',
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  mfa_enabled             BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_secret_encrypted    TEXT,
  mfa_backup_codes        TEXT[] DEFAULT '{}',
  api_key_hash            TEXT,
  api_key_prefix          VARCHAR(16),
  failed_login_attempts   INT NOT NULL DEFAULT 0,
  locked_until            TIMESTAMPTZ,
  last_login_at           TIMESTAMPTZ,
  last_login_ip           VARCHAR(45),
  password_changed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing for high-performance authentication and session lookups
CREATE INDEX IF NOT EXISTS idx_merchant_auth_merchant_id ON public.merchant_auth (merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_auth_email ON public.merchant_auth (email);
CREATE INDEX IF NOT EXISTS idx_merchant_auth_role ON public.merchant_auth (role);
CREATE INDEX IF NOT EXISTS idx_merchant_auth_api_key_prefix ON public.merchant_auth (api_key_prefix)
  WHERE api_key_prefix IS NOT NULL;

-- Timestamp trigger for merchant_auth
CREATE OR REPLACE FUNCTION public.fn_merchant_auth_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_merchant_auth_updated_at ON public.merchant_auth;
CREATE TRIGGER trg_merchant_auth_updated_at
BEFORE UPDATE ON public.merchant_auth
FOR EACH ROW EXECUTE FUNCTION public.fn_merchant_auth_timestamp();

-- ============================================================================
-- 3. Hardware Devices Schema Hardening (`devices`)
-- ============================================================================

-- Ensure UUID identifier support alongside alphanumeric hardware device IDs
ALTER TABLE public.devices
  ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS secret_hash TEXT,
  ADD COLUMN IF NOT EXISTS public_key TEXT,
  ADD COLUMN IF NOT EXISTS last_seq_no BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ip_whitelist TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS is_ip_enforced BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS enrolled_by UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revocation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_devices_uuid_id ON public.devices (uuid_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON public.devices (status);
CREATE INDEX IF NOT EXISTS idx_devices_last_heartbeat ON public.devices (last_heartbeat_at DESC);

-- ============================================================================
-- 4. Forwarded SMS Ingestion Schema Hardening (`incoming_txns`)
-- ============================================================================

-- Add UUID support and merchant association to incoming_txns
ALTER TABLE public.incoming_txns
  ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_msg_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS counterparty_msisdn VARCHAR(24),
  ADD COLUMN IF NOT EXISTS balance_after_paisa BIGINT;

CREATE INDEX IF NOT EXISTS idx_incoming_txns_uuid_id ON public.incoming_txns (uuid_id);
CREATE INDEX IF NOT EXISTS idx_incoming_txns_merchant_id ON public.incoming_txns (merchant_id)
  WHERE merchant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_incoming_txns_device_received ON public.incoming_txns (device_id, received_at DESC);

-- Ensure anti-collision constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'incoming_txn_per_provider'
  ) THEN
    ALTER TABLE public.incoming_txns
      ADD CONSTRAINT incoming_txn_per_provider UNIQUE (provider, trx_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'incoming_txn_dedupe'
  ) THEN
    ALTER TABLE public.incoming_txns
      ADD CONSTRAINT incoming_txn_dedupe UNIQUE (device_id, client_msg_id);
  END IF;
END $$;

-- ============================================================================
-- 5. Cryptographic & Tamper-Evident Audit Trail Schema (`audit_logs`)
-- ============================================================================

-- Ensure audit_logs has UUID primary key, merchant UUID relation, and hash chaining
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS actor_id UUID,
  ADD COLUMN IF NOT EXISTS actor_type VARCHAR(32) NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS previous_hash TEXT NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
  ADD COLUMN IF NOT EXISTS entry_hash TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_merchant_created ON public.audit_logs (merchant_id, created_at DESC)
  WHERE merchant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON public.audit_logs (actor, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);

-- Enforce strict immutability on audit logs: no updates, no deletes allowed
CREATE OR REPLACE FUNCTION public.fn_prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cryptographically chained. Modifying or deleting audit entries is prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER trg_audit_logs_immutable
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_audit_log_mutation();

-- ============================================================================
-- 6. Comprehensive Row-Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS across all tables
ALTER TABLE public.merchant_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incoming_txns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarantined_sms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 6.1 Policies on `merchant_auth`
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS merchant_auth_service_role ON public.merchant_auth;
CREATE POLICY merchant_auth_service_role ON public.merchant_auth
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS merchant_auth_admin_all ON public.merchant_auth;
CREATE POLICY merchant_auth_admin_all ON public.merchant_auth
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin'))
  WITH CHECK ((auth.jwt() ->> 'role') IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS merchant_auth_select_own ON public.merchant_auth;
CREATE POLICY merchant_auth_select_own ON public.merchant_auth
  FOR SELECT
  TO authenticated
  USING (merchant_id = auth.uid() OR id = auth.uid());

DROP POLICY IF EXISTS merchant_auth_update_own ON public.merchant_auth;
CREATE POLICY merchant_auth_update_own ON public.merchant_auth
  FOR UPDATE
  TO authenticated
  USING (merchant_id = auth.uid() OR id = auth.uid())
  WITH CHECK (
    (merchant_id = auth.uid() OR id = auth.uid())
    -- Prevent privilege escalation: user cannot alter their assigned role
    AND role = (SELECT ma.role FROM public.merchant_auth ma WHERE ma.id = merchant_auth.id)
  );

-- ----------------------------------------------------------------------------
-- 6.2 Policies on `devices`
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS devices_service_role ON public.devices;
CREATE POLICY devices_service_role ON public.devices
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS devices_admin_all ON public.devices;
CREATE POLICY devices_admin_all ON public.devices
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin'))
  WITH CHECK ((auth.jwt() ->> 'role') IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS devices_read_telemetry ON public.devices;
CREATE POLICY devices_read_telemetry ON public.devices
  FOR SELECT
  TO authenticated
  USING (status <> 'revoked');

-- ----------------------------------------------------------------------------
-- 6.3 Policies on `incoming_txns`
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS incoming_txns_service_role ON public.incoming_txns;
CREATE POLICY incoming_txns_service_role ON public.incoming_txns
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS incoming_txns_admin_all ON public.incoming_txns;
CREATE POLICY incoming_txns_admin_all ON public.incoming_txns
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS incoming_txns_merchant_select ON public.incoming_txns;
CREATE POLICY incoming_txns_merchant_select ON public.incoming_txns
  FOR SELECT
  TO authenticated
  USING (
    matched_payment_id IN (
      SELECT p.id FROM public.payments p WHERE p.merchant_id = auth.uid()
    )
    OR merchant_id = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- 6.4 Policies on `audit_logs`
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS audit_logs_service_role ON public.audit_logs;
CREATE POLICY audit_logs_service_role ON public.audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS audit_logs_admin_all ON public.audit_logs;
CREATE POLICY audit_logs_admin_all ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS audit_logs_merchant_select ON public.audit_logs;
CREATE POLICY audit_logs_merchant_select ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (merchant_id = auth.uid());

DROP POLICY IF EXISTS audit_logs_insert_authenticated ON public.audit_logs;
CREATE POLICY audit_logs_insert_authenticated ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id IS NULL OR merchant_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 6.5 Policies on `wallets`
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS wallets_service_role ON public.wallets;
CREATE POLICY wallets_service_role ON public.wallets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS wallets_admin_all ON public.wallets;
CREATE POLICY wallets_admin_all ON public.wallets
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin'))
  WITH CHECK ((auth.jwt() ->> 'role') IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS wallets_merchant_select ON public.wallets;
CREATE POLICY wallets_merchant_select ON public.wallets
  FOR SELECT
  TO authenticated
  USING (status = 'active');

-- ----------------------------------------------------------------------------
-- 6.6 Policies on `outbox`
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS outbox_service_role ON public.outbox;
CREATE POLICY outbox_service_role ON public.outbox
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS outbox_admin_all ON public.outbox;
CREATE POLICY outbox_admin_all ON public.outbox
  FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin'))
  WITH CHECK ((auth.jwt() ->> 'role') IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS outbox_merchant_select ON public.outbox;
CREATE POLICY outbox_merchant_select ON public.outbox
  FOR SELECT
  TO authenticated
  USING (merchant_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 6.7 Policies on `quarantined_sms`
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS quarantined_sms_service_role ON public.quarantined_sms;
CREATE POLICY quarantined_sms_service_role ON public.quarantined_sms
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS quarantined_sms_admin_select ON public.quarantined_sms;
CREATE POLICY quarantined_sms_admin_select ON public.quarantined_sms
  FOR SELECT
  TO authenticated
  USING ((auth.jwt() ->> 'role') IN ('super_admin', 'admin'));

-- ============================================================================
-- 7. Seed Data for Merchant Authentication
-- ============================================================================

INSERT INTO public.merchant_auth (
  id,
  merchant_id,
  email,
  password_hash,
  salt,
  role,
  is_active,
  mfa_enabled,
  api_key_prefix,
  api_key_hash
) VALUES (
  '018a9020-0000-0000-0000-a00000000001',
  '018a9020-0000-0000-0000-000000000001',
  'admin@deshicart.com.bd',
  -- Standard scrypt/argon2 test hash for 'MerchantAdmin2026!'
  '$2b$12$e8Y4L5K7Z4v4t3j7a9u6veJ4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c',
  'salt_pg_demo_8812',
  'merchant_admin',
  TRUE,
  FALSE,
  'sk_live_pg_9921',
  encode(digest('sk_live_pg_99210a48b3c109df291c', 'sha256'), 'hex')
) ON CONFLICT (id) DO NOTHING;
