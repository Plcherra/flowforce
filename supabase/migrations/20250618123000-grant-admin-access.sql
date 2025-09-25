
-- Grant admin access to the current user
-- This updates the user's role to company_admin so they can access admin features

-- First, let's check if there are any profiles and update the first one to be company_admin
-- This is typically the account owner who should have admin access
UPDATE public.profiles 
SET role = 'company_admin'
WHERE id = (
  SELECT id 
  FROM public.profiles 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- Alternative: If you know the specific email, you can target that user directly
-- Uncomment and modify the email below if needed:
-- UPDATE public.profiles 
-- SET role = 'company_admin'
-- WHERE email = 'your-email@example.com';

-- Verify the update
SELECT id, email, first_name, last_name, role, created_at
FROM public.profiles
WHERE role = 'company_admin';
