-- Fix RLS policies for company_settings and positions tables
-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Everyone can view company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Company members can view company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Everyone can view positions" ON public.positions;
DROP POLICY IF EXISTS "Company members can view positions" ON public.positions;

-- Create secure RLS policies for company_settings
CREATE POLICY "Authenticated users can view company settings" 
ON public.company_settings 
FOR SELECT 
TO authenticated
USING (true);

-- Create secure RLS policies for positions  
CREATE POLICY "Company members can view positions" 
ON public.positions 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.company_id IS NOT NULL
));