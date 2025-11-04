-- Copilot-driven scheduling schema: employees, coverage templates, and schedule shifts

CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  dedupe_key text NOT NULL,
  display_name text,
  role text NOT NULL,
  secondary_roles text[] NOT NULL DEFAULT ARRAY[]::text[],
  home_store text,
  weekly_max_hours integer NOT NULL DEFAULT 38 CHECK (weekly_max_hours > 0 AND weekly_max_hours <= 60),
  availability jsonb NOT NULL DEFAULT '{}'::jsonb,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (company_id, dedupe_key),
  UNIQUE (company_id, profile_id)
);

CREATE INDEX IF NOT EXISTS employees_company_idx
  ON public.employees (company_id, dedupe_key);

CREATE INDEX IF NOT EXISTS employees_role_idx
  ON public.employees (company_id, role);

ALTER TABLE public.employees
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees readable within tenant"
  ON public.employees
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Employees insert within tenant"
  ON public.employees
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Employees update within tenant"
  ON public.employees
  FOR UPDATE
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Employees delete within tenant"
  ON public.employees
  FOR DELETE
  USING (company_id = public.get_user_company_id());


CREATE TABLE IF NOT EXISTS public.coverage_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  dedupe_key text NOT NULL,
  name text NOT NULL,
  role text NOT NULL,
  location text NOT NULL DEFAULT 'Store 1',
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  required_count integer NOT NULL CHECK (required_count >= 0),
  baseline_required_count integer NOT NULL DEFAULT 0 CHECK (baseline_required_count >= 0),
  forecast_multiplier numeric(6,2) NOT NULL DEFAULT 1.00 CHECK (forecast_multiplier >= 0),
  flex_minutes integer NOT NULL DEFAULT 0 CHECK (flex_minutes >= 0),
  priority smallint NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (company_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS coverage_templates_company_idx
  ON public.coverage_templates (company_id, dedupe_key);

CREATE INDEX IF NOT EXISTS coverage_templates_day_idx
  ON public.coverage_templates (company_id, day_of_week, start_time);

ALTER TABLE public.coverage_templates
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coverage templates readable within tenant"
  ON public.coverage_templates
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Coverage templates insert within tenant"
  ON public.coverage_templates
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Coverage templates update within tenant"
  ON public.coverage_templates
  FOR UPDATE
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Coverage templates delete within tenant"
  ON public.coverage_templates
  FOR DELETE
  USING (company_id = public.get_user_company_id());


CREATE TABLE IF NOT EXISTS public.schedule_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  dedupe_key text NOT NULL,
  coverage_template_id uuid REFERENCES public.coverage_templates (id) ON DELETE SET NULL,
  employee_id uuid REFERENCES public.employees (id) ON DELETE SET NULL,
  schedule_date date NOT NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location text NOT NULL,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'queued', 'published', 'cancelled')),
  published_at timestamptz,
  published_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  drafted_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (company_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS schedule_shifts_company_idx
  ON public.schedule_shifts (company_id, schedule_date);

CREATE INDEX IF NOT EXISTS schedule_shifts_employee_idx
  ON public.schedule_shifts (employee_id, schedule_date);

CREATE INDEX IF NOT EXISTS schedule_shifts_status_idx
  ON public.schedule_shifts (company_id, status);

ALTER TABLE public.schedule_shifts
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Schedule shifts readable within tenant"
  ON public.schedule_shifts
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Schedule shifts insert within tenant"
  ON public.schedule_shifts
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Schedule shifts update within tenant"
  ON public.schedule_shifts
  FOR UPDATE
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Schedule shifts delete within tenant"
  ON public.schedule_shifts
  FOR DELETE
  USING (company_id = public.get_user_company_id());


DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    CREATE TRIGGER update_employees_updated_at
      BEFORE UPDATE ON public.employees
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();

    CREATE TRIGGER update_coverage_templates_updated_at
      BEFORE UPDATE ON public.coverage_templates
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();

    CREATE TRIGGER update_schedule_shifts_updated_at
      BEFORE UPDATE ON public.schedule_shifts
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  ELSIF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_employees_updated_at
      BEFORE UPDATE ON public.employees
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    CREATE TRIGGER update_coverage_templates_updated_at
      BEFORE UPDATE ON public.coverage_templates
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();

    CREATE TRIGGER update_schedule_shifts_updated_at
      BEFORE UPDATE ON public.schedule_shifts
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE public.employees IS 'Company-scoped employees with availability and scheduling metadata.';
COMMENT ON TABLE public.coverage_templates IS 'Planned coverage targets for Copilot-driven scheduling.';
COMMENT ON TABLE public.schedule_shifts IS 'Draft and published shifts generated by Copilot scheduling.';
