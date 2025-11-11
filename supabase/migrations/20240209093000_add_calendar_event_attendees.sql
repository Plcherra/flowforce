-- Ensure the calendar_events table always exposes the attendees column that the
-- application relies on when creating meetings, events, and vendor visits.

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS attendees jsonb;

ALTER TABLE public.calendar_events
  ALTER COLUMN attendees SET DEFAULT '[]'::jsonb;

UPDATE public.calendar_events
  SET attendees = '[]'::jsonb
  WHERE attendees IS NULL;

ALTER TABLE public.calendar_events
  ALTER COLUMN attendees SET NOT NULL;
