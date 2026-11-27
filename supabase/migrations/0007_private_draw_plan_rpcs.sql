-- ============================================================================
-- LAST MAN STANDING RAFFLE — 0007_private_draw_plan_rpcs.sql
-- Service-role-only RPCs to read/write private.draw_plans without exposing
-- the `private` schema in PostgREST.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.store_draw_plan(
  p_round_id UUID,
  p_encrypted_seed TEXT,
  p_seed_commitment TEXT,
  p_snapshot_hash TEXT,
  p_algorithm_version TEXT,
  p_canonical_snapshot JSONB,
  p_shuffled_order JSONB,
  p_stage_plans JSONB,
  p_winners_plan JSONB,
  p_result_hash TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
BEGIN
  INSERT INTO private.draw_plans (
    round_id,
    encrypted_seed,
    seed_commitment,
    snapshot_hash,
    algorithm_version,
    canonical_snapshot,
    shuffled_order,
    stage_plans,
    winners_plan,
    result_hash
  )
  VALUES (
    p_round_id,
    p_encrypted_seed,
    p_seed_commitment,
    p_snapshot_hash,
    p_algorithm_version,
    p_canonical_snapshot,
    p_shuffled_order,
    p_stage_plans,
    p_winners_plan,
    p_result_hash
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_draw_plan(p_round_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = private, public
AS $$
DECLARE
  v_row private.draw_plans%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM private.draw_plans
  WHERE round_id = p_round_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

-- Strictly lock down execution to service_role only
REVOKE ALL ON FUNCTION public.store_draw_plan(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_draw_plan(UUID, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB, JSONB, JSONB, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.get_draw_plan(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_draw_plan(UUID) TO service_role;

-- Force PostgREST to refresh its schema cache immediately
NOTIFY pgrst, 'reload schema';

