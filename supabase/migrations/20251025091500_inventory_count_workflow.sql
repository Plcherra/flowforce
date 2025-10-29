-- Inventory count workflow enhancements for day-part counts, review, and logging

-- Extend inventory counts metadata
ALTER TABLE public.inv_counts
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS count_period text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_notes text;

-- Broaden status workflow to support review lifecycle
ALTER TABLE public.inv_counts DROP CONSTRAINT IF EXISTS inv_counts_status_check;

ALTER TABLE public.inv_counts
  ADD CONSTRAINT inv_counts_status_check
  CHECK (
    status = ANY (
      ARRAY[
        'planned'::text,
        'in_progress'::text,
        'awaiting_review'::text,
        'completed'::text,
        'approved'::text,
        'cancelled'::text
      ]
    )
  );

-- Review status lifecycle tracking
ALTER TABLE public.inv_counts DROP CONSTRAINT IF EXISTS inv_counts_review_status_check;

ALTER TABLE public.inv_counts
  ADD CONSTRAINT inv_counts_review_status_check
  CHECK (
    review_status = ANY (
      ARRAY[
        'pending'::text,
        'under_review'::text,
        'approved'::text,
        'rejected'::text
      ]
    )
  );

CREATE INDEX IF NOT EXISTS idx_inv_counts_review_status
  ON public.inv_counts (review_status);

CREATE INDEX IF NOT EXISTS idx_inv_counts_count_period
  ON public.inv_counts (count_period);

-- Map counts to multiple storage locations
CREATE TABLE IF NOT EXISTS public.inv_count_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id uuid NOT NULL REFERENCES public.inv_counts(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES public.inv_locations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (count_id, location_id)
);

ALTER TABLE public.inv_count_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory counts locations - view"
  ON public.inv_count_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.inv_counts c
      JOIN public.inv_locations l ON l.id = public.inv_count_locations.location_id
      WHERE c.id = public.inv_count_locations.count_id
        AND l.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Inventory counts locations - manage"
  ON public.inv_count_locations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.inv_counts c
      JOIN public.inv_locations l ON l.id = public.inv_count_locations.location_id
      WHERE c.id = public.inv_count_locations.count_id
        AND l.company_id = get_user_company_id()
    )
  );

CREATE INDEX IF NOT EXISTS idx_inv_count_locations_count_id
  ON public.inv_count_locations (count_id);

CREATE INDEX IF NOT EXISTS idx_inv_count_locations_location_id
  ON public.inv_count_locations (location_id);

-- Event log for inventory count lifecycle
CREATE TABLE IF NOT EXISTS public.inv_count_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id uuid NOT NULL REFERENCES public.inv_counts(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (
    event_type = ANY (
      ARRAY[
        'created'::text,
        'started'::text,
        'item_counted'::text,
        'note_added'::text,
        'submitted'::text,
        'approved'::text,
        'rejected'::text,
        'reopened'::text
      ]
    )
  ),
  actor_id uuid REFERENCES public.profiles(id),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inv_count_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory count events - view"
  ON public.inv_count_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.inv_counts c
      JOIN public.inv_locations l ON l.id = c.location_id
      WHERE c.id = public.inv_count_events.count_id
        AND l.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Inventory count events - manage"
  ON public.inv_count_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.inv_counts c
      JOIN public.inv_locations l ON l.id = c.location_id
      WHERE c.id = public.inv_count_events.count_id
        AND l.company_id = get_user_company_id()
    )
  );

CREATE INDEX IF NOT EXISTS idx_inv_count_events_count_id
  ON public.inv_count_events (count_id);

CREATE INDEX IF NOT EXISTS idx_inv_count_events_event_type
  ON public.inv_count_events (event_type);

-- Barcode scan log (optional feature flag)
CREATE TABLE IF NOT EXISTS public.inv_count_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id uuid NOT NULL REFERENCES public.inv_counts(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.inv_items(id),
  scanned_code text NOT NULL,
  scan_type text NOT NULL DEFAULT 'barcode' CHECK (scan_type = ANY (ARRAY['barcode'::text, 'qr_code'::text])),
  scanned_by uuid REFERENCES public.profiles(id),
  scanned_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

ALTER TABLE public.inv_count_scans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory count scans - view"
  ON public.inv_count_scans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.inv_counts c
      JOIN public.inv_locations l ON l.id = c.location_id
      WHERE c.id = public.inv_count_scans.count_id
        AND l.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Inventory count scans - manage"
  ON public.inv_count_scans
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.inv_counts c
      JOIN public.inv_locations l ON l.id = c.location_id
      WHERE c.id = public.inv_count_scans.count_id
        AND l.company_id = get_user_company_id()
    )
  );

CREATE INDEX IF NOT EXISTS idx_inv_count_scans_count_id
  ON public.inv_count_scans (count_id);

CREATE INDEX IF NOT EXISTS idx_inv_count_scans_item_id
  ON public.inv_count_scans (item_id);
