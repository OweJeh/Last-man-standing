-- Migration 0008: Change ON DELETE RESTRICT → ON DELETE CASCADE for raffle child tables
-- This is OPTIONAL. The deleteRaffleAction already manually deletes in correct order.
-- Applying this lets Postgres handle cascades automatically, simplifying future code.
--
-- Apply via: Supabase SQL Editor → paste → Run

-- payment_submissions: when a raffle_round is deleted, also delete its payment submissions
ALTER TABLE public.payment_submissions
  DROP CONSTRAINT IF EXISTS payment_submissions_round_id_fkey,
  ADD CONSTRAINT payment_submissions_round_id_fkey
    FOREIGN KEY (round_id) REFERENCES public.raffle_rounds(id) ON DELETE CASCADE;

-- entries: when a raffle_round is deleted, also delete its entries
ALTER TABLE public.entries
  DROP CONSTRAINT IF EXISTS entries_round_id_fkey,
  ADD CONSTRAINT entries_round_id_fkey
    FOREIGN KEY (round_id) REFERENCES public.raffle_rounds(id) ON DELETE CASCADE;

-- winners: when a raffle_round is deleted, also delete its winner records
ALTER TABLE public.winners
  DROP CONSTRAINT IF EXISTS winners_round_id_fkey,
  ADD CONSTRAINT winners_round_id_fkey
    FOREIGN KEY (round_id) REFERENCES public.raffle_rounds(id) ON DELETE CASCADE;

