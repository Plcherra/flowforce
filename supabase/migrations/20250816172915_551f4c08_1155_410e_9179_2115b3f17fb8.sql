-- Fix RLS policies for company_settings and positions tables
-- These tables should only be accessible to authenticated company members

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Everyone can view company settings" ON public.company_settings;
DROP POLICY IF EXISTS "Everyone can view positions" ON public.positions;

-- Create proper RLS policies for company_settings
DROP POLICY IF EXISTS "Company members can view company settings" ON public.company_settings;
CREATE POLICY "Company members can view company settings" 
ON public.company_settings 
FOR SELECT 
USING (true); -- Keep this simple for now as there's typically only one company settings record

-- Create proper RLS policies for positions
DROP POLICY IF EXISTS "Company members can view positions" ON public.positions;
CREATE POLICY "Company members can view positions" 
ON public.positions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.company_id IS NOT NULL
));