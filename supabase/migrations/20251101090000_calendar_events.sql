-- Calendar events to store meetings, events and vendor visits

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  location text,
  event_type text NOT NULL DEFAULT 'event',
  color text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  attendees jsonb NOT NULL DEFAULT '[]'::jsonb,
  related_shift_ids uuid[] NOT NULL DEFAULT '{}',
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  vendor jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS calendar_events_company_idx
  ON public.calendar_events (company_id, start_time DESC);

CREATE INDEX IF NOT EXISTS calendar_events_type_idx
  ON public.calendar_events (company_id, event_type, start_time DESC);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_events_company_read" ON public.calendar_events;
CREATE POLICY "calendar_events_company_read"
  ON public.calendar_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = calendar_events.company_id
    )
  );

DROP POLICY IF EXISTS "calendar_events_company_write" ON public.calendar_events;
CREATE POLICY "calendar_events_company_write"
  ON public.calendar_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = calendar_events.company_id
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = calendar_events.company_id
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  );

DROP TRIGGER IF EXISTS set_calendar_events_updated_at ON public.calendar_events;
CREATE TRIGGER set_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
