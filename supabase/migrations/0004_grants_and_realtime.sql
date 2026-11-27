-- ============================================================================
-- LAST MAN STANDING RAFFLE — 0004_grants_and_realtime.sql
-- PostgREST role grants, sequences, storage policy, seed admin setup
-- Safe to re-run (all statements are idempotent)
-- ============================================================================

-- ─────────────────────────────────────────────────────────
-- 1. Schema usage grants
-- ─────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────
-- 2. Public read-only tables (unauthenticated spectators)
-- ─────────────────────────────────────────────────────────
GRANT SELECT ON public.raffle_rounds       TO anon, authenticated;
GRANT SELECT ON public.platform_settings   TO anon, authenticated;
GRANT SELECT ON public.raffle_stages       TO anon, authenticated;
GRANT SELECT ON public.stage_results       TO anon, authenticated;
GRANT SELECT ON public.winners             TO anon, authenticated;
GRANT SELECT ON public.raffle_events       TO anon, authenticated;

-- public_participants is a view — grant directly
GRANT SELECT ON public.public_participants TO anon, authenticated;

-- ─────────────────────────────────────────────────────────
-- 3. Authenticated participant operations
-- ─────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.profiles            TO authenticated;
GRANT SELECT, INSERT         ON public.payment_submissions TO authenticated;
GRANT SELECT                 ON public.entries             TO authenticated;
GRANT SELECT                 ON public.audit_logs          TO authenticated;

-- Sequences used by authenticated inserts
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ─────────────────────────────────────────────────────────
-- 4. Full service_role access
-- ─────────────────────────────────────────────────────────
GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Private schema for encrypted draw plans
GRANT USAGE ON SCHEMA private TO service_role;
GRANT ALL ON ALL TABLES    IN SCHEMA private TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA private TO service_role;

-- ─────────────────────────────────────────────────────────
-- 5. RPC EXECUTE grants
-- ─────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.claim_raffle_number(UUID, UUID, TEXT, INTEGER)
  TO authenticated;

GRANT EXECUTE ON FUNCTION public.activate_raffle_round(UUID, UUID)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.deactivate_raffle_round(UUID, UUID)
  TO service_role;

GRANT EXECUTE ON FUNCTION public.is_admin()
  TO authenticated, anon;

-- ─────────────────────────────────────────────────────────
-- 6. Seed default platform_settings row
-- ─────────────────────────────────────────────────────────
INSERT INTO public.platform_settings (
  id,
  default_momo_network,
  default_momo_number,
  default_momo_account_name,
  max_entries_per_user_per_raffle,
  maintenance_mode
) VALUES (
  1,
  'MTN MoMo',
  '024 000 0000',
  'Last Man Standing Ltd',
  3,
  false
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────────────────────
-- 7. Realtime publication (idempotent — ignores duplicates)
-- ─────────────────────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.raffle_rounds;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.entries;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.raffle_events;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.stage_results;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.winners;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────
-- 8. Storage bucket for payment receipts
-- ─────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-receipts',
  'payment-receipts',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Owner can view own receipts"             ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all receipts"            ON storage.objects;

CREATE POLICY "Authenticated users can upload receipts"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owner can view own receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins can view all receipts"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
