-- ============================================================================
-- LAST MAN STANDING RAFFLE — DEMO SEED #2
-- Creates a GHS 50 raffle (DEMO-002) in FULL status with 100 entries.
-- Safe to run alongside DEMO-001 (uses unique round_code and DEMO2-TXN refs).
-- ============================================================================

DO $$
DECLARE
  v_admin_id    UUID;
  v_round_id    UUID;
  v_payment_id  UUID;
  v_num         INTEGER;
  v_names       TEXT[] := ARRAY[
    'AkwasiApex','NadiaSpark','KojoVortex','SelinaBlaze','KwabenaZero',
    'EnyonamNova','YawTitan','MavisPhantom','KwekuOrbit','AkosuaPulse',
    'OseiStrike','BeatriceVolt','FiifiCrest','DorisComet','NiiRaptor',
    'PriscillaFlux','BensonDrift','ReginaSteel','ClementWave','GiftyEcho',
    'EmmanuelJet','VeraShadow','IsaacFlare','TheresaFrost','BrightArrow',
    'ComfortRay','DesmondCore','EvelynPeak','FrancisBlitz','GloriaDash',
    'HarrisonBolt','IvyStorm','JonathanHex','KendraShift','LawrenceGrid',
    'MillicentZen','NathanForge','OpheliaClash','PatrickDawn','QueenieDusk',
    'RichardWarp','SophiaHaze','TimothyJolt','UchePrime','VictoriaBeam',
    'WilfredLock','XeniaNode','YusufLink','ZaraRoot','AdwoaPort',
    'BoatengSync','CharlotteHash','DanielCode','ElormFlag','FosuBase',
    'GodwinStack','HelenaHost','IbrahimPath','JoanaSign','KofiBit',
    'LydiaPing','MaxwellVibe','NoraRift','ObedSonic','PortiaDelta',
    'QuentinBurst','RitaNexus','SampsonSteam','TawiaAxle','UmarGrip',
    'VivianReign','WisdomLoop','XanderIron','YaaQuake','ZachTurbo',
    'AbigailSmoke','BernardFlash','CynthiaIce','DerrickFire','EstelleStar',
    'FelixGhost','GeorginaWolf','HumphreyRocket','InesVenom','JacobHawk',
    'KeziahCobra','LeonardOrion','MatildaPhoenix','NelsonThunder','OliveDark',
    'ProsperGold','RachelMystic','StanleyBlade','TinaCypher','UptonSurge',
    'VeronicaMach','WinstonSteel','XolaRaven','YvetteVolt','ZekeCrash'
  ];
BEGIN
  -- ── 1. Find the admin profile ──────────────────────────────────────────
  SELECT id INTO v_admin_id FROM public.profiles
  WHERE email = '0596842918@lms.com' OR phone = '0596842918' LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin profile not found — register and run 0005 first';
  END IF;

  -- ── 2. Insert the demo raffle round (GHS 50 Tier) ──────────────────────
  -- 100 × 5000 pesewas = 500,000 pesewas gross (GHS 5,000)
  -- Profit 100,000 (GHS 1,000) · Pool 400,000 (GHS 4,000)
  -- 1st: 200,000 (GHS 2,000) · 2nd: 120,000 (GHS 1,200) · 3rd: 80,000 (GHS 800)
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
    'DEMO-002',
    'Demo GHS 50 — Championship Grid',
    'Second demonstration raffle (GHS 50 tier, GHS 4,000 prize pool) with 100 participants ready for draw.',
    5000, 100,
    500000, 100000, 400000,
    'auto_50_30_20',
    200000, 120000, 80000,
    'full', 100,
    now(), now() - interval '1 hour',
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
      v_round_id, v_admin_id, 5000,
      'Telecel Cash',
      '050' || lpad((v_num * 1234)::text, 7, '0'),
      'DEMO2-TXN-' || lpad(v_num::text, 4, '0'),
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

  RAISE NOTICE 'Demo raffle #2 created: round_id = %, round_code = DEMO-002', v_round_id;
END;
$$;

