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
CREATE POLICY "Users can view their own company memberships" ON user_companies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Company owners can manage memberships" ON user_companies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies 
      WHERE companies.id = company_id 
      AND companies.owner_id = auth.uid()
    )
  );

-- Create get_user_company_id function
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
BEGIN
  -- First check if user owns a company
  RETURN (
    SELECT id FROM companies 
    WHERE owner_id = auth.uid() 
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert current user into user_companies table for their owned company
INSERT INTO user_companies (user_id, company_id, role)
SELECT owner_id, id, 'owner'
FROM companies 
WHERE owner_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;