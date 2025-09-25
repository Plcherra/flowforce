-- Fix RLS policy for section_templates table that is currently publicly readable
ALTER TABLE section_templates ENABLE ROW LEVEL SECURITY;

-- Create policy to restrict access to section templates - only admins and managers can read
CREATE POLICY "Only admins and managers can view section templates" 
ON section_templates 
FOR SELECT 
USING (is_admin_or_manager(auth.uid()));

-- Update usePermissions hook - add manageInventory permission check for owner role
-- Also improve the permission system to handle the owner role properly