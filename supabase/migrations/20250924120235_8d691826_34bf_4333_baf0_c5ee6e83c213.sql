-- Create user_permissions table for permission overrides
CREATE TABLE IF NOT EXISTS public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permission_key TEXT NOT NULL,
  permission_value TEXT NOT NULL CHECK (permission_value IN ('inherit', 'allow', 'deny')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID,
  UNIQUE(user_id, permission_key)
);

-- Enable RLS on user_permissions
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_permissions
CREATE POLICY "Company admins can manage user permissions" ON public.user_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('admin', 'owner', 'manager')
      AND p.company_id = (
        SELECT company_id FROM public.profiles WHERE id = user_permissions.user_id
      )
    )
  );

CREATE POLICY "Users can view their own permission overrides" ON public.user_permissions
  FOR SELECT USING (user_id = auth.uid());

-- Add role_id to profiles table if it doesn't exist (to link to company_roles)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'role_id' AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role_id UUID REFERENCES public.company_roles(id);
  END IF;
END $$;

-- Create updated_at trigger for user_permissions
CREATE TRIGGER update_user_permissions_updated_at
  BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();