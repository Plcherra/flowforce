-- Create Owner company role with full permissions
INSERT INTO company_roles (
  id,
  company_id, 
  name, 
  description, 
  hierarchy_level, 
  permissions,
  color,
  icon,
  is_system_role,
  created_by
) VALUES (
  gen_random_uuid(),
  '3a14492e-0a85-4a94-bb2a-a0a06f59f72e',
  'Owner', 
  'Company Owner with full access',
  100, -- Highest hierarchy level
  '{
    "editOwnProfile": true,
    "viewOwnProfile": true,
    "viewOwnSchedules": true,
    "viewOwnTasks": true,
    "viewTeamProfiles": true,
    "viewTeamSchedules": true,
    "viewTeamTasks": true,
    "inventory.view": true,
    "inventory.create": true,
    "inventory.edit": true,
    "inventory.adjust": true,
    "inventory.import": true,
    "inventory.export": true,
    "inventory.counts.view": true,
    "inventory.counts.create": true,
    "inventory.counts.edit": true,
    "inventory.prep.view": true,
    "inventory.prep.edit": true,
    "inventory.waste.view": true,
    "inventory.waste.create": true,
    "inventory.purchasing.view": true,
    "inventory.purchasing.manage": true
  }'::jsonb,
  '#7C3AED',
  'Crown',
  true,
  '779fa725-f005-4341-a076-83d1d4ec3849'
);

-- Update user profile to reference the Owner role
UPDATE profiles 
SET role_id = (
  SELECT id FROM company_roles 
  WHERE company_id = '3a14492e-0a85-4a94-bb2a-a0a06f59f72e' 
  AND name = 'Owner'
)
WHERE id = '779fa725-f005-4341-a076-83d1d4ec3849';