-- ============================================================================
-- LAST MAN STANDING RAFFLE – 0009_security_hardening.sql
-- Storage hardening: receipt size cap, file type restriction, delete policy
-- ============================================================================

-- Only allow images up to 5 MB in the payment-receipts bucket
UPDATE storage.buckets
SET file_size_limit = 5242880,     -- 5 MB in bytes
    allowed_mime_types = ARRAY[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif'
    ]
WHERE id = 'payment-receipts';

-- Allow users to delete only their own receipts (cleanup on bad uploads)
CREATE POLICY "Users can delete own payment receipts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow admins to delete any receipt
CREATE POLICY "Admins can delete any payment receipt"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND public.is_admin()
  );

-- ============================================================================
-- Index improvements for scalability
-- ============================================================================

-- Speed up per-user payment lookups (used in submitPaymentAction)
CREATE INDEX IF NOT EXISTS idx_payment_submissions_user_round
  ON public.payment_submissions (user_id, round_id, status);

-- Speed up audit log queries (admin view, ordered by created_at)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs (created_at DESC);

-- Speed up entry lookups per round (used heavily during live draw)
CREATE INDEX IF NOT EXISTS idx_entries_round_status
  ON public.entries (round_id, status);

-- Speed up raffle_events streaming (realtime + live page)
CREATE INDEX IF NOT EXISTS idx_raffle_events_round_seq
  ON public.raffle_events (round_id, sequence_number DESC);

