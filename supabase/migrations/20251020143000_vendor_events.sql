-- Vendor events table to track external visits linked to schedules

CREATE TABLE IF NOT EXISTS public.vendor_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.inv_locations(id) ON DELETE SET NULL,
  vendor_type text NOT NULL,
  event_date date NOT NULL,
  start_time time without time zone,
  end_time time without time zone,
  shift_id uuid REFERENCES public.schedules(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS vendor_event_company_idx ON public.vendor_event(company_id, event_date);
CREATE INDEX IF NOT EXISTS vendor_event_shift_idx ON public.vendor_event(shift_id);

ALTER TABLE public.vendor_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendor_event_mgr_full_access" ON public.vendor_event;
CREATE POLICY "vendor_event_mgr_full_access"
  ON public.vendor_event
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = company_id
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = company_id
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "vendor_event_employee_read" ON public.vendor_event;
CREATE POLICY "vendor_event_employee_read"
  ON public.vendor_event
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = company_id
    )
    AND (
      EXISTS (
        SELECT 1
        FROM public.schedule_assignments sa
        WHERE sa.user_id = auth.uid()
          AND sa.schedule_id = shift_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.profiles p2
        WHERE p2.id = auth.uid()
          AND p2.role IN ('manager', 'owner', 'company_admin', 'admin')
      )
    )
  );
