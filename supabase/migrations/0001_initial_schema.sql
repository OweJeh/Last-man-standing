-- ============================================================================
-- LAST MAN STANDING RAFFLE — 0001_initial_schema.sql
-- Core tables, constraints, indexes, private schema, and audit immutability
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Private schema inaccessible to anon and authenticated roles
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

-- ----------------------------------------------------------------------------
-- 1. PROFILES
-- ----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('participant', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Automatically create profile on signup; NEVER trust client metadata for role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data ->> 'full_name'), ''), 'Participant'),
    NEW.email,
    NULLIF(TRIM(NEW.raw_user_meta_data ->> 'phone'), ''),
    'participant'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Prevent privilege escalation via profile role updates from non-service_role
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'Only service_role may change user roles';
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- ----------------------------------------------------------------------------
-- 2. PLATFORM SETTINGS
-- ----------------------------------------------------------------------------
CREATE TABLE public.platform_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_momo_network TEXT NOT NULL DEFAULT 'MTN MoMo',
  default_momo_number TEXT NOT NULL DEFAULT '024 000 0000',
  default_momo_account_name TEXT NOT NULL DEFAULT 'Last Man Standing Ltd',
  max_entries_per_user_per_raffle INTEGER NOT NULL DEFAULT 3 CHECK (max_entries_per_user_per_raffle BETWEEN 1 AND 10),
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. RAFFLE ROUNDS (Admin-controlled creation, pricing, and lifecycle)
-- ----------------------------------------------------------------------------
CREATE TABLE public.raffle_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  entry_fee_pesewas INTEGER NOT NULL CHECK (entry_fee_pesewas > 0),
  participant_capacity INTEGER NOT NULL DEFAULT 100 CHECK (participant_capacity >= 6 AND participant_capacity <= 1000),
  gross_revenue_pesewas INTEGER NOT NULL CHECK (gross_revenue_pesewas > 0),
  owner_profit_pesewas INTEGER NOT NULL CHECK (owner_profit_pesewas >= 0),
  prize_pool_pesewas INTEGER NOT NULL CHECK (prize_pool_pesewas >= 0),
  allocation_method TEXT NOT NULL DEFAULT 'auto_50_30_20' CHECK (allocation_method IN ('auto_50_30_20', 'custom')),
  first_prize_pesewas INTEGER NOT NULL CHECK (first_prize_pesewas >= 0),
  second_prize_pesewas INTEGER NOT NULL CHECK (second_prize_pesewas >= 0),
  third_prize_pesewas INTEGER NOT NULL CHECK (third_prize_pesewas >= 0),
  momo_instructions TEXT,
  cover_image_url TEXT,
  opens_at TIMESTAMPTZ,
  closes_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'published', 'live', 'full', 'locked', 'running', 'completed', 'archived', 'cancelled')
  ),
  current_stage INTEGER NOT NULL DEFAULT 0 CHECK (current_stage BETWEEN 0 AND 5),
  confirmed_entries_count INTEGER NOT NULL DEFAULT 0 CHECK (confirmed_entries_count >= 0),
  financials_frozen_at TIMESTAMPTZ,
  seed_commitment TEXT,
  snapshot_hash TEXT,
  algorithm_version TEXT,
  revealed_seed TEXT,
  result_hash TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_gross_revenue CHECK (gross_revenue_pesewas = entry_fee_pesewas * participant_capacity),
  CONSTRAINT chk_prize_pool CHECK (prize_pool_pesewas = gross_revenue_pesewas - owner_profit_pesewas),
  CONSTRAINT chk_prizes_sum CHECK (first_prize_pesewas + second_prize_pesewas + third_prize_pesewas = prize_pool_pesewas),
  CONSTRAINT chk_capacity_entries CHECK (confirmed_entries_count <= participant_capacity)
);

-- Enforce that at most ONE raffle can be LIVE (accepting entries) at a time
CREATE UNIQUE INDEX idx_single_live_raffle ON public.raffle_rounds ((1)) WHERE status = 'live';
CREATE INDEX idx_raffle_rounds_status ON public.raffle_rounds (status);

-- Prevent financial changes after financials_frozen_at is set
CREATE OR REPLACE FUNCTION public.protect_frozen_raffle_financials()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.financials_frozen_at IS NOT NULL THEN
    IF NEW.entry_fee_pesewas IS DISTINCT FROM OLD.entry_fee_pesewas
       OR NEW.participant_capacity IS DISTINCT FROM OLD.participant_capacity
       OR NEW.gross_revenue_pesewas IS DISTINCT FROM OLD.gross_revenue_pesewas
       OR NEW.owner_profit_pesewas IS DISTINCT FROM OLD.owner_profit_pesewas
       OR NEW.prize_pool_pesewas IS DISTINCT FROM OLD.prize_pool_pesewas
       OR NEW.first_prize_pesewas IS DISTINCT FROM OLD.first_prize_pesewas
       OR NEW.second_prize_pesewas IS DISTINCT FROM OLD.second_prize_pesewas
       OR NEW.third_prize_pesewas IS DISTINCT FROM OLD.third_prize_pesewas THEN
      RAISE EXCEPTION 'Financial configuration is frozen and cannot be modified';
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_frozen_raffle_financials
  BEFORE UPDATE ON public.raffle_rounds
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_frozen_raffle_financials();

