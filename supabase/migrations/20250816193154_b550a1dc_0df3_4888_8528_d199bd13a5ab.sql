-- Link the user to their company
UPDATE profiles 
SET company_id = (SELECT id FROM companies WHERE created_by = '779fa725-f005-4341-a076-83d1d4ec3849' LIMIT 1)
WHERE id = '779fa725-f005-4341-a076-83d1d4ec3849';