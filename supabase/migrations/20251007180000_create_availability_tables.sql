-- Availability locking and request infrastructure

-- Enum definitions ---------------------------------------------------------
CREATE TYPE IF NOT EXISTS public.availability_lock_mode AS ENUM ('auto', 'open', 'lock');
CREATE TYPE IF NOT EXISTS public.availability_request_status AS ENUM ('pending', 'approved', 'denied');

-- org_prefs ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_prefs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  availability_lock_mode public.availability_lock_mode NOT NULL DEFAULT 'open',
  auto_lock_day_of_week integer NOT NULL DEFAULT 4 CHECK (auto_lock_day_of_week BETWEEN 0 AND 6),
  auto_lock_hour integer NOT NULL DEFAULT 17 CHECK (auto_lock_hour BETWEEN 0 AND 23),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS org_prefs_single_row_idx ON public.org_prefs ((1));

-- availability_request -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.availability_request (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL,
  week_start date NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.availability_request_status NOT NULL DEFAULT 'pending',
  manager_id uuid,
  decision_note text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS availability_request_employee_week_idx
  ON public.availability_request (employee_id, week_start);

-- availability_exception ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.availability_exception (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS availability_exception_employee_idx
  ON public.availability_exception (employee_id, start_date, end_date);

-- audit_log ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS audit_log_actor_idx ON public.audit_log (actor_id);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON public.audit_log (entity, entity_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log (created_at DESC);

-- updated_at triggers ------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    CREATE TRIGGER set_org_prefs_updated_at
      BEFORE UPDATE ON public.org_prefs
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

    CREATE TRIGGER set_availability_request_updated_at
      BEFORE UPDATE ON public.availability_request
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

    CREATE TRIGGER set_availability_exception_updated_at
      BEFORE UPDATE ON public.availability_exception
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END
$$;

-- Seed data ----------------------------------------------------------------
INSERT INTO public.org_prefs (id, availability_lock_mode, auto_lock_day_of_week, auto_lock_hour)
VALUES ('00000000-0000-0000-0000-000000000001', 'auto', 4, 17)
ON CONFLICT (id) DO UPDATE
SET availability_lock_mode = EXCLUDED.availability_lock_mode,
    auto_lock_day_of_week = EXCLUDED.auto_lock_day_of_week,
    auto_lock_hour = EXCLUDED.auto_lock_hour;
