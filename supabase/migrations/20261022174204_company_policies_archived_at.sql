-- Retire a company policy without deleting the row or its requests.

alter table public.company_policies
  add column if not exists archived_at timestamptz;
