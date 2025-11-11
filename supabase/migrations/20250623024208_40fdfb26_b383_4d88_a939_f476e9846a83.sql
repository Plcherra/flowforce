
-- Create index for schedules table
CREATE INDEX IF NOT EXISTS idx_schedules_user_id ON public.schedules(user_id);
