-- Create user companies junction table
CREATE TABLE IF NOT EXISTS user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Enable RLS
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_companies
DROP POLICY IF EXISTS "Users can view their own company memberships" ON user_companies;
CREATE POLICY "Users can view their own company memberships" ON user_companies
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Company owners can manage memberships" ON user_companies;
-- Create policy conditionally based on whether owner_id exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'companies' 
    AND column_name = 'owner_id'
  ) THEN
    EXECUTE 'CREATE POLICY "Company owners can manage memberships" ON user_companies
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM companies 
          WHERE companies.id = company_id 
          AND companies.owner_id = auth.uid()
        )
      )';
  ELSE
    -- Fallback to created_by if owner_id doesn't exist
    EXECUTE 'CREATE POLICY "Company owners can manage memberships" ON user_companies
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM companies 
          WHERE companies.id = company_id 
          AND companies.created_by = auth.uid()
        )
      )';
  END IF;
END $$;

-- Create get_user_company_id function
-- Drop all variants of get_user_company_id first
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_user_company_id'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE',
                    func_record.proname,
                    func_record.args);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
BEGIN
  -- Check if owner_id column exists, otherwise use created_by
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'companies' 
    AND column_name = 'owner_id'
  ) THEN
    -- owner_id exists, use it
    RETURN (
      SELECT id FROM companies 
      WHERE owner_id = auth.uid() 
      LIMIT 1
    );
  ELSE
    -- owner_id doesn't exist, use created_by
    RETURN (
      SELECT id FROM companies 
      WHERE created_by = auth.uid() 
      LIMIT 1
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert current user into user_companies table for their owned company
-- Handle owner_id conditionally since it may not exist yet
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'companies' 
    AND column_name = 'owner_id'
  ) THEN
    -- owner_id exists, use it
    INSERT INTO user_companies (user_id, company_id, role)
    SELECT owner_id, id, 'owner'
    FROM companies 
    WHERE owner_id IS NOT NULL
    ON CONFLICT (user_id, company_id) DO NOTHING;
  ELSE
    -- owner_id doesn't exist, use created_by
    INSERT INTO user_companies (user_id, company_id, role)
    SELECT created_by, id, 'owner'
    FROM companies 
    WHERE created_by IS NOT NULL
    ON CONFLICT (user_id, company_id) DO NOTHING;
  END IF;
END $$;