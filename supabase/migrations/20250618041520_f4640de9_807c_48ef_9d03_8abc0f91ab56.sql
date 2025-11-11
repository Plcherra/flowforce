
-- Grant admin access to the specific user
-- This updates the user's role to admin so they can access admin features

UPDATE public.profiles 
SET role = 'admin'
WHERE email = 'plcherra@gmail.com';

-- Verify the update
SELECT id, email, first_name, last_name, role, created_at
FROM public.profiles
WHERE email = 'plcherra@gmail.com';
