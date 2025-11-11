-- Create a company for the user since registration didn't complete properly
INSERT INTO companies (
  id,
  name,
  created_by,
  owner_id,
  registration_complete,
  industry,
  size,
  primary_color,
  secondary_color
) VALUES (
  gen_random_uuid(),
  'Pedro''s Company',
  '779fa725-f005-4341-a076-83d1d4ec3849',
  '779fa725-f005-4341-a076-83d1d4ec3849',
  true,
  'Technology',
  '1-10',
  '#3b82f6',
  '#1e40af'
) 
ON CONFLICT DO NOTHING
RETURNING id;

-- Link the user to their company
UPDATE profiles 
SET company_id = (SELECT id FROM companies WHERE created_by = '779fa725-f005-4341-a076-83d1d4ec3849' LIMIT 1)
WHERE id = '779fa725-f005-4341-a076-83d1d4ec3849';

-- Verify the user is now properly set up
SELECT p.id, p.email, p.role, p.is_company_admin, p.company_id, c.name as company_name
FROM profiles p
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.email = 'plcherra@gmail.com';