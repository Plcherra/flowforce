-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION update_schedule_position_color()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.position_id IS NOT NULL THEN
    SELECT color INTO NEW.position_color 
    FROM positions 
    WHERE id = NEW.position_id;
  END IF;
  RETURN NEW;
END;
$$;