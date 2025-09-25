-- Add new columns to reminders table for enhanced functionality
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS sound_type TEXT NOT NULL DEFAULT 'default';
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS notification_methods JSONB NOT NULL DEFAULT '["in_app"]'::jsonb;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS repeat_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS repeat_interval TEXT;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS snooze_enabled BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS auto_complete BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS snooze_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.reminders ADD COLUMN IF NOT EXISTS next_reminder_at TIMESTAMP WITH TIME ZONE;