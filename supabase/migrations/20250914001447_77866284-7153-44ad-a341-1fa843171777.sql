-- Drop the existing status constraint
ALTER TABLE public.inv_counts DROP CONSTRAINT IF EXISTS inv_counts_status_check;

-- Add a new constraint that includes 'planned' status
ALTER TABLE public.inv_counts ADD CONSTRAINT inv_counts_status_check 
CHECK (status = ANY (ARRAY['planned'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]));