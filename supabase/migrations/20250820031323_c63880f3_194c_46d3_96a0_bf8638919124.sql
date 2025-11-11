-- Fix position_assignments table structure and relationships
-- Add proper foreign key for user_id to reference auth.users
ALTER TABLE position_assignments 
DROP CONSTRAINT IF EXISTS position_assignments_user_id_fkey;

ALTER TABLE position_assignments 
ADD CONSTRAINT position_assignments_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_position_assignments_user_id ON position_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_position_assignments_position_id ON position_assignments(position_id);
CREATE INDEX IF NOT EXISTS idx_position_assignments_company_id ON position_assignments(company_id);