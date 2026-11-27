-- ============================================================================
-- LAST MAN STANDING RAFFLE — DEMO SEED
-- Creates a GHS 30 raffle in FULL status with 100 entries.
-- All entries use the admin account so no fake auth.users are needed.
-- Run this in Supabase SQL Editor AFTER all migrations (0001–0006).
--
-- To CLEAN UP afterwards:  DELETE FROM public.raffle_rounds WHERE round_code = 'DEMO-001';
-- (cascading FKs are RESTRICT, so delete entries/payments first or use the block at the bottom)
-- ============================================================================

DO $$
DECLARE
  v_admin_id    UUID;
  v_round_id    UUID;
  v_payment_id  UUID;
  v_num         INTEGER;
  v_names       TEXT[] := ARRAY[
    'KofiBlaze','AmaDarkStar','YawThunder','AkuaPhoenix','KwameOrion',
    'AdjeiCobra','EsiLightning','KojoHawk','AbenaNova','KwesiVenom',
    'EffiaStar','OpokuStorm','SerwaaGhost','AsanteWolf','MaafiRocket',
    'DarkoFlash','AbenaIce','MensahFire','AgyeiComet','YaaAstro',
    'BoadiTitan','FrimaMystic','OwusuBlade','ArhinArrow','AchiaCypher',
    'DokuRaptor','FenyiPulse','GyasiFrost','OtengShadow','SikaGold',
    'BaffoSurge','QuayeMach','AnsahStrike','DjangZero','AmpofoBolt',
    'AddisonFlare','BosomNight','AmponsahAce','AttiakuEdge','OforiSteel',
    'FiifiRaven','DodoVolt','AkotoIron','DapaahCrash','FosuhSpark',
    'PrincePeak','RexfordWave','SamuelGrid','TuffourQuake','WilliamsRex',
    'YeboahSmoke','ZicklahDawn','AidooFlux','BaahOrbit','CaesarZen',
    'DansoTurbo','EdufulBlitz','FadelDrift','GordonCrest','HenryClash',
    'IssahRift','JamesSonic','KelvinWarp','LarbiEcho','MalikVibe',
    'NanaDelta','OppongBurst','PaapaPrime','QuansahNexus','RaymondJolt',
    'StephenHaze','TetteySteam','UmarForge','VictorHex','WalterSwift',
    'XornamDusk','YussifAxle','ZainGrip','AmaraBeam','BrendaShift',
    'CecilReign','DennisLock','ErnestCore','FrankLoop','GraceNode',
    'HannahLink','IreneRoot','JulietPort','KateSync','LindaHash',
    'MabelCode','NaomiFlag','OliviaBase','PatienceRun','QueenStack',
    'RuthHost','SandraPath','ThelmaSign','UrsulaBit','VanessaPing'
  ];
BEGIN
  -- ── 1. Find the admin profile ──────────────────────────────────────────
  SELECT id INTO v_admin_id FROM public.profiles
  WHERE email = '0596842918@lms.com' OR phone = '0596842918' LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found — register and run 0005 first';
  END IF;

  -- ── 2. Insert the demo raffle round ────────────────────────────────────
  -- GHS 30 tier: 100 × 3000 pesewas = 300,000 pesewas gross
  -- Profit 100,000 · Pool 200,000 · 1st 100,000 · 2nd 60,000 · 3rd 40,000
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
    'DEMO-001',
    'Demo GHS 30 — Full Grid',
    'Demonstration raffle with 100 participants. Ready for draw.',
    3000, 100,
    300000, 100000, 200000,
    'auto_50_30_20',
    100000, 60000, 40000,
    'full', 100,
    now(), now() - interval '2 hours',
    v_admin_id
  )
  RETURNING id INTO v_round_id;

  -- ── 3. Insert 100 payments + 100 entries ───────────────────────────────
  FOR v_num IN 1..100 LOOP
    -- Payment (consumed)
    INSERT INTO public.payment_submissions (
      round_id, user_id, amount_pesewas,
      momo_provider, sender_phone,
      transaction_reference,
      status, reviewed_by, reviewed_at
    ) VALUES (
      v_round_id, v_admin_id, 3000,
      'MTN MoMo',
      '024' || lpad((v_num * 1111)::text, 7, '0'),
      'DEMO-TXN-' || lpad(v_num::text, 4, '0'),
      'consumed', v_admin_id, now()
    )
    RETURNING id INTO v_payment_id;

    -- Entry
    INSERT INTO public.entries (
      round_id, user_id, payment_id,
      display_name, assigned_number, status
    ) VALUES (
      v_round_id, v_admin_id, v_payment_id,
      v_names[v_num], v_num, 'alive'
    );
  END LOOP;

  RAISE NOTICE 'Demo raffle created: round_id = %, round_code = DEMO-001', v_round_id;
END;
$$;

