begin;

-- Ensure there is at least one company available for backfilling tenant references
DO $$
DECLARE
  v_company_id uuid;
  v_creator uuid;
BEGIN
  SELECT id
    INTO v_company_id
    FROM public.companies
    ORDER BY created_at ASC
    LIMIT 1;

  IF v_company_id IS NULL THEN
    SELECT id
      INTO v_creator
      FROM auth.users
      ORDER BY created_at ASC
      LIMIT 1;

    IF v_creator IS NULL THEN
      RAISE EXCEPTION 'Cannot backfill tenant references: no users found in auth.users';
    END IF;

    INSERT INTO public.companies (id, name, created_by)
    VALUES (gen_random_uuid(), 'Default Company', v_creator)
    RETURNING id INTO v_company_id;
  END IF;

  PERFORM set_config('app.default_company_id', v_company_id::text, true);
END
$$;

-- Departments table alignment
ALTER TABLE IF EXISTS public.departments
  ADD COLUMN IF NOT EXISTS company_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'departments'
      AND column_name = 'company_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'departments'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'company_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.departments
               ADD CONSTRAINT departments_company_id_fkey
               FOREIGN KEY (company_id) REFERENCES public.companies(id)';
    END IF;
  END IF;
END
$$;

UPDATE public.departments
SET company_id = current_setting('app.default_company_id')::uuid
WHERE company_id IS NULL
  AND current_setting('app.default_company_id', true) IS NOT NULL;

CREATE INDEX IF NOT EXISTS departments_company_idx
  ON public.departments (company_id);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_tenant_all" ON public.departments;
DROP POLICY IF EXISTS "tenant_isolation" ON public.departments;

CREATE POLICY "tenant_isolation" AS RESTRICTIVE ON public.departments
FOR ALL
USING (
  auth.uid() IN (
    SELECT p.id
    FROM public.profiles AS p
    WHERE p.company_id = public.departments.company_id
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT p.id
    FROM public.profiles AS p
    WHERE p.company_id = public.departments.company_id
  )
);

-- Time off requests alignment
ALTER TABLE IF EXISTS public.time_off_requests
  ADD COLUMN IF NOT EXISTS company_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'time_off_requests'
      AND column_name = 'company_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'time_off_requests'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'company_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.time_off_requests
               ADD CONSTRAINT time_off_requests_company_id_fkey
               FOREIGN KEY (company_id) REFERENCES public.companies(id)';
    END IF;
  END IF;
END
$$;

UPDATE public.time_off_requests
SET company_id = current_setting('app.default_company_id')::uuid
WHERE company_id IS NULL
  AND current_setting('app.default_company_id', true) IS NOT NULL;

CREATE INDEX IF NOT EXISTS time_off_requests_company_idx
  ON public.time_off_requests (company_id);

ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_off_requests FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "time_off_requests_tenant_all" ON public.time_off_requests;
DROP POLICY IF EXISTS "tenant_isolation" ON public.time_off_requests;

CREATE POLICY "tenant_isolation" AS RESTRICTIVE ON public.time_off_requests
FOR ALL
USING (
  auth.uid() IN (
    SELECT p.id
    FROM public.profiles AS p
    WHERE p.company_id = public.time_off_requests.company_id
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT p.id
    FROM public.profiles AS p
    WHERE p.company_id = public.time_off_requests.company_id
  )
);

-- Profiles alignment
ALTER TABLE IF EXISTS public.profiles
  ADD COLUMN IF NOT EXISTS company_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'company_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'profiles'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'company_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.profiles
               ADD CONSTRAINT profiles_company_id_fkey
               FOREIGN KEY (company_id) REFERENCES public.companies(id)';
    END IF;
  END IF;
END
$$;

UPDATE public.profiles
SET company_id = current_setting('app.default_company_id')::uuid
WHERE company_id IS NULL
  AND current_setting('app.default_company_id', true) IS NOT NULL;

