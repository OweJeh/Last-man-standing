-- ============================================================================
-- LAST MAN STANDING RAFFLE — 0005_seed_admin.sql
-- Auto-promote the platform owner to admin on registration
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Promote owner — dynamically disable whatever role-guard trigger exists,
--    run the UPDATE, then re-enable it. Works regardless of trigger name.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_trig text;
BEGIN
  -- Find the trigger on profiles that calls prevent_role_escalation
  SELECT trigger_name INTO v_trig
  FROM information_schema.triggers
  WHERE event_object_schema = 'public'
    AND event_object_table  = 'profiles'
    AND action_statement ILIKE '%prevent_role_escalation%'
  LIMIT 1;

  -- Disable it if found
  IF v_trig IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DISABLE TRIGGER %I', v_trig);
  END IF;

  -- Promote the owner
  UPDATE public.profiles
  SET role = 'admin', updated_at = now()
  WHERE email = '0596842918@lms.com' OR phone = '0596842918';

  -- Re-enable the guard
  IF v_trig IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles ENABLE TRIGGER %I', v_trig);
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Auto-promote trigger for future registrations
--    Runs SECURITY DEFINER so it bypasses the role-guard on INSERT
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_promote_platform_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = '0596842918@lms.com' OR NEW.phone = '0596842918' THEN
    NEW.role := 'admin';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_promote_platform_owner ON public.profiles;

CREATE TRIGGER trg_auto_promote_platform_owner
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_promote_platform_owner();

