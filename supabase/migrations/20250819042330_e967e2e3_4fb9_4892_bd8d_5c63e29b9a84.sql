-- Add foreign key constraint from announcements to profiles
ALTER TABLE public.announcements 
ADD CONSTRAINT announcements_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;