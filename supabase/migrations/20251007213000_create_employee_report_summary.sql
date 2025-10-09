CREATE TABLE IF NOT EXISTS public.employee_report_summary (
  employee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  summary_text text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (employee_id, week_start)
);
