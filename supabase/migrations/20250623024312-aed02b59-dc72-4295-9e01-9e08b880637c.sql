
-- Create index for time_entries table
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON public.time_entries(user_id);
