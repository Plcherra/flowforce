-- Add foreign key constraint from announcements to profiles
-- Drop existing constraint first (it might reference auth.users from table creation)
-- Then add the constraint referencing profiles
DO $$ 
BEGIN
  -- Drop existing constraint if it exists
  ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_created_by_fkey;
  
  -- Add the constraint referencing profiles
  ALTER TABLE public.announcements 
  ADD CONSTRAINT announcements_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  -- Constraint already exists, ignore
  NULL;
END $$;