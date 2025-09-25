-- Fix security issues identified in scan
-- Restrict profile access to protect employee data

-- 1. Update profiles RLS policies for better security
DROP POLICY IF EXISTS "Profile access policy" ON public.profiles;
DROP POLICY IF EXISTS "read own profile" ON public.profiles;

-- Only allow users to see their own profile and company admins to see company profiles
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Company admins can view company profiles" 
ON public.profiles 
FOR SELECT 
USING (is_company_admin() AND company_id = get_user_company_id());

-- 2. Restrict departments access to company members only
DROP POLICY IF EXISTS "Everyone can view departments" ON public.departments;

CREATE POLICY "Company members can view departments" 
ON public.departments 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE id = auth.uid() 
  AND company_id IS NOT NULL
));

-- 3. Enhance company data protection
DROP POLICY IF EXISTS "Company members can view their company" ON public.companies;

CREATE POLICY "Company members can view basic company info" 
ON public.companies 
FOR SELECT 
USING (id = get_user_company_id());

-- 4. Restrict sensitive company invite data
DROP POLICY IF EXISTS "Company admins can manage invites" ON public.company_invites;

CREATE POLICY "Company admins can manage invites" 
ON public.company_invites 
FOR ALL 
USING (company_id = get_user_company_id() AND is_company_admin());

CREATE POLICY "Users can view their own invites" 
ON public.company_invites 
FOR SELECT 
USING (email = (SELECT email FROM profiles WHERE id = auth.uid()));