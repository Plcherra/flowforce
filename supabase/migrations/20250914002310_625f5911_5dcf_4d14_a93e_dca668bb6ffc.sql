-- Create enhanced unit system for multi-level unit hierarchy (fixed)

-- First, let's enhance the inv_units table to support hierarchical units
ALTER TABLE public.inv_units 
ADD COLUMN IF NOT EXISTS parent_unit_id uuid REFERENCES public.inv_units(id),
ADD COLUMN IF NOT EXISTS conversion_to_parent numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_base_unit boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS packaging_info jsonb DEFAULT '{}';

-- Add comments for clarity
COMMENT ON COLUMN public.inv_units.parent_unit_id IS 'Reference to parent unit in hierarchy (e.g., Pack -> Case)';
COMMENT ON COLUMN public.inv_units.conversion_to_parent IS 'How many of this unit equals 1 parent unit';
COMMENT ON COLUMN public.inv_units.is_base_unit IS 'True if this is the smallest countable unit';
COMMENT ON COLUMN public.inv_units.packaging_info IS 'Additional packaging details like dimensions, weight, etc.';

-- Create table for item-specific unit configurations
CREATE TABLE IF NOT EXISTS public.inv_item_units (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    item_id uuid NOT NULL REFERENCES public.inv_items(id) ON DELETE CASCADE,
    unit_id uuid NOT NULL REFERENCES public.inv_units(id),
    unit_level integer NOT NULL, -- 1=base, 2=pack, 3=case, 4=box, etc.
    conversion_factor numeric NOT NULL DEFAULT 1, -- How many base units this represents
    is_primary boolean DEFAULT false, -- The primary unit for display/ordering
    is_countable boolean DEFAULT true, -- Whether this unit can be counted in inventory
    cost_per_unit numeric,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add unique constraints separately
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'inv_item_units_item_unit_unique'
    ) THEN
        ALTER TABLE public.inv_item_units 
        ADD CONSTRAINT inv_item_units_item_unit_unique UNIQUE(item_id, unit_id);
    END IF;
END $$;

-- Enable RLS on new table
ALTER TABLE public.inv_item_units ENABLE ROW LEVEL SECURITY;

-- Create policies for inv_item_units
DROP POLICY IF EXISTS "Company members can view item units" ON public.inv_item_units;
CREATE POLICY "Company members can view item units"
ON public.inv_item_units FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM inv_items 
        WHERE inv_items.id = inv_item_units.item_id 
        AND inv_items.company_id = get_user_company_id()
    )
);

DROP POLICY IF EXISTS "Managers can manage item units" ON public.inv_item_units;
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
ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.inv_units(id),
ADD COLUMN IF NOT EXISTS unit_level integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS conversion_factor numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS counted_in_base_units numeric,
ADD COLUMN IF NOT EXISTS notes_per_unit jsonb DEFAULT '{}';

-- Add some default unit types to support common packaging hierarchies
INSERT INTO public.inv_units (name, abbreviation, unit_type, is_active, is_base_unit) 
SELECT 'Each', 'EA', 'count', true, true
WHERE NOT EXISTS (SELECT 1 FROM public.inv_units WHERE name = 'Each');

INSERT INTO public.inv_units (name, abbreviation, unit_type, is_active, is_base_unit) 
SELECT 'Pack', 'PK', 'count', true, false
WHERE NOT EXISTS (SELECT 1 FROM public.inv_units WHERE name = 'Pack');

INSERT INTO public.inv_units (name, abbreviation, unit_type, is_active, is_base_unit) 
SELECT 'Case', 'CS', 'count', true, false
WHERE NOT EXISTS (SELECT 1 FROM public.inv_units WHERE name = 'Case');

INSERT INTO public.inv_units (name, abbreviation, unit_type, is_active, is_base_unit) 
SELECT 'Box', 'BX', 'count', true, false
WHERE NOT EXISTS (SELECT 1 FROM public.inv_units WHERE name = 'Box');