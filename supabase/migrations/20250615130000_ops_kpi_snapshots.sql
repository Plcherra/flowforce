create table if not exists ops_kpi_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  kpi_key text not null,
  value numeric not null,
  unit text,
  trend numeric,
  severity text default 'normal',
  metadata jsonb,
  captured_at timestamptz default now()
);

create index if not exists ops_kpi_snapshots_org_key_idx on ops_kpi_snapshots (org_id, kpi_key, captured_at desc);
