set search_path = public;

drop table if exists idea_actions cascade;
drop table if exists idea_cycles cascade;
drop table if exists ooda_cycles cascade;
drop type if exists ooda_period cascade;
drop type if exists ooda_status cascade;

create table idea_cycles (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  stage text not null check (stage in ('identify','diagnose','execute','assess')),
  range daterange not null,
  insights jsonb,
  actions jsonb,
  assessments jsonb,
  created_at timestamptz default now()
);

create table idea_actions (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade,
  cycle_id uuid references idea_cycles(id) on delete cascade,
  action_name text not null,
  status text not null default 'pending' check (status in ('pending','executed','failed')),
  result jsonb,
  created_at timestamptz default now()
);

alter table idea_cycles enable row level security;
alter table idea_actions enable row level security;

create policy "idea_cycles_company_isolation"
  on idea_cycles
  using ((company_id)::text = current_setting('request.jwt.claims.company_id', true));

create policy "idea_actions_company_isolation"
  on idea_actions
  using ((company_id)::text = current_setting('request.jwt.claims.company_id', true));
