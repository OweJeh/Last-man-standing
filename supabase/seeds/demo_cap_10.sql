-- ============================================================================
-- LAST MAN STANDING RAFFLE — DEMO SEED (CAPACITY 10, 3 STAGES)
-- Creates a GHS 50 raffle (DEMO-010) in FULL status with 10 entries.
-- Stages: 10 -> 8 -> 6 -> Final Six (3 winners).
-- ============================================================================

DO $$
DECLARE
  v_admin_id    UUID;
  v_round_id    UUID;
  v_payment_id  UUID;
  v_num         INTEGER;
  v_names       TEXT[] := ARRAY[
    'KofiBlaze','AmaNova','YawTitan','AkuaSpark','KwameOrbit',
    'AdwoaPulse','KojoVortex','EsiShadow','FiifiVolt','AbenaCrown'
  ];
BEGIN
  SELECT id INTO v_admin_id FROM public.profiles
  WHERE email = '0596842918@lms.com' OR phone = '0596842918' LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin profile (0596842918) not found — register and run 0011 first';
  END IF;

  -- 10 × GHS 50 = GHS 500 gross | Profit GHS 100 | Pool GHS 400 (200 / 120 / 80)
  INSERT INTO public.raffle_rounds (
    id, round_code, name, description,
    entry_fee_pesewas, participant_capacity, num_stages,
    gross_revenue_pesewas, owner_profit_pesewas, prize_pool_pesewas,
    allocation_method,
    first_prize_pesewas, second_prize_pesewas, third_prize_pesewas,
    status, confirmed_entries_count,
    financials_frozen_at, opens_at,
    created_by
  ) VALUES (
    gen_random_uuid(),
    'DEMO-010',
    'Demo 10-Player Sprint Grid',
    '10-participant quick-fire raffle (3 stages: 10 -> 8 -> 6 -> Final Six) ready for draw.',
    5000, 10, 3,
    50000, 10000, 40000,
    'auto_50_30_20',
    20000, 12000, 8000,
    'full', 10,
    now(), now() - interval '1 hour',
    v_admin_id
  )
  RETURNING id INTO v_round_id;

  FOR v_num IN 1..10 LOOP
    INSERT INTO public.payment_submissions (
      round_id, user_id, amount_pesewas,
      momo_provider, sender_phone,
      transaction_reference,
      status, reviewed_by, reviewed_at
    ) VALUES (
      v_round_id, v_admin_id, 5000,
      'MTN MoMo',
      '024' || lpad((v_num * 1111)::text, 7, '0'),
      'DEMO10-TXN-' || lpad(v_num::text, 4, '0'),
      'consumed', v_admin_id, now()
    )
    RETURNING id INTO v_payment_id;

    INSERT INTO public.entries (
      round_id, user_id, payment_id,
      display_name, assigned_number, status
    ) VALUES (
      v_round_id, v_admin_id, v_payment_id,
      v_names[v_num], v_num, 'alive'
    );
  END LOOP;

  RAISE NOTICE 'Demo 10-player raffle created: round_id = %, round_code = DEMO-010', v_round_id;
END;
$$;

