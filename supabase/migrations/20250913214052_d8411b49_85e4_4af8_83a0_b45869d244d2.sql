-- Drop existing restrictive policies if they exist
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

-- Add index for better performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_inventory_categories_company_id 
ON public.inventory_categories(company_id);