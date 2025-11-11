-- Add company_id to inventory_categories table
ALTER TABLE public.inventory_categories 
ADD COLUMN company_id UUID REFERENCES public.companies(id);

-- Update existing categories to belong to the first company (or handle as needed)
-- This is a one-time migration - in production you'd want a more sophisticated approach
UPDATE public.inventory_categories 
SET company_id = (SELECT id FROM public.companies LIMIT 1)
WHERE company_id IS NULL;

-- Make company_id NOT NULL after setting existing values
ALTER TABLE public.inventory_categories 
ALTER COLUMN company_id SET NOT NULL;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins and managers can manage inventory categories" ON public.inventory_categories;
DROP POLICY IF EXISTS "Admins and managers can view inventory categories" ON public.inventory_categories;
DROP POLICY IF EXISTS "Company members can view inventory categories" ON public.inventory_categories;

-- Create new policies that allow company members to manage their own categories
CREATE POLICY "Company members can view their categories" 
ON public.inventory_categories 
FOR SELECT 
USING (company_id = get_user_company_id());

CREATE POLICY "Company members can create categories" 
ON public.inventory_categories 
FOR INSERT 
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Company members can update their categories" 
ON public.inventory_categories 
FOR UPDATE 
USING (company_id = get_user_company_id())
WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Company members can delete their categories" 
ON public.inventory_categories 
FOR DELETE 
USING (company_id = get_user_company_id());

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_inventory_categories_company_id 
ON public.inventory_categories(company_id);