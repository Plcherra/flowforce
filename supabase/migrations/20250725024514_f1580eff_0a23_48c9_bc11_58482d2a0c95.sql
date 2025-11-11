-- Add employee profile fields to company_invites table
ALTER TABLE public.company_invites 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT,
ADD COLUMN birth_date DATE,
ADD COLUMN phone TEXT;

-- Update the create_company_invite function to include employee details
CREATE OR REPLACE FUNCTION public.create_company_invite(
  company_uuid uuid, 
  invite_email text, 
  invite_role text DEFAULT 'employee'::text,
  employee_first_name text DEFAULT NULL,
  employee_last_name text DEFAULT NULL,
  employee_birth_date date DEFAULT NULL,
  employee_phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  invite_id UUID;
  token TEXT;
BEGIN
  token := public.generate_invite_token();
  
  INSERT INTO public.company_invites (
    company_id, email, role, invited_by, invite_token, expires_at,
    first_name, last_name, birth_date, phone
  ) VALUES (
    company_uuid, invite_email, invite_role, auth.uid(), token, now() + interval '7 days',
    employee_first_name, employee_last_name, employee_birth_date, employee_phone
  ) RETURNING id INTO invite_id;
  
  RETURN invite_id;
END;
$function$