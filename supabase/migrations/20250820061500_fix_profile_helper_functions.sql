-- Ensure helper functions that reference profiles run with RLS disabled
-- so they can be safely used inside other RLS policies without recursion.

CREATE OR REPLACE FUNCTION public.get_user_company_id(user_uuid uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = off
AS $function$
DECLARE
  result uuid;
BEGIN
  SELECT company_id
    INTO result
  FROM public.profiles
  WHERE id = COALESCE(user_uuid, auth.uid())
  LIMIT 1;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_company_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = off
AS $function$
DECLARE
  result boolean;
BEGIN
  SELECT is_company_admin
    INTO result
  FROM public.profiles
  WHERE id = COALESCE(user_uuid, auth.uid())
  LIMIT 1;

  RETURN COALESCE(result, false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = off
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = COALESCE(_user_id, auth.uid())
      AND role IN ('admin', 'manager', 'owner')
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = off
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = COALESCE(_user_id, auth.uid())
      AND role::text = _role
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
SET row_security = off
AS $function$
DECLARE
  result text;
BEGIN
  SELECT role::text
    INTO result
  FROM public.profiles
  WHERE id = COALESCE(user_uuid, auth.uid())
  LIMIT 1;

  RETURN result;
END;
$function$;
