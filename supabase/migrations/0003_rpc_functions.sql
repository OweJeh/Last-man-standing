-- ============================================================================
-- LAST MAN STANDING RAFFLE — 0003_rpc_functions.sql
-- Atomic transactional RPCs & Realtime publication setup
-- ============================================================================

-- 1. Atomic number claim (enforces unique number, 3-entry limit, approved payment, live status)
CREATE OR REPLACE FUNCTION public.claim_raffle_number(
  p_round_id UUID,
  p_payment_id UUID,
  p_display_name TEXT,
  p_number INTEGER
)
RETURNS public.entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_round public.raffle_rounds%ROWTYPE;
  v_payment public.payment_submissions%ROWTYPE;
  v_max_entries INTEGER;
  v_existing_count INTEGER;
  v_clean_name TEXT;
  v_entry public.entries%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_clean_name := regexp_replace(trim(p_display_name), '\s+', ' ', 'g');
  IF char_length(v_clean_name) < 2 OR char_length(v_clean_name) > 30 THEN
    RAISE EXCEPTION 'Display name must be between 2 and 30 characters';
  END IF;

  -- Lock raffle round row
  SELECT * INTO v_round
  FROM public.raffle_rounds
  WHERE id = p_round_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Raffle round not found';
  END IF;

  IF v_round.status <> 'live' THEN
    RAISE EXCEPTION 'Raffle is not currently open for entries';
  END IF;

  IF p_number < 1 OR p_number > v_round.participant_capacity THEN
    RAISE EXCEPTION 'Number must be between 1 and %', v_round.participant_capacity;
  END IF;

  IF v_round.confirmed_entries_count >= v_round.participant_capacity THEN
    RAISE EXCEPTION 'Raffle is already full';
  END IF;

  -- Lock payment row
  SELECT * INTO v_payment
  FROM public.payment_submissions
  WHERE id = p_payment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment submission not found';
  END IF;

  IF v_payment.user_id <> v_user_id THEN
    RAISE EXCEPTION 'Payment does not belong to current user';
  END IF;

  IF v_payment.round_id <> p_round_id THEN
    RAISE EXCEPTION 'Payment is not for this raffle round';
  END IF;

  IF v_payment.status <> 'approved' THEN
    RAISE EXCEPTION 'Payment must be approved before claiming a number';
  END IF;

  IF v_payment.amount_pesewas <> v_round.entry_fee_pesewas THEN
    RAISE EXCEPTION 'Payment amount does not match raffle entry fee';
  END IF;

  -- Check per-user entry limit
  SELECT max_entries_per_user_per_raffle INTO v_max_entries
  FROM public.platform_settings WHERE id = 1;
  v_max_entries := COALESCE(v_max_entries, 3);

  SELECT COUNT(*) INTO v_existing_count
  FROM public.entries
  WHERE round_id = p_round_id AND user_id = v_user_id;

  IF v_existing_count >= v_max_entries THEN
    RAISE EXCEPTION 'Maximum of % entries per account per raffle reached', v_max_entries;
  END IF;

  -- Insert entry (unique constraint uq_round_number prevents duplicate numbers)
  INSERT INTO public.entries (
    round_id,
    user_id,
    payment_id,
    display_name,
    assigned_number,
    status
  )
  VALUES (
    p_round_id,
    v_user_id,
    p_payment_id,
    v_clean_name,
    p_number,
    'alive'
  )
  RETURNING * INTO v_entry;

  -- Mark payment consumed
  UPDATE public.payment_submissions
  SET status = 'consumed', updated_at = now()
  WHERE id = p_payment_id;

  -- Update raffle counter and transition to 'full' if capacity reached
  UPDATE public.raffle_rounds
  SET
    confirmed_entries_count = confirmed_entries_count + 1,
    status = CASE
      WHEN confirmed_entries_count + 1 >= participant_capacity THEN 'full'
      ELSE status
    END,
    updated_at = now()
  WHERE id = p_round_id;

  RETURN v_entry;
END;
$$;

-- 2. Activate Raffle Round (Only 1 live at a time, freezes financials)
CREATE OR REPLACE FUNCTION public.activate_raffle_round(
  p_round_id UUID,
  p_admin_id UUID
)
RETURNS public.raffle_rounds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round public.raffle_rounds%ROWTYPE;
  v_live_count INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Forbidden: Admin role required';
  END IF;

  SELECT * INTO v_round FROM public.raffle_rounds WHERE id = p_round_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Raffle round not found';
  END IF;

  IF v_round.status <> 'published' THEN
    RAISE EXCEPTION 'Only published raffles can be activated (current status: %)', v_round.status;
  END IF;

  SELECT COUNT(*) INTO v_live_count FROM public.raffle_rounds WHERE status = 'live';
  IF v_live_count > 0 THEN
    RAISE EXCEPTION 'Another raffle is already live. Deactivate or complete it first.';
  END IF;

  UPDATE public.raffle_rounds
  SET
    status = 'live',
    financials_frozen_at = COALESCE(financials_frozen_at, now()),
    opens_at = COALESCE(opens_at, now()),
    updated_at = now()
  WHERE id = p_round_id
  RETURNING * INTO v_round;

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, previous_value, new_value)
  VALUES (
    p_admin_id,
    'RAFFLE_ACTIVATED',
    'raffle_round',
    p_round_id::text,
    jsonb_build_object('status', 'published'),
    jsonb_build_object('status', 'live', 'financials_frozen_at', v_round.financials_frozen_at)
  );

  RETURN v_round;
END;
$$;

-- 3. Deactivate empty live raffle back to published
CREATE OR REPLACE FUNCTION public.deactivate_raffle_round(
  p_round_id UUID,
  p_admin_id UUID
)
RETURNS public.raffle_rounds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_round public.raffle_rounds%ROWTYPE;
  v_payment_count INTEGER;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RAISE EXCEPTION 'Forbidden: Admin role required';
  END IF;

  SELECT * INTO v_round FROM public.raffle_rounds WHERE id = p_round_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Raffle round not found';
  END IF;

  IF v_round.status <> 'live' THEN
    RAISE EXCEPTION 'Only live raffles can be deactivated';
  END IF;

  IF v_round.confirmed_entries_count > 0 THEN
    RAISE EXCEPTION 'Cannot deactivate a raffle that already has confirmed entries; use audited cancellation';
  END IF;

  SELECT COUNT(*) INTO v_payment_count
  FROM public.payment_submissions
  WHERE round_id = p_round_id AND status IN ('pending', 'approved', 'consumed');

  IF v_payment_count > 0 THEN
    RAISE EXCEPTION 'Cannot deactivate a raffle with pending or approved payments';
  END IF;

  UPDATE public.raffle_rounds
  SET status = 'published', updated_at = now()
  WHERE id = p_round_id
  RETURNING * INTO v_round;

  INSERT INTO public.audit_logs (actor_id, action, target_type, target_id, previous_value, new_value)
  VALUES (
    p_admin_id,
    'RAFFLE_DEACTIVATED',
    'raffle_round',
    p_round_id::text,
    jsonb_build_object('status', 'live'),
    jsonb_build_object('status', 'published')
  );

  RETURN v_round;
END;
$$;

-- 4. Enable Realtime for live spectator & grid updates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.raffle_rounds;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.entries;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.raffle_events;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.stage_results;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.winners;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

