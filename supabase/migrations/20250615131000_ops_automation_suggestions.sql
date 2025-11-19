create table if not exists ops_automation_suggestions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  issue_id uuid references ops_issues(id) on delete cascade,
  suggestion_title text not null,
  suggestion_summary text,
  script jsonb not null,
  status text default 'pending',
  created_at timestamptz default now(),
  applied_at timestamptz
);

create index if not exists ops_automation_suggestions_org_idx on ops_automation_suggestions (org_id, created_at desc);
