-- Calendar events normalization with participant and shift link tables

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid,
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

ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS store_id uuid;

CREATE INDEX IF NOT EXISTS calendar_events_company_idx
  ON public.calendar_events (company_id, start_time DESC);

CREATE INDEX IF NOT EXISTS calendar_events_type_idx
  ON public.calendar_events (company_id, event_type, start_time DESC);

CREATE INDEX IF NOT EXISTS calendar_events_store_idx
  ON public.calendar_events (company_id, store_id, start_time DESC);

CREATE INDEX IF NOT EXISTS calendar_events_company_start_end_idx
  ON public.calendar_events (company_id, start_time, end_time);

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

-- Participants table providing normalized attendee records

CREATE TABLE IF NOT EXISTS public.event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  email text,
  name text,
  role text,
  avatar_url text,
  response_status text NOT NULL DEFAULT 'invited',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS event_participants_event_idx
  ON public.event_participants (event_id);

CREATE INDEX IF NOT EXISTS event_participants_company_idx
  ON public.event_participants (company_id, event_id);

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_participants_company_read" ON public.event_participants;
CREATE POLICY "event_participants_company_read"
  ON public.event_participants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = event_participants.company_id
    )
  );

DROP POLICY IF EXISTS "event_participants_company_write" ON public.event_participants;
CREATE POLICY "event_participants_company_write"
  ON public.event_participants
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = event_participants.company_id
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = event_participants.company_id
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  );

DROP TRIGGER IF EXISTS set_event_participants_updated_at ON public.event_participants;
CREATE TRIGGER set_event_participants_updated_at
  BEFORE UPDATE ON public.event_participants
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Join table linking events with shifts for scheduling overlays

CREATE TABLE IF NOT EXISTS public.event_shift_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  shift_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_id uuid,
  linked_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS event_shift_links_unique
  ON public.event_shift_links (event_id, shift_id);

CREATE INDEX IF NOT EXISTS event_shift_links_company_idx
  ON public.event_shift_links (company_id, store_id, event_id);

ALTER TABLE public.event_shift_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "event_shift_links_company_read" ON public.event_shift_links;
CREATE POLICY "event_shift_links_company_read"
  ON public.event_shift_links
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = event_shift_links.company_id
    )
  );

DROP POLICY IF EXISTS "event_shift_links_company_write" ON public.event_shift_links;
CREATE POLICY "event_shift_links_company_write"
  ON public.event_shift_links
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = event_shift_links.company_id
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = event_shift_links.company_id
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  );

DROP TRIGGER IF EXISTS set_event_shift_links_updated_at ON public.event_shift_links;
CREATE TRIGGER set_event_shift_links_updated_at
  BEFORE UPDATE ON public.event_shift_links
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