-- ----------------------------------------------------------------------------
-- 4. PAYMENT SUBMISSIONS (Manual MoMo Verification)
-- ----------------------------------------------------------------------------
CREATE TABLE public.payment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.raffle_rounds(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount_pesewas INTEGER NOT NULL CHECK (amount_pesewas > 0),
  momo_provider TEXT NOT NULL,
  sender_phone TEXT NOT NULL,
  transaction_reference TEXT NOT NULL UNIQUE,
  receipt_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'consumed')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_round_status ON public.payment_submissions (round_id, status);
CREATE INDEX idx_payments_user ON public.payment_submissions (user_id);

-- ----------------------------------------------------------------------------
-- 5. ENTRIES
-- ----------------------------------------------------------------------------
CREATE TABLE public.entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.raffle_rounds(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  payment_id UUID NOT NULL UNIQUE REFERENCES public.payment_submissions(id) ON DELETE RESTRICT,
  display_name TEXT NOT NULL CHECK (char_length(trim(display_name)) BETWEEN 2 AND 30),
  assigned_number INTEGER NOT NULL CHECK (assigned_number >= 1),
  status TEXT NOT NULL DEFAULT 'alive' CHECK (status IN ('alive', 'eliminated', 'winner')),
  eliminated_stage INTEGER CHECK (eliminated_stage BETWEEN 1 AND 5),
  eliminated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_round_number UNIQUE (round_id, assigned_number)
);

CREATE INDEX idx_entries_round ON public.entries (round_id);
CREATE INDEX idx_entries_user ON public.entries (user_id);

-- ----------------------------------------------------------------------------
-- 6. RAFFLE STAGES & STAGE RESULTS
-- ----------------------------------------------------------------------------
CREATE TABLE public.raffle_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.raffle_rounds(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 5),
  stage_name TEXT NOT NULL,
  starting_count INTEGER NOT NULL,
  eliminate_count INTEGER NOT NULL,
  surviving_count INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'prepared' CHECK (status IN ('prepared', 'published')),
  published_at TIMESTAMPTZ,
  CONSTRAINT uq_round_stage UNIQUE (round_id, stage_number)
);

CREATE TABLE public.stage_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.raffle_rounds(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 5),
  eliminated_numbers INTEGER[] NOT NULL,
  surviving_numbers INTEGER[] NOT NULL,
  elimination_sequence INTEGER[] NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_round_stage_result UNIQUE (round_id, stage_number)
);

-- ----------------------------------------------------------------------------
-- 7. WINNERS
-- ----------------------------------------------------------------------------
CREATE TABLE public.winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.raffle_rounds(id) ON DELETE RESTRICT,
  entry_id UUID NOT NULL UNIQUE REFERENCES public.entries(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  position INTEGER NOT NULL CHECK (position IN (1, 2, 3)),
  display_name TEXT NOT NULL,
  assigned_number INTEGER NOT NULL,
  prize_pesewas INTEGER NOT NULL CHECK (prize_pesewas >= 0),
  payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'paid')),
  payout_reference TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_round_position UNIQUE (round_id, position)
);

-- ----------------------------------------------------------------------------
-- 8. RAFFLE EVENTS (Ordered Realtime Stream)
-- ----------------------------------------------------------------------------
CREATE TABLE public.raffle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.raffle_rounds(id) ON DELETE CASCADE,
  sequence_number INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_round_event_seq UNIQUE (round_id, sequence_number)
);

CREATE INDEX idx_raffle_events_round_seq ON public.raffle_events (round_id, sequence_number);

-- ----------------------------------------------------------------------------
-- 9. AUDIT LOGS (Append-Only)
-- ----------------------------------------------------------------------------
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  previous_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only; updates and deletes are prohibited';
END;
$$;

CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- ----------------------------------------------------------------------------
-- 10. PRIVATE DRAW PLANS (Inaccessible to clients)
-- ----------------------------------------------------------------------------
CREATE TABLE private.draw_plans (
  round_id UUID PRIMARY KEY REFERENCES public.raffle_rounds(id) ON DELETE CASCADE,
  encrypted_seed TEXT NOT NULL,
  seed_commitment TEXT NOT NULL,
  snapshot_hash TEXT NOT NULL,
  algorithm_version TEXT NOT NULL,
  canonical_snapshot JSONB NOT NULL,
  shuffled_order JSONB NOT NULL,
  stage_plans JSONB NOT NULL,
  winners_plan JSONB NOT NULL,
  result_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

