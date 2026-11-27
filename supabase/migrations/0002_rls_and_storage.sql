-- ============================================================================
-- LAST MAN STANDING RAFFLE — 0002_rls_and_storage.sql
-- Row Level Security policies, public participant projection, & receipt storage
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Enable RLS on all public tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update own non-role profile fields"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- PLATFORM SETTINGS
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can read platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

-- ----------------------------------------------------------------------------
-- RAFFLE ROUNDS (Public sees published+ rounds; Admin sees all)
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can view published and active raffles"
  ON public.raffle_rounds FOR SELECT
  USING (
    status IN ('published', 'live', 'full', 'locked', 'running', 'completed', 'archived')
    OR public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- PAYMENT SUBMISSIONS (Users see/insert own; Admin sees all)
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own payment submissions"
  ON public.payment_submissions FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can submit pending payments for live raffles"
  ON public.payment_submissions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.raffle_rounds r
      WHERE r.id = round_id AND r.status = 'live' AND r.entry_fee_pesewas = amount_pesewas
    )
  );

-- ----------------------------------------------------------------------------
-- ENTRIES (Users see own; Admin sees all; Public uses public_participants view)
-- ----------------------------------------------------------------------------
CREATE POLICY "Users can view own entries"
  ON public.entries FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Public projection without user_id or payment_id
CREATE OR REPLACE VIEW public.public_participants AS
SELECT
  e.id,
  e.round_id,
  e.display_name,
  e.assigned_number,
  e.status,
  e.eliminated_stage,
  e.eliminated_at
FROM public.entries e
JOIN public.raffle_rounds r ON r.id = e.round_id
WHERE r.status IN ('published', 'live', 'full', 'locked', 'running', 'completed', 'archived');

GRANT SELECT ON public.public_participants TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- RAFFLE STAGES, STAGE RESULTS, WINNERS, RAFFLE EVENTS (Public read-only)
-- ----------------------------------------------------------------------------
CREATE POLICY "Public can view stages for visible raffles"
  ON public.raffle_stages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.raffle_rounds r
      WHERE r.id = round_id
        AND r.status IN ('locked', 'running', 'completed', 'archived')
    )
    OR public.is_admin()
  );

CREATE POLICY "Public can view published stage results"
  ON public.stage_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.raffle_rounds r
      WHERE r.id = round_id
        AND r.status IN ('running', 'completed', 'archived')
    )
    OR public.is_admin()
  );

CREATE POLICY "Public can view winners"
  ON public.winners FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.raffle_rounds r
      WHERE r.id = round_id
        AND r.status IN ('completed', 'archived')
    )
    OR public.is_admin()
  );

CREATE POLICY "Public can view raffle events"
  ON public.raffle_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.raffle_rounds r
      WHERE r.id = round_id
        AND r.status IN ('locked', 'running', 'completed', 'archived')
    )
    OR public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- AUDIT LOGS (Admin read-only; writes only via service_role / SECURITY DEFINER)
-- ----------------------------------------------------------------------------
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- PRIVATE STORAGE BUCKET FOR PAYMENT RECEIPTS
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own payment receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users and admins can view relevant payment receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_admin()
    )
  );

