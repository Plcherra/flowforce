-- Fix the remaining functions - there's a duplicate has_role function that's SQL language
-- Let's remove the old one and ensure only the plpgsql version with search_path exists

-- First drop the SQL version of has_role that conflicts
DROP FUNCTION IF EXISTS public.has_role(uuid, user_role);

-- Now ensure all remaining functions have proper search_path
-- The SQL function has_role should be updated to include search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;