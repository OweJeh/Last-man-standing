-- ============================================================================
-- LAST MAN STANDING RAFFLE — DEMO SEED (CAPACITY 23, 4 STAGES)
-- Creates a GHS 50 raffle (DEMO-023) in FULL status with 23 entries.
-- Stages: 23 -> 15 -> 10 -> 6 -> Final Six (3 winners).
-- ============================================================================

DO $$
DECLARE
  v_admin_id    UUID;
  v_round_id    UUID;
  v_payment_id  UUID;
  v_num         INTEGER;
  v_names       TEXT[] := ARRAY[
    'AkwasiCrest','AkosuaHex','NiiRaptor','BeatriceFlux','ClementWave',
    'DorisJet','EmmanuelRay','ReginaCore','IsaacBlitz','TheresaDash',
    'BrightBolt','ComfortStorm','DesmondShift','EvelynGrid','FrancisForge',
    'GloriaClash','HarrisonDawn','IvyDusk','JonathanWarp','KendraHaze',
    'LawrenceJolt','MillicentBeam','NathanReign'
  ];
BEGIN
  SELECT id INTO v_admin_id FROM public.profiles
  WHERE email = '0596842918@lms.com' OR phone = '0596842918' LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin profile (0596842918) not found — register and run 0011 first';
  END IF;

  -- 23 × GHS 50 = GHS 1,150 gross | Profit GHS 250 | Pool GHS 900 (450 / 270 / 180)
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
    'DEMO-023',
    'Demo 23-Player Showdown Grid',
    '23-participant showdown raffle (4 stages leading to Final Six) ready for draw.',
    5000, 23, 4,
    115000, 25000, 90000,
    'auto_50_30_20',
    45000, 27000, 18000,
    'full', 23,
    now(), now() - interval '1 hour',
    v_admin_id
  )
  RETURNING id INTO v_round_id;

  FOR v_num IN 1..23 LOOP
    INSERT INTO public.payment_submissions (
      round_id, user_id, amount_pesewas,
      momo_provider, sender_phone,
      transaction_reference,
      status, reviewed_by, reviewed_at
    ) VALUES (
      v_round_id, v_admin_id, 5000,
      'AT Money',
      '027' || lpad((v_num * 1357)::text, 7, '0'),
      'DEMO23-TXN-' || lpad(v_num::text, 4, '0'),
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

  RAISE NOTICE 'Demo 23-player raffle created: round_id = %, round_code = DEMO-023', v_round_id;
END;
$$;
