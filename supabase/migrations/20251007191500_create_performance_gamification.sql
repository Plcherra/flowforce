-- Enums -------------------------------------------------------------------
CREATE TYPE IF NOT EXISTS public.employee_report_category AS ENUM ('performance', 'attendance', 'behavior', 'customer');
CREATE TYPE IF NOT EXISTS public.promotion_status AS ENUM ('pending', 'approved', 'rejected');

-- employee_report ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_report (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL,
  date date NOT NULL,
  category public.employee_report_category NOT NULL,
  severity integer NOT NULL CHECK (severity BETWEEN 1 AND 5),
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS employee_report_employee_idx ON public.employee_report (employee_id, date DESC);

ALTER TABLE public.employee_report
  ADD CONSTRAINT employee_report_employee_fk FOREIGN KEY (employee_id) REFERENCES public.profiles (id) ON DELETE CASCADE;

ALTER TABLE public.employee_report
  ADD CONSTRAINT employee_report_created_by_fk FOREIGN KEY (created_by) REFERENCES public.profiles (id) ON DELETE SET NULL;

-- skill_matrix ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.skill_matrix (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL,
  role text NOT NULL,
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1),
  xp integer NOT NULL DEFAULT 0 CHECK (xp >= 0),
  last_review date,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (employee_id, role)
);

ALTER TABLE public.skill_matrix
  ADD CONSTRAINT skill_matrix_employee_fk FOREIGN KEY (employee_id) REFERENCES public.profiles (id) ON DELETE CASCADE;

-- badge_catalog -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.badge_catalog (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  role text,
  min_level integer,
  icon text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CHECK (min_level IS NULL OR min_level >= 1)
);

-- employee_badge ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_badge (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL,
  badge_code text NOT NULL,
  awarded_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  awarded_by uuid,
  reason text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.employee_badge
  ADD CONSTRAINT employee_badge_employee_fk FOREIGN KEY (employee_id) REFERENCES public.profiles (id) ON DELETE CASCADE;

ALTER TABLE public.employee_badge
  ADD CONSTRAINT employee_badge_badge_fk FOREIGN KEY (badge_code) REFERENCES public.badge_catalog (code) ON DELETE CASCADE;

ALTER TABLE public.employee_badge
  ADD CONSTRAINT employee_badge_awarded_by_fk FOREIGN KEY (awarded_by) REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS employee_badge_employee_idx ON public.employee_badge (employee_id, awarded_at DESC);

-- promotion_proposal ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promotion_proposal (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL,
  proposed_role text NOT NULL,
  proposed_level integer NOT NULL CHECK (proposed_level >= 1),
  rationale text,
  status public.promotion_status NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.promotion_proposal
  ADD CONSTRAINT promotion_proposal_employee_fk FOREIGN KEY (employee_id) REFERENCES public.profiles (id) ON DELETE CASCADE;

ALTER TABLE public.promotion_proposal
  ADD CONSTRAINT promotion_proposal_decided_by_fk FOREIGN KEY (decided_by) REFERENCES public.profiles (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS promotion_proposal_employee_idx ON public.promotion_proposal (employee_id, status);

-- updated_at triggers -----------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    CREATE TRIGGER set_employee_report_updated_at
      BEFORE UPDATE ON public.employee_report
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

    CREATE TRIGGER set_skill_matrix_updated_at
      BEFORE UPDATE ON public.skill_matrix
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

    CREATE TRIGGER set_badge_catalog_updated_at
      BEFORE UPDATE ON public.badge_catalog
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

    CREATE TRIGGER set_employee_badge_updated_at
      BEFORE UPDATE ON public.employee_badge
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

    CREATE TRIGGER set_promotion_proposal_updated_at
      BEFORE UPDATE ON public.promotion_proposal
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END
$$;
