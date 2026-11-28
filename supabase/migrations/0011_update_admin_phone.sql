-- ============================================================================
-- LAST MAN STANDING RAFFLE — 0011_update_admin_phone.sql
-- Replace owusujunior2004@gmail.com with 0596842918 (0596842918@lms.com) as admin
-- ============================================================================

DO $$
DECLARE
  v_trig text;
BEGIN
  SELECT trigger_name INTO v_trig
  FROM information_schema.triggers
  WHERE event_object_schema = 'public'
    AND event_object_table  = 'profiles'
    AND action_statement ILIKE '%prevent_role_escalation%'
  LIMIT 1;

  IF v_trig IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DISABLE TRIGGER %I', v_trig);
  END IF;

  -- Demote previous admin email if it exists
  UPDATE public.profiles
  SET role = 'participant', updated_at = now()
  WHERE email = 'owusujunior2004@gmail.com';

  -- Promote 0596842918 to admin
  UPDATE public.profiles
  SET role = 'admin', updated_at = now()
  WHERE email = '0596842918@lms.com' OR phone = '0596842918';

  IF v_trig IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles ENABLE TRIGGER %I', v_trig);
  END IF;
END;
$$;

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

