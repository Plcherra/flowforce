-- Add inventory permissions to existing company roles

-- Update supervisor level roles and above to include inventory permissions
UPDATE public.company_roles 
SET permissions = permissions || jsonb_build_object(
  'inventory.view', true,
  'inventory.counts.view', true,
  'inventory.prep.view', true,
  'inventory.waste.view', true,
  'inventory.purchasing.view', CASE WHEN hierarchy_level >= 3 THEN true ELSE false END,
  'inventory.create', CASE WHEN hierarchy_level >= 3 THEN true ELSE false END,
  'inventory.edit', CASE WHEN hierarchy_level >= 3 THEN true ELSE false END,
  'inventory.adjust', CASE WHEN hierarchy_level >= 2 THEN true ELSE false END,
  'inventory.counts.create', CASE WHEN hierarchy_level >= 2 THEN true ELSE false END,
  'inventory.counts.edit', CASE WHEN hierarchy_level >= 2 THEN true ELSE false END,
  'inventory.waste.create', CASE WHEN hierarchy_level >= 2 THEN true ELSE false END,
  'inventory.prep.edit', CASE WHEN hierarchy_level >= 2 THEN true ELSE false END,
  'inventory.purchasing.manage', CASE WHEN hierarchy_level >= 3 THEN true ELSE false END,
  'inventory.import', CASE WHEN hierarchy_level >= 3 THEN true ELSE false END,
  'inventory.export', CASE WHEN hierarchy_level >= 2 THEN true ELSE false END
)
WHERE hierarchy_level >= 2 AND is_active = true;

-- Update staff level roles to include basic inventory view permissions  
UPDATE public.company_roles 
SET permissions = permissions || jsonb_build_object(
  'inventory.view', true,
  'inventory.counts.view', true
)
WHERE hierarchy_level = 1 AND is_active = true;