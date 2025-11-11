-- Check if inv_waste table exists, if not create it
CREATE TABLE IF NOT EXISTS public.inv_waste (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.inv_items(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.inv_locations(id),
  quantity NUMERIC NOT NULL,
  unit_id UUID REFERENCES public.inv_units(id),
  waste_type TEXT NOT NULL CHECK (waste_type IN ('spoilage', 'prep_error', 'accident', 'theft', 'expired', 'damaged', 'other')),
  reason TEXT,
  cost_impact NUMERIC,
  recorded_by UUID NOT NULL,
  waste_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for inv_waste
ALTER TABLE public.inv_waste ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for inv_waste
CREATE POLICY "Company members can view waste records"
ON public.inv_waste
FOR SELECT
USING (company_id = get_user_company_id());

CREATE POLICY "Staff can manage waste records"
ON public.inv_waste
FOR ALL
USING (company_id = get_user_company_id());

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_inv_waste_company_id ON public.inv_waste(company_id);
CREATE INDEX IF NOT EXISTS idx_inv_waste_item_id ON public.inv_waste(item_id);
CREATE INDEX IF NOT EXISTS idx_inv_waste_date ON public.inv_waste(waste_date);

-- Create trigger to update updated_at column
CREATE OR REPLACE FUNCTION public.update_inv_waste_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inv_waste_updated_at
  BEFORE UPDATE ON public.inv_waste
  FOR EACH ROW
  EXECUTE FUNCTION public.update_inv_waste_updated_at();