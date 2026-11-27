-- ============================================================================
-- LAST MAN STANDING RAFFLE — 0006_payment_realtime.sql
-- Add payment_submissions to Realtime publication so admin dashboard
-- auto-refreshes when participants submit payments.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_submissions;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

