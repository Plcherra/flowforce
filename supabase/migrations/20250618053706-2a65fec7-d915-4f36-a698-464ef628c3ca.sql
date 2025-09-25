
-- Update the first user account to admin role
UPDATE public.profiles 
SET role = 'admin'
WHERE id = (
  SELECT id 
  FROM public.profiles 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- Verify the update
SELECT id, email, first_name, last_name, role, created_at
FROM public.profiles
WHERE role = 'admin';