CREATE INDEX IF NOT EXISTS profiles_company_id_idx
  ON public.profiles (company_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_isolation" ON public.profiles;

CREATE POLICY "tenant_isolation" AS RESTRICTIVE ON public.profiles
FOR ALL
USING (
  auth.uid() IN (
    SELECT p.id
    FROM public.profiles AS p
    WHERE p.company_id = public.profiles.company_id
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT p.id
    FROM public.profiles AS p
    WHERE p.company_id = public.profiles.company_id
  )
);

-- Schedules alignment
ALTER TABLE IF EXISTS public.schedules
  ADD COLUMN IF NOT EXISTS company_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'schedules'
      AND column_name = 'company_id'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'schedules'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'company_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.schedules
               ADD CONSTRAINT schedules_company_id_fkey
               FOREIGN KEY (company_id) REFERENCES public.companies(id)';
    END IF;
  END IF;
END
$$;

UPDATE public.schedules
SET company_id = current_setting('app.default_company_id')::uuid
WHERE company_id IS NULL
  AND current_setting('app.default_company_id', true) IS NOT NULL;

CREATE INDEX IF NOT EXISTS schedules_company_id_idx
  ON public.schedules (company_id);

ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "schedules_tenant_all" ON public.schedules;
DROP POLICY IF EXISTS "tenant_isolation" ON public.schedules;

CREATE POLICY "tenant_isolation" AS RESTRICTIVE ON public.schedules
FOR ALL
USING (
  auth.uid() IN (
    SELECT p.id
    FROM public.profiles AS p
    WHERE p.company_id = public.schedules.company_id
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT p.id
    FROM public.profiles AS p
    WHERE p.company_id = public.schedules.company_id
  )
);

-- Schedule shifts / legacy shifts support
DO $$
DECLARE
  v_default_company uuid := NULLIF(current_setting('app.default_company_id', true), '')::uuid;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'schedule_shifts'
  ) THEN
    EXECUTE 'ALTER TABLE public.schedule_shifts
             ADD COLUMN IF NOT EXISTS company_id uuid';

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'schedule_shifts'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'company_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.schedule_shifts
               ADD CONSTRAINT schedule_shifts_company_id_fkey
               FOREIGN KEY (company_id) REFERENCES public.companies(id)';
    END IF;

    IF v_default_company IS NOT NULL THEN
      EXECUTE format('UPDATE public.schedule_shifts
                      SET company_id = %L
                      WHERE company_id IS NULL', v_default_company);
    END IF;

    EXECUTE 'CREATE INDEX IF NOT EXISTS schedule_shifts_company_id_idx
             ON public.schedule_shifts (company_id)';

    EXECUTE 'ALTER TABLE public.schedule_shifts ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.schedule_shifts FORCE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "schedule_shifts_tenant_all" ON public.schedule_shifts';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_isolation" ON public.schedule_shifts';

    EXECUTE $$CREATE POLICY "tenant_isolation" AS RESTRICTIVE ON public.schedule_shifts
FOR ALL
USING (
  auth.uid() IN (
    SELECT p.id
    FROM public.profiles AS p
    WHERE p.company_id = public.schedule_shifts.company_id
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT p.id
    FROM public.profiles AS p
    WHERE p.company_id = public.schedule_shifts.company_id
  )
);$$;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'shifts'
  ) THEN
    EXECUTE 'ALTER TABLE public.shifts
             ADD COLUMN IF NOT EXISTS company_id uuid';

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'shifts'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'company_id'
    ) THEN
      EXECUTE 'ALTER TABLE public.shifts
               ADD CONSTRAINT shifts_company_id_fkey
               FOREIGN KEY (company_id) REFERENCES public.companies(id)';
    END IF;

    IF v_default_company IS NOT NULL THEN
      EXECUTE format('UPDATE public.shifts
                      SET company_id = %L
                      WHERE company_id IS NULL', v_default_company);
    END IF;

    EXECUTE 'CREATE INDEX IF NOT EXISTS shifts_company_id_idx
             ON public.shifts (company_id)';

    EXECUTE 'ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.shifts FORCE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS "shifts_tenant_all" ON public.shifts';
    EXECUTE 'DROP POLICY IF EXISTS "tenant_isolation" ON public.shifts';

    EXECUTE $$CREATE POLICY "tenant_isolation" AS RESTRICTIVE ON public.shifts
FOR ALL
USING (
  auth.uid() IN (
    SELECT p.id
    FROM public.profiles AS p
    WHERE p.company_id = public.shifts.company_id
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT p.id
    FROM public.profiles AS p
    WHERE p.company_id = public.shifts.company_id
  )
);$$;
  END IF;
END
$$;

-- Validation guardrails
DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY['departments', 'time_off_requests', 'profiles', 'schedules'] LOOP
    PERFORM 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = v_table
      AND column_name = 'company_id';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Table %.company_id is missing after migration', v_table;
    END IF;

    PERFORM 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = v_table
      AND c.relrowsecurity;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Row level security not enabled for table %', v_table;
    END IF;

    PERFORM 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = v_table
      AND policyname = 'tenant_isolation'
      AND permissive = false;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Restrictive tenant_isolation policy missing for table %', v_table;
    END IF;
  END LOOP;

  -- Optional tables checks if they exist
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'schedule_shifts'
  ) THEN
    PERFORM 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'schedule_shifts'
      AND policyname = 'tenant_isolation'
      AND permissive = false;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Restrictive tenant_isolation policy missing for schedule_shifts';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'shifts'
  ) THEN
    PERFORM 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'shifts'
      AND policyname = 'tenant_isolation'
      AND permissive = false;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Restrictive tenant_isolation policy missing for shifts';
    END IF;
  END IF;
END
$$;

commit;
