-- Fix the user profile to have proper owner role and company association
UPDATE profiles 
SET 
  role = 'owner',
  is_company_admin = true,
  company_id = (SELECT id FROM companies WHERE created_by = '779fa725-f005-4341-a076-83d1d4ec3849' LIMIT 1)
WHERE id = '779fa725-f005-4341-a076-83d1d4ec3849';

-- Also verify the company was created by this user
SELECT id, name, created_by, registration_complete FROM companies WHERE created_by = '779fa725-f005-4341-a076-83d1d4ec3849';