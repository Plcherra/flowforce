-- Core rule engine schema: rule catalog, conditions, actions, targets, audits

create extension if not exists "uuid-ossp";

create table if not exists public.app_rules (
  id uuid primary key default uuid_generate_v4(),
  slug text not null unique,
  name text not null,
  description text,
  resource text not null,
  trigger text not null,
  severity text not null default 'warning' check (severity in ('info','warning','blocking')),
  is_enabled boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Each condition references a rule and contains a simple expression definition
create table if not exists public.app_rule_conditions (
  id uuid primary key default uuid_generate_v4(),
  rule_id uuid not null references public.app_rules(id) on delete cascade,
  group_index integer not null default 0,
  condition_index integer not null default 0,
  conjunction text not null default 'AND' check (conjunction in ('AND','OR')),
  field text not null,
  operator text not null,
  value jsonb,
  created_at timestamptz not null default now()
);

-- Actions describe what the system should do when a rule fires
create table if not exists public.app_rule_actions (
  id uuid primary key default uuid_generate_v4(),
  rule_id uuid not null references public.app_rules(id) on delete cascade,
  action_type text not null,
  config jsonb,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- Target scoping: limit a rule to a company, location, role, team, etc.
create table if not exists public.app_rule_targets (
  id uuid primary key default uuid_generate_v4(),
  rule_id uuid not null references public.app_rules(id) on delete cascade,
  target_type text not null,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Audit trail for rule evaluations (not limited to scheduling)
create table if not exists public.app_rule_audits (
  id uuid primary key default uuid_generate_v4(),
  rule_id uuid not null references public.app_rules(id) on delete cascade,
  workflow_id uuid,
  resource text not null,
  action text not null,
  actor_id uuid,
  actor_role text,
  status text not null check (status in ('allowed','warning','blocked')),
  message text,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_rule_conditions_rule on public.app_rule_conditions(rule_id);
create index if not exists idx_app_rule_actions_rule on public.app_rule_actions(rule_id);
create index if not exists idx_app_rule_targets_rule on public.app_rule_targets(rule_id);
create index if not exists idx_app_rule_audits_rule on public.app_rule_audits(rule_id);
create index if not exists idx_app_rule_audits_resource on public.app_rule_audits(resource);

