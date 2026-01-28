
-- First, drop ALL existing policies that we need to recreate
DROP POLICY IF EXISTS "Users can view their company roles" ON public.company_roles;
DROP POLICY IF EXISTS "Admins can manage company roles" ON public.company_roles;
DROP POLICY IF EXISTS "Users can view role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can manage role permissions" ON public.role_permissions;

-- Create companies table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  industry text,
  size text,
  description text,
  website text,
  phone text,
  logo_url text,
  primary_color text DEFAULT '#3b82f6',
  secondary_color text DEFAULT '#1e40af',
  template_id text,
  template_name text,
  enabled_sections jsonb DEFAULT '[]'::jsonb,
  custom_roles jsonb DEFAULT '[]'::jsonb,
  positions jsonb DEFAULT '[]'::jsonb,
  template_config jsonb DEFAULT '{}'::jsonb,
  timezone text DEFAULT 'UTC',
  working_hours jsonb DEFAULT '{"start": "09:00", "end": "17:00", "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users NOT NULL
);

-- Create company invites table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS public.company_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies NOT NULL,
  email text NOT NULL,
  role text DEFAULT 'employee',
  invited_by uuid REFERENCES auth.users NOT NULL,
  invite_token text NOT NULL UNIQUE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(company_id, email)
);

-- Update profiles table to include company_id (only add if columns don't exist)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company_id') THEN
    ALTER TABLE public.profiles ADD COLUMN company_id uuid REFERENCES public.companies;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_company_admin') THEN
    ALTER TABLE public.profiles ADD COLUMN is_company_admin boolean DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'invitation_token') THEN
    ALTER TABLE public.profiles ADD COLUMN invitation_token text;
  END IF;
END $$;

-- Update company_roles table only if company_id column doesn't reference companies table
DO $$
BEGIN
  -- Check if company_id column exists and points to companies table
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_roles' AND column_name = 'company_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'company_roles' 
    AND kcu.column_name = 'company_id'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND EXISTS (
      SELECT 1 FROM information_schema.constraint_column_usage ccu
      WHERE ccu.constraint_name = tc.constraint_name
      AND ccu.table_name = 'companies'
    )
  ) THEN
    -- Drop the existing company_id column and recreate it
    ALTER TABLE public.company_roles DROP COLUMN company_id CASCADE;
    ALTER TABLE public.company_roles ADD COLUMN company_id uuid REFERENCES public.companies;
    
    -- Create a default company for existing roles if needed (only if users exist)
    -- Skip if no users exist (fresh DB - companies will be created by app logic)
    IF EXISTS (SELECT 1 FROM auth.users LIMIT 1) AND NOT EXISTS (SELECT 1 FROM public.companies) THEN
      INSERT INTO public.companies (name, created_by) 
      VALUES ('Default Company', (SELECT id FROM auth.users LIMIT 1));
    END IF;
    
    -- Update existing company_roles to reference the first company (only if company exists)
    UPDATE public.company_roles 
    SET company_id = (SELECT id FROM public.companies LIMIT 1)
    WHERE company_id IS NULL
      AND EXISTS (SELECT 1 FROM public.companies);
    
    -- Make company_id NOT NULL only if all rows have been updated
    -- Skip if no companies exist (will be handled by later migrations or app logic)
    IF EXISTS (SELECT 1 FROM public.companies) AND NOT EXISTS (SELECT 1 FROM public.company_roles WHERE company_id IS NULL) THEN
      ALTER TABLE public.company_roles ALTER COLUMN company_id SET NOT NULL;
    END IF;
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;

-- RLS policies for companies
-- Use permissive policy if profiles table doesn't have company_id yet
DROP POLICY IF EXISTS "Company members can view their company" ON public.companies;
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'company_id'
  ) THEN
    CREATE POLICY "Company members can view their company" 
      ON public.companies 
      FOR SELECT 
      USING (id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
  ELSE
    -- Temporary permissive policy until profiles.company_id exists
    CREATE POLICY "Company members can view their company" 
      ON public.companies 
      FOR SELECT 
      USING (true); -- TODO: tighten after profiles.company_id exists
  END IF;
END $$;

DROP POLICY IF EXISTS "Company admins can update their company" ON public.companies;
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'company_id'
  ) AND EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'is_company_admin'
  ) THEN
    CREATE POLICY "Company admins can update their company" 
      ON public.companies 
      FOR UPDATE 
      USING (id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND is_company_admin = true));
  ELSE
    -- Temporary permissive policy until profiles columns exist
    CREATE POLICY "Company admins can update their company" 
      ON public.companies 
      FOR UPDATE 
      USING (true); -- TODO: tighten after profiles.is_company_admin exists
  END IF;
END $$;

DROP POLICY IF EXISTS "Anyone can create a company" ON public.companies;
CREATE POLICY "Anyone can create a company" 
  ON public.companies 
  FOR INSERT 
  WITH CHECK (true);

