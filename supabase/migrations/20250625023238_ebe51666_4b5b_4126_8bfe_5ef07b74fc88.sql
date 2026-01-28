
-- Step 2: Fix function conflicts and optimize RLS policies (corrected)
-- Handle existing policies by dropping them first

-- Drop all variants of get_user_role first
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_user_role'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE',
                    func_record.proname,
                    func_record.args);
  END LOOP;
END $$;

-- Ensure we have the correct version with parameters
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT role::TEXT FROM public.profiles WHERE id = user_uuid LIMIT 1);
END;
$$;

-- Companies table - drop existing and recreate
DROP POLICY IF EXISTS "Company members can view their company" ON public.companies;
DROP POLICY IF EXISTS "Company admins can manage their company" ON public.companies;
DROP POLICY IF EXISTS "Company admins can update their company" ON public.companies;
DROP POLICY IF EXISTS "Company admins can insert companies" ON public.companies;

CREATE POLICY "Company members can view their company" 
  ON public.companies 
  FOR SELECT 
  USING (id = public.get_user_company_id());

CREATE POLICY "Company admins can manage their company" 
  ON public.companies 
  FOR ALL 
  USING (id = public.get_user_company_id() AND public.is_company_admin());

-- Company invites - drop existing and recreate
DROP POLICY IF EXISTS "Company admins can manage invites" ON public.company_invites;
DROP POLICY IF EXISTS "Users can view their invites" ON public.company_invites;
DROP POLICY IF EXISTS "Invited users can view their invite" ON public.company_invites;

CREATE POLICY "Company admins can manage invites" 
  ON public.company_invites 
  FOR ALL 
  USING (company_id = public.get_user_company_id() AND public.is_company_admin());

CREATE POLICY "Users can view their invites" 
  ON public.company_invites 
  FOR SELECT 
  USING (email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

-- Company roles - drop existing and recreate
DROP POLICY IF EXISTS "Users can view company roles" ON public.company_roles;
DROP POLICY IF EXISTS "Company admins can manage roles" ON public.company_roles;
DROP POLICY IF EXISTS "Users can view their company roles" ON public.company_roles;
DROP POLICY IF EXISTS "Company admins can manage company roles" ON public.company_roles;

CREATE POLICY "Users can view company roles" 
  ON public.company_roles 
  FOR SELECT 
  USING (company_id = public.get_user_company_id() AND is_active = true);

CREATE POLICY "Company admins can manage roles" 
  ON public.company_roles 
  FOR ALL 
  USING (company_id = public.get_user_company_id() AND public.is_company_admin());

-- Profiles table - add new policies only if they don't exist
DO $$ 
BEGIN
  -- Check if policies exist before creating them
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view profiles in their company') THEN
    CREATE POLICY "Users can view profiles in their company" 
      ON public.profiles 
      FOR SELECT 
      USING (
        id = auth.uid() OR 
        (company_id = public.get_user_company_id() AND company_id IS NOT NULL)
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" 
      ON public.profiles 
      FOR UPDATE 
      USING (id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Company admins can update profiles') THEN
    CREATE POLICY "Company admins can update profiles" 
      ON public.profiles 
      FOR UPDATE 
      USING (
        company_id = public.get_user_company_id() AND 
        public.is_company_admin()
      );
  END IF;
END $$;

-- Add policies for other tables only if they don't exist
DO $$ 
BEGIN
  -- Analytics cache
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'analytics_cache' AND policyname = 'Admins can manage analytics cache') THEN
    CREATE POLICY "Admins can manage analytics cache" 
      ON public.analytics_cache 
      FOR ALL 
      USING (public.get_user_role() = 'admin');
  END IF;

  -- Expenses
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Users can view their expenses') THEN
    CREATE POLICY "Users can view their expenses" 
      ON public.expenses 
      FOR SELECT 
      USING (employee_id = auth.uid() OR created_by = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'Users can create expenses') THEN
    CREATE POLICY "Users can create expenses" 
      ON public.expenses 
      FOR INSERT 
      WITH CHECK (employee_id = auth.uid() OR created_by = auth.uid());
  END IF;

  -- Payments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'Company admins can manage payments') THEN
    CREATE POLICY "Company admins can manage payments" 
      ON public.payments 
      FOR ALL 
      USING (public.is_company_admin());
  END IF;

  -- Inventory items
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_items' AND policyname = 'Company members can view inventory') THEN
    CREATE POLICY "Company members can view inventory" 
      ON public.inventory_items 
      FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() 
          AND company_id = public.get_user_company_id()
        )
      );
  END IF;

  -- Inventory categories
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_categories' AND policyname = 'Company members can view inventory categories') THEN
    CREATE POLICY "Company members can view inventory categories" 
      ON public.inventory_categories 
      FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() 
          AND company_id = public.get_user_company_id()
        )
      );
  END IF;

  -- Inventory transactions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_transactions' AND policyname = 'Company members can view inventory transactions') THEN
    CREATE POLICY "Company members can view inventory transactions" 
      ON public.inventory_transactions 
      FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles 
          WHERE id = auth.uid() 
          AND company_id = public.get_user_company_id()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory_transactions' AND policyname = 'Company members can create inventory transactions') THEN
    CREATE POLICY "Company members can create inventory transactions" 
      ON public.inventory_transactions 
      FOR INSERT 
      WITH CHECK (performed_by = auth.uid());
  END IF;
END $$;
