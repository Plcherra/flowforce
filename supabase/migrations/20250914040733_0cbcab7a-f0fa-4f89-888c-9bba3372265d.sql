-- Fix function search path issue by updating the trigger function
CREATE OR REPLACE FUNCTION public.update_inv_waste_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;