-- ============================================================================
-- LAST MAN STANDING RAFFLE — DEMO SEED #3
-- Creates a GHS 100 raffle (DEMO-003) in FULL status with 100 entries.
-- Safe to run alongside DEMO-001 and DEMO-002 (unique round_code & DEMO3-TXN).
-- ============================================================================

DO $$
DECLARE
  v_admin_id    UUID;
  v_round_id    UUID;
  v_payment_id  UUID;
  v_num         INTEGER;
  v_names       TEXT[] := ARRAY[
    'KwameVanguard','AbenaCrown','KofiRoyale','EfuaMirage','YawSovereign',
    'AmaObsidian','KojoVertex','AkuaSilver','NanaLegend','EsiDynasty',
    'FiifiAegis','AdwoaRadiant','BoadiSpectre','MansaVelocity','OseiMonarch',
    'SerwaaPrism','TettehVector','YaaEmerald','KwekuOracle','ArabaSummit',
    'MensahNexus','AfiaCobalt','QuayeFalcon','NaaPhoenix','DansoTempest',
    'KukuaHorizon','AgyeiKinetic','MaameGlacier','OforiSentinel','DedeAurora',
    'AsareCipher','FafaValkyrie','GyasiBeacon','AbaSolstice','BaffourTriumph',
    'EnyoMagnet','TwumPinnacle','KorkorEmber','NiiColossus','DzifaStarlight',
    'PokuGenesis','SeyramHalo','AidooMatrix','KafuiCascade','OdarteyZenith',
    'MawuliQuartz','TakyiCatalyst','SenaMercury','KumiParadox','AfiyaZephyr',
    'AppiahStratos','EsinamVelvet','BoatengAtlas','NorkorDiamond','AnnanSolaris',
    'DelaKinetic','FrempongOmega','KluSpectra','SarpongValor','KorsahLumen',
    'DonkorApex','TsatsuEcho','LampteyCrest','AkotoTitan','QuarteyNova',
    'DarkoPulse','AsamoahDrift','BempongFlare','OcranComet','AddoVector',
    'NtimBolt','KyeiStorm','OpokuFrost','FrimpongBlaze','AduShadow',
    'SakyiJet','TawiahWave','AmoahSpark','LarteyVortex','YeboahCore',
    'KonaduFlux','BaahShift','KwartengGrid','ObengForge','SackeyClash',
    'CudjoeDawn','GyanWarp','HaganHaze','IddrisuJolt','JantuahPrime',
    'KorantengBeam','LomoteyLock','MirekuNode','NyarkoLink','OdoomRoot',
    'PaintsilPort','QuansahSync','RickettsHash','SamCode','TeyeFlag'
  ];
BEGIN
  -- ── 1. Find the admin profile ──────────────────────────────────────────
  SELECT id INTO v_admin_id FROM public.profiles
  WHERE email = 'owusujunior2004@gmail.com' LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found — register and run 0005 first';
  END IF;

  -- ── 2. Insert the demo raffle round (GHS 100 Tier) ─────────────────────
  -- 100 × 10000 pesewas = 1,000,000 pesewas gross (GHS 10,000)
  -- Profit 200,000 (GHS 2,000) · Pool 800,000 (GHS 8,000)
  -- 1st: 400,000 (GHS 4,000) · 2nd: 240,000 (GHS 2,400) · 3rd: 160,000 (GHS 1,600)
  INSERT INTO public.raffle_rounds (
    id, round_code, name, description,
    entry_fee_pesewas, participant_capacity,
    gross_revenue_pesewas, owner_profit_pesewas, prize_pool_pesewas,
    allocation_method,
    first_prize_pesewas, second_prize_pesewas, third_prize_pesewas,
    status, confirmed_entries_count,
    financials_frozen_at, opens_at,
    created_by
  ) VALUES (
    gen_random_uuid(),
    'DEMO-003',
    'Demo GHS 100 — High Roller Grid',
    'Third demonstration raffle (GHS 100 tier, GHS 8,000 prize pool) with 100 participants ready for draw.',
    10000, 100,
    1000000, 200000, 800000,
    'auto_50_30_20',
    400000, 240000, 160000,
    'full', 100,
    now(), now() - interval '30 minutes',
    v_admin_id
  )
  RETURNING id INTO v_round_id;

  -- ── 3. Insert 100 payments + 100 entries ───────────────────────────────
  FOR v_num IN 1..100 LOOP
    INSERT INTO public.payment_submissions (
      round_id, user_id, amount_pesewas,
      momo_provider, sender_phone,
      transaction_reference,
      status, reviewed_by, reviewed_at
    ) VALUES (
      v_round_id, v_admin_id, 10000,
      'AT Money',
      '027' || lpad((v_num * 1357)::text, 7, '0'),
      'DEMO3-TXN-' || lpad(v_num::text, 4, '0'),
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

  RAISE NOTICE 'Demo raffle #3 created: round_id = %, round_code = DEMO-003', v_round_id;
END;
$$;

