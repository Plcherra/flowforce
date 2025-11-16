-- Fix RLS recursion and missing access for the companies table so every
-- authenticated user can create a workspace and members can read/update it.
-- This also re-hardens helper functions that policies rely on.

CREATE OR REPLACE FUNCTION public.get_user_company_id(user_uuid UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (
    SELECT company_id
    FROM public.profiles
    WHERE id = COALESCE(user_uuid, auth.uid())
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN COALESCE((
    SELECT is_company_admin
    FROM public.profiles
    WHERE id = COALESCE(user_uuid, auth.uid())
    LIMIT 1
  ), false);
END;
$$;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS registration_complete boolean DEFAULT false;

UPDATE public.companies
SET owner_id = created_by
WHERE owner_id IS NULL;

ALTER TABLE public.companies DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can view their company" ON public.companies;
DROP POLICY IF EXISTS "Company admins can view their company" ON public.companies;
DROP POLICY IF EXISTS "Company members can view basic company info" ON public.companies;
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
DROP POLICY IF EXISTS "Company admins can manage their company" ON public.companies;
DROP POLICY IF EXISTS "Company owners can update their company" ON public.companies;
DROP POLICY IF EXISTS "Company admins can update their company" ON public.companies;
DROP POLICY IF EXISTS "Company admins can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Anyone can create a company" ON public.companies;

CREATE POLICY "Company members can view their company"
ON public.companies
FOR SELECT
USING (
  COALESCE(created_by = auth.uid(), false)
  OR COALESCE(owner_id = auth.uid(), false)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = public.companies.id
  )
);

CREATE POLICY "Company owners or admins can update their company"
ON public.companies
FOR UPDATE
USING (
  COALESCE(owner_id = auth.uid(), false)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = public.companies.id
      AND (p.is_company_admin = true OR p.role IN ('admin', 'owner', 'manager'))
  )
)
WITH CHECK (
  COALESCE(owner_id = auth.uid(), false)
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.company_id = public.companies.id
      AND (p.is_company_admin = true OR p.role IN ('admin', 'owner', 'manager'))
  )
);

CREATE POLICY "Authenticated users can create companies"
ON public.companies
FOR INSERT
WITH CHECK (
  created_by = auth.uid()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