-- RLS policies for company invites
DROP POLICY IF EXISTS "Company admins can manage invites" ON public.company_invites;
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'company_id'
  ) AND EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'is_company_admin'
  ) THEN
    CREATE POLICY "Company admins can manage invites" 
      ON public.company_invites 
      FOR ALL 
      USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND is_company_admin = true));
  ELSE
    -- Temporary permissive policy until profiles columns exist
    CREATE POLICY "Company admins can manage invites" 
      ON public.company_invites 
      FOR ALL 
      USING (true); -- TODO: tighten after profiles.is_company_admin exists
  END IF;
END $$;

DROP POLICY IF EXISTS "Invited users can view their invite" ON public.company_invites;
CREATE POLICY "Invited users can view their invite" 
  ON public.company_invites 
  FOR SELECT 
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR invite_token IS NOT NULL);

-- Recreate the RLS policies for company_roles
DROP POLICY IF EXISTS "Users can view their company roles" ON public.company_roles;
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'company_id'
  ) THEN
    CREATE POLICY "Users can view their company roles" 
      ON public.company_roles 
      FOR SELECT 
      USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
  ELSE
    CREATE POLICY "Users can view their company roles" 
      ON public.company_roles 
      FOR SELECT 
      USING (true); -- TODO: tighten after profiles.company_id exists
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins can manage company roles" ON public.company_roles;
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'company_id'
  ) AND EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'is_company_admin'
  ) THEN
    CREATE POLICY "Admins can manage company roles" 
      ON public.company_roles 
      FOR ALL 
      USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND is_company_admin = true));
  ELSE
    CREATE POLICY "Admins can manage company roles" 
      ON public.company_roles 
      FOR ALL 
      USING (true); -- TODO: tighten after profiles.is_company_admin exists
  END IF;
END $$;

-- Recreate RLS policies for role_permissions
DROP POLICY IF EXISTS "Users can view role permissions" ON public.role_permissions;
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'company_id'
  ) THEN
    CREATE POLICY "Users can view role permissions" 
      ON public.role_permissions 
      FOR SELECT 
      USING (
        role_id IN (
          SELECT id FROM public.company_roles 
          WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        )
      );
  ELSE
    CREATE POLICY "Users can view role permissions" 
      ON public.role_permissions 
      FOR SELECT 
      USING (true); -- TODO: tighten after profiles.company_id exists
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins can manage role permissions" ON public.role_permissions;
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'company_id'
  ) AND EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'is_company_admin'
  ) THEN
    CREATE POLICY "Admins can manage role permissions" 
      ON public.role_permissions 
      FOR ALL 
      USING (
        role_id IN (
          SELECT id FROM public.company_roles 
          WHERE company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid() AND is_company_admin = true)
        )
      );
  ELSE
    CREATE POLICY "Admins can manage role permissions" 
      ON public.role_permissions 
      FOR ALL 
      USING (true); -- TODO: tighten after profiles.is_company_admin exists
  END IF;
END $$;

-- Update the handle_new_user function to support company registration
-- Drop all variants of handle_new_user first
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE',
                    func_record.proname,
                    func_record.args);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  invite_record RECORD;
BEGIN
  -- Check if this is an invited user
  SELECT * INTO invite_record 
  FROM public.company_invites 
  WHERE email = NEW.email 
    AND status = 'pending' 
    AND expires_at > now()
  LIMIT 1;
  
  IF invite_record.id IS NOT NULL THEN
    -- This is an invited employee
    INSERT INTO public.profiles (
      id, email, first_name, last_name, employee_id, company_id, role, invitation_token
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'New'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', 'Employee'),
      'EMP-' || EXTRACT(YEAR FROM now()) || '-' || LPAD((EXTRACT(EPOCH FROM now()) % 10000)::TEXT, 4, '0'),
      invite_record.company_id,
      COALESCE(invite_record.role::user_role, 'employee'),
      invite_record.invite_token
    );
    
    -- Update invite status
    UPDATE public.company_invites 
    SET status = 'accepted', accepted_at = now() 
    WHERE id = invite_record.id;
  ELSE
    -- This is a company admin registering
    INSERT INTO public.profiles (
      id, email, first_name, last_name, employee_id, role, is_company_admin
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'Company'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', 'Admin'),
      'ADM-' || EXTRACT(YEAR FROM now()) || '-' || LPAD((EXTRACT(EPOCH FROM now()) % 10000)::TEXT, 4, '0'),
      'admin',
      true
    );
  END IF;
  
  -- Assign default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(invite_record.role::user_role, 'admin'));
  
  RETURN NEW;
END;
$function$;

-- Function to generate invite tokens
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS text
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$function$;

-- Function to create company invitation
-- Drop all variants of create_company_invite first
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'create_company_invite'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE',
                    func_record.proname,
                    func_record.args);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.create_company_invite(
  company_uuid uuid,
  invite_email text,
  invite_role text DEFAULT 'employee'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  invite_id uuid;
  token text;
BEGIN
  -- Generate unique token
  token := public.generate_invite_token();
  
  -- Create invitation
  INSERT INTO public.company_invites (
    company_id, email, role, invited_by, invite_token, expires_at
  ) VALUES (
    company_uuid, invite_email, invite_role, auth.uid(), token, now() + interval '7 days'
  ) RETURNING id INTO invite_id;
  
  RETURN invite_id;
END;
$function$;
