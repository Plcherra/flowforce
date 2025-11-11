-- Create inventory units table for standardized unit management
CREATE TABLE public.inv_units (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('weight', 'volume', 'count')),
  conversion_factor NUMERIC DEFAULT 1,
  base_unit_id UUID REFERENCES public.inv_units(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inv_units ENABLE ROW LEVEL SECURITY;

-- Create policies for inventory units
CREATE POLICY "Everyone can view active units" 
ON public.inv_units 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage units" 
ON public.inv_units 
FOR ALL 
USING (is_admin_or_manager(auth.uid()));

-- Insert common units
INSERT INTO public.inv_units (name, abbreviation, unit_type) VALUES
-- Weight units
('Gram', 'g', 'weight'),
('Kilogram', 'kg', 'weight'),
('Pound', 'lb', 'weight'),
('Ounce', 'oz', 'weight'),
-- Volume units
('Milliliter', 'ml', 'volume'),
('Liter', 'L', 'volume'),
('Gallon', 'gal', 'volume'),
('Quart', 'qt', 'volume'),
('Pint', 'pt', 'volume'),
('Fluid Ounce', 'fl oz', 'volume'),
-- Count units
('Each', 'ea', 'count'),
('Piece', 'pc', 'count'),
('Dozen', 'doz', 'count'),
('Case', 'case', 'count'),
('Box', 'box', 'count');

-- Add trigger for updated_at
CREATE TRIGGER update_inv_units_updated_at
  BEFORE UPDATE ON public.inv_units
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();