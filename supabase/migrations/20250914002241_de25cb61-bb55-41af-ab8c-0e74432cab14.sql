-- Create enhanced unit system for multi-level unit hierarchy

-- First, let's enhance the inv_units table to support hierarchical units
ALTER TABLE public.inv_units 
ADD COLUMN parent_unit_id uuid REFERENCES public.inv_units(id),
ADD COLUMN conversion_to_parent numeric DEFAULT 1,
ADD COLUMN is_base_unit boolean DEFAULT false,
ADD COLUMN packaging_info jsonb DEFAULT '{}';

-- Add comments for clarity
COMMENT ON COLUMN public.inv_units.parent_unit_id IS 'Reference to parent unit in hierarchy (e.g., Pack -> Case)';
COMMENT ON COLUMN public.inv_units.conversion_to_parent IS 'How many of this unit equals 1 parent unit';
COMMENT ON COLUMN public.inv_units.is_base_unit IS 'True if this is the smallest countable unit';
COMMENT ON COLUMN public.inv_units.packaging_info IS 'Additional packaging details like dimensions, weight, etc.';

-- Create table for item-specific unit configurations
CREATE TABLE public.inv_item_units (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id uuid NOT NULL REFERENCES public.inv_items(id) ON DELETE CASCADE,
    unit_id uuid NOT NULL REFERENCES public.inv_units(id),
    unit_level integer NOT NULL, -- 1=base, 2=pack, 3=case, 4=box, etc.
    conversion_factor numeric NOT NULL DEFAULT 1, -- How many base units this represents
    is_primary boolean DEFAULT false, -- The primary unit for display/ordering
    is_countable boolean DEFAULT true, -- Whether this unit can be counted in inventory
    cost_per_unit numeric,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(item_id, unit_id),
    UNIQUE(item_id, unit_level) -- Only one unit per level per item
);

-- Enable RLS on new table
ALTER TABLE public.inv_item_units ENABLE ROW LEVEL SECURITY;

-- Create policies for inv_item_units
CREATE POLICY "Company members can view item units"
ON public.inv_item_units FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM inv_items 
        WHERE inv_items.id = inv_item_units.item_id 
        AND inv_items.company_id = get_user_company_id()
    )
);

CREATE POLICY "Managers can manage item units"
ON public.inv_item_units FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM inv_items 
        WHERE inv_items.id = inv_item_units.item_id 
        AND inv_items.company_id = get_user_company_id()
        AND is_admin_or_manager(auth.uid())
    )
);

-- Update the inv_count_lines table to support multi-unit counting
ALTER TABLE public.inv_count_lines
ADD COLUMN unit_id uuid REFERENCES public.inv_units(id),
ADD COLUMN unit_level integer DEFAULT 1,
ADD COLUMN conversion_factor numeric DEFAULT 1,
ADD COLUMN counted_in_base_units numeric, -- Automatically calculated
ADD COLUMN notes_per_unit jsonb DEFAULT '{}'; -- Notes for each unit level

-- Add trigger to automatically convert counted quantities to base units
CREATE OR REPLACE FUNCTION public.convert_count_to_base_units()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate base units from counted quantity and conversion factor
    IF NEW.counted_quantity IS NOT NULL AND NEW.conversion_factor IS NOT NULL THEN
        NEW.counted_in_base_units = NEW.counted_quantity * NEW.conversion_factor;
    END IF;
    
    -- Recalculate variance in base units
    IF NEW.counted_in_base_units IS NOT NULL AND NEW.expected_quantity IS NOT NULL THEN
        NEW.variance = NEW.counted_in_base_units - NEW.expected_quantity;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER convert_count_to_base_units_trigger
    BEFORE INSERT OR UPDATE ON public.inv_count_lines
    FOR EACH ROW
    EXECUTE FUNCTION public.convert_count_to_base_units();

-- Create table for storing count session preferences (which units to show per item)
CREATE TABLE public.inv_count_preferences (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    count_id uuid NOT NULL REFERENCES public.inv_counts(id) ON DELETE CASCADE,
    item_id uuid NOT NULL REFERENCES public.inv_items(id) ON DELETE CASCADE,
    preferred_units jsonb NOT NULL DEFAULT '[]', -- Array of unit_ids to show in counting interface
    display_order jsonb NOT NULL DEFAULT '[]', -- Order to display units (unit_id -> order)
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(count_id, item_id)
);

-- Enable RLS
ALTER TABLE public.inv_count_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Staff can manage count preferences"
ON public.inv_count_preferences FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM inv_counts c
        JOIN inv_locations l ON l.id = c.location_id
        WHERE c.id = inv_count_preferences.count_id 
        AND l.company_id = get_user_company_id()
    )
);

-- Add some default unit types to support common packaging hierarchies
INSERT INTO public.inv_units (name, abbreviation, unit_type, is_active, is_base_unit) VALUES 
('Each', 'EA', 'count', true, true),
('Pack', 'PK', 'count', true, false),
('Case', 'CS', 'count', true, false),
('Box', 'BX', 'count', true, false),
('Pallet', 'PLT', 'count', true, false)
ON CONFLICT (name) DO NOTHING;

-- Update existing items to have at least a base unit configuration
INSERT INTO public.inv_item_units (item_id, unit_id, unit_level, conversion_factor, is_primary, is_countable)
SELECT 
    i.id,
    u.id,
    1,
    1,
    true,
    true
FROM public.inv_items i
CROSS JOIN public.inv_units u
WHERE u.name = 'Each' 
AND i.unit_id IS NULL
ON CONFLICT (item_id, unit_id) DO NOTHING;