-- Grant admin access to the current user
-- This updates the user's role to admin so they can access admin features
-- Note: Changed from 'company_admin' to 'admin' since enum only includes: staff, supervisor, manager, admin, owner

-- Only run if profiles table exists and role column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) AND EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    -- Update first profile to admin role (only if not already admin/owner)
    UPDATE public.profiles 
    SET role = 'admin'::public.user_role
    WHERE id = (
      SELECT id 
      FROM public.profiles 
      ORDER BY created_at ASC 
      LIMIT 1
    )
    AND role::text NOT IN ('admin', 'owner');
  END IF;
END $$;
