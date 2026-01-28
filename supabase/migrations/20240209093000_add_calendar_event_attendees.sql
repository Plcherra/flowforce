-- Ensure the calendar_events table always exposes the attendees column that the
-- application relies on when creating meetings, events, and vendor visits.
-- This migration is idempotent and safe to run even if the table doesn't exist yet
-- (the table creation migration 20251101090000_calendar_events.sql already includes attendees)

DO $$
BEGIN
  -- Only run if the table exists
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'calendar_events'
  ) THEN
    -- Add column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'calendar_events' 
      AND column_name = 'attendees'
    ) THEN
      ALTER TABLE public.calendar_events
        ADD COLUMN attendees jsonb;
    END IF;

    -- Set default if column exists
    ALTER TABLE public.calendar_events
      ALTER COLUMN attendees SET DEFAULT '[]'::jsonb;

    -- Update null values
    UPDATE public.calendar_events
      SET attendees = '[]'::jsonb
      WHERE attendees IS NULL;

    -- Set NOT NULL constraint (only if column exists and has no nulls)
    BEGIN
      ALTER TABLE public.calendar_events
        ALTER COLUMN attendees SET NOT NULL;
    EXCEPTION
      WHEN OTHERS THEN
        -- Ignore if constraint already exists or can't be set
        NULL;
    END;
  END IF;
END $$;
