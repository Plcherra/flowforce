
-- Hardened security definer functions with proper search_path

CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT role::TEXT FROM public.profiles WHERE id = user_uuid LIMIT 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_id(user_uuid UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT company_id FROM public.profiles WHERE id = user_uuid LIMIT 1);
END;
$$;

CREATE OR REPLACE FUNCTION public.is_company_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN COALESCE((SELECT is_company_admin FROM public.profiles WHERE id = user_uuid LIMIT 1), false);
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role IN ('admin', 'manager')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_company_invite(company_uuid UUID, invite_email TEXT, invite_role TEXT DEFAULT 'employee')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_id UUID;
  token TEXT;
BEGIN
  -- Generate unique token
  token := public.generate_invite_token();
  
  -- Create invitation
  INSERT INTO public.company_invites (
    company_id, email, role, invited_by, invite_token, expires_at
  ) VALUES (
    company_uuid, invite_email, invite_role, auth.uid(), token, now() + interval '7 days'
  ) RETURNING id INTO invite_id;
  
  RETURN invite_id;
END;
$$;

-- Enable RLS on tables that might be missing it
ALTER TABLE public.company_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- Add missing policies for complete coverage
CREATE POLICY "Users can view their position" 
  ON public.positions 
  FOR SELECT 
  USING (role_id IN (
    SELECT id FROM public.company_roles 
    WHERE company_id = public.get_user_company_id()
  ));
