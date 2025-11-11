-- Add color and enhanced fields to positions table
ALTER TABLE positions ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#6b7280';
ALTER TABLE positions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE positions ADD COLUMN IF NOT EXISTS company_id UUID;
ALTER TABLE positions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE positions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE positions ADD COLUMN IF NOT EXISTS created_by UUID;

-- Create position_assignments table for staff group assignments
CREATE TABLE IF NOT EXISTS position_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  company_id UUID NOT NULL,
  assigned_by UUID,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, position_id)
);

-- Enable RLS on position_assignments
ALTER TABLE position_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies for position_assignments
CREATE POLICY "Company members can view position assignments"
ON position_assignments FOR SELECT
USING (company_id = get_user_company_id());

CREATE POLICY "Company admins can manage position assignments" 
ON position_assignments FOR ALL
USING (company_id = get_user_company_id() AND is_company_admin());

-- Add RLS policies for positions table
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view positions"
ON positions FOR SELECT
USING (company_id = get_user_company_id() OR company_id IS NULL);

CREATE POLICY "Company admins can manage positions"
ON positions FOR ALL  
USING (company_id = get_user_company_id() AND is_company_admin());

-- Update schedules table to link to positions better
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS position_color TEXT;

-- Create trigger for updating position colors in schedules
CREATE OR REPLACE FUNCTION update_schedule_position_color()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.position_id IS NOT NULL THEN
    SELECT color INTO NEW.position_color 
    FROM positions 
    WHERE id = NEW.position_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_schedule_position_color_trigger
  BEFORE INSERT OR UPDATE ON schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_schedule_position_color();