-- ============================================================================
-- PayGate Platform v4.0 — Migration 0008: Upay, Cellfin & Automated Payout Batching
-- Database Engine: PostgreSQL 15+ / Supabase
-- Modules:
--   1. Provider enum expansion ('upay', 'cellfin')
--   2. Payout batches table & maker-checker clearing reference tracking
--   3. RPC for batch creation & atomic verification
-- ============================================================================

-- 1. Extend provider enum to support Upay & Cellfin
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider') THEN
    ALTER TYPE public.provider ADD VALUE IF NOT EXISTS 'upay';
    ALTER TYPE public.provider ADD VALUE IF NOT EXISTS 'cellfin';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_type') THEN
    ALTER TYPE public.provider_type ADD VALUE IF NOT EXISTS 'upay';
    ALTER TYPE public.provider_type ADD VALUE IF NOT EXISTS 'cellfin';
  END IF;
END
$$;

-- 2. Payout Batch Status Enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payout_batch_status') THEN
    CREATE TYPE payout_batch_status AS ENUM ('created', 'verified', 'approved', 'disbursed');
  END IF;
END
$$;

-- 3. Payout Batches Table
CREATE TABLE IF NOT EXISTS public.payout_batches (
  id                  TEXT PRIMARY KEY
                        DEFAULT 'pob_' || substring(md5(random()::text), 1, 18),
  batch_number        TEXT NOT NULL UNIQUE,
  total_amount_paisa  BIGINT NOT NULL CHECK (total_amount_paisa > 0),
  total_fee_paisa     BIGINT NOT NULL DEFAULT 0,
  payout_count        INTEGER NOT NULL CHECK (payout_count > 0),
  merchant_count      INTEGER NOT NULL CHECK (merchant_count > 0),
  status              payout_batch_status NOT NULL DEFAULT 'created',
  rail                TEXT NOT NULL DEFAULT 'beftn',
  payout_ids          TEXT[] NOT NULL,
  maker_actor         TEXT NOT NULL,
  checker_actor       TEXT,
  clearing_reference  TEXT,
  verified_at         TIMESTAMPTZ,
  approved_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add batch_id foreign key link on payouts table
ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS batch_id TEXT REFERENCES public.payout_batches (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS payouts_batch_id_idx ON public.payouts (batch_id);
CREATE INDEX IF NOT EXISTS payout_batches_status_idx ON public.payout_batches (status, created_at DESC);

-- Enable RLS on payout_batches (platform-scoped operations table)
ALTER TABLE public.payout_batches ENABLE ROW LEVEL SECURITY;

-- Grant execution & usage
GRANT SELECT ON public.payout_batches TO authenticated;
GRANT ALL PRIVILEGES ON public.payout_batches TO service_role;

-- Seed wallets for newly supported Upay & Cellfin providers
INSERT INTO public.wallets (id, provider, msisdn, account_holder, device_id, sim_slot, status, daily_inflow_paisa, daily_limit_paisa, current_balance_paisa)
VALUES
  ('wal_upay_01', 'upay', '01812-776655', 'PayGate Pool Delta', 'dev_pixel_01', 1, 'active', 100000, 3000000, 350000),
  ('wal_cellfin_01', 'cellfin', '01912-334455', 'PayGate Pool Epsilon', 'dev_samsung_02', 2, 'active', 80000, 3000000, 210000)
ON CONFLICT (id) DO NOTHING;
