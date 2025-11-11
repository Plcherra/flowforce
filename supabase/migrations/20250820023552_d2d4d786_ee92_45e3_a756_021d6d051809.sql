-- Add company_id to schedules table
ALTER TABLE public.schedules ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Update existing schedules to have the correct company_id based on creator's profile
UPDATE public.schedules 
SET company_id = (
  SELECT p.company_id 
  FROM public.profiles p 
  WHERE p.id = schedules.created_by
);

-- Make company_id not null after updating existing data
ALTER TABLE public.schedules ALTER COLUMN company_id SET NOT NULL;

-- Add company_id to positions table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'positions' AND column_name = 'company_id') THEN
    ALTER TABLE public.positions ADD COLUMN company_id UUID REFERENCES public.companies(id);
    
    -- Update existing positions with company_id from the first company (for existing data)
    UPDATE public.positions 
    SET company_id = (SELECT id FROM public.companies LIMIT 1)
    WHERE company_id IS NULL;
    
    -- Make company_id not null for positions
    ALTER TABLE public.positions ALTER COLUMN company_id SET NOT NULL;
  END IF;
END $$;

-- Drop existing RLS policies on schedules
DROP POLICY IF EXISTS "Users can view schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can create schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can update schedules" ON public.schedules;
DROP POLICY IF EXISTS "Users can delete schedules" ON public.schedules;

-- Create new RLS policies for schedules with company filtering
CREATE POLICY "Users can view company schedules" ON public.schedules
FOR SELECT USING (
  company_id = get_user_company_id()
);

CREATE POLICY "Users can create company schedules" ON public.schedules
FOR INSERT WITH CHECK (
  company_id = get_user_company_id() AND created_by = auth.uid()
);

CREATE POLICY "Admins and managers can update company schedules" ON public.schedules
FOR UPDATE USING (
  company_id = get_user_company_id() AND 
  (created_by = auth.uid() OR is_admin_or_manager(auth.uid()))
);

CREATE POLICY "Admins and managers can delete company schedules" ON public.schedules
FOR DELETE USING (
  company_id = get_user_company_id() AND 
  (created_by = auth.uid() OR is_admin_or_manager(auth.uid()))
);

-- Update positions RLS policies to include company filtering
DROP POLICY IF EXISTS "Company members can view positions" ON public.positions;
DROP POLICY IF EXISTS "Admins can manage positions" ON public.positions;

CREATE POLICY "Company members can view company positions" ON public.positions
FOR SELECT USING (
  company_id = get_user_company_id()
);

CREATE POLICY "Admins can manage company positions" ON public.positions
FOR ALL USING (
  company_id = get_user_company_id() AND is_admin_or_manager(auth.uid())
);