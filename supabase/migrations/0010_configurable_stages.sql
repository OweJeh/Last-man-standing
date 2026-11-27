-- ============================================================================
-- LAST MAN STANDING RAFFLE – 0010_configurable_stages.sql
-- Allow admin to configure 3, 4, or 5 stages per raffle (Final Six is always last)
-- ============================================================================

ALTER TABLE public.raffle_rounds
  ADD COLUMN IF NOT EXISTS num_stages INTEGER NOT NULL DEFAULT 5
  CHECK (num_stages BETWEEN 3 AND 5);
