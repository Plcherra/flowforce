-- Fix the remaining search path warnings
-- Drop all variants of get_company_roles first
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_company_roles'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE',
                    func_record.proname,
                    func_record.args);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_company_roles(company_uuid uuid DEFAULT NULL::uuid)
RETURNS TABLE(id uuid, name text, description text, color text, icon text, hierarchy_level integer, permissions jsonb, is_system_role boolean, is_active boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_company_id UUID;
BEGIN
  IF company_uuid IS NOT NULL THEN
    target_company_id := company_uuid;
  ELSE
    SELECT p.company_id INTO target_company_id 
    FROM public.profiles p 
    WHERE p.id = auth.uid() 
    LIMIT 1;
  END IF;
  
  RETURN QUERY
  SELECT 
    cr.id,
    cr.name,
    cr.description,
    cr.color,
    cr.icon,
    cr.hierarchy_level,
    cr.permissions,
    cr.is_system_role,
    cr.is_active
  FROM public.company_roles cr
  WHERE cr.company_id = target_company_id
    AND cr.is_active = true
  ORDER BY cr.hierarchy_level ASC, cr.name ASC;
END;
$function$;