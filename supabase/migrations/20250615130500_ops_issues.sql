create table if not exists ops_issues (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  kpi_key text,
  issue_type text not null,
  severity text default 'warning',
  title text not null,
  description text,
  status text default 'open',
  source jsonb,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create index if not exists ops_issues_org_idx on ops_issues (org_id, created_at desc);
