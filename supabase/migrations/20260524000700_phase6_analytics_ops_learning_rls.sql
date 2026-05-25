-- Phase 6 forward migration: extend company-scoped RLS to analytics,
-- operations, learning, recognition, and gamification tables.

alter table public.goal_rewards add column if not exists company_id uuid;
alter table public.gamification_xp add column if not exists company_id uuid;

update public.goal_rewards reward
set company_id = g.company_id
from public.goals g
where reward.company_id is null
  and reward.goal_id = g.id::text
  and g.company_id is not null;

update public.goal_rewards reward
set company_id = p.company_id
from public.profiles p
where reward.company_id is null
  and reward.user_id = p.id
  and p.company_id is not null;

update public.gamification_xp xp
set company_id = p.company_id
from public.profiles p
where xp.company_id is null
  and xp.user_id = p.id
  and p.company_id is not null;

create index if not exists kpi_insights_company_id_idx on public.kpi_insights (company_id);
create index if not exists idea_actions_company_id_idx on public.idea_actions (company_id);
create index if not exists idea_cycles_company_id_idx on public.idea_cycles (company_id);
create index if not exists ops_issues_company_id_idx on public.ops_issues (company_id);
create index if not exists ops_automation_suggestions_company_id_idx on public.ops_automation_suggestions (company_id);
create index if not exists ops_kpi_snapshots_company_id_idx on public.ops_kpi_snapshots (company_id);
create index if not exists performance_reviews_company_id_idx on public.performance_reviews (company_id);
create index if not exists daily_insights_company_id_idx on public.daily_insights (company_id);
create index if not exists engagement_scores_company_id_idx on public.engagement_scores (company_id);
create index if not exists documents_company_id_idx on public.documents (company_id);
create index if not exists vendor_visits_company_id_idx on public.vendor_visits (company_id);
create index if not exists gamification_leaderboard_company_id_idx on public.gamification_leaderboard (company_id);
create index if not exists gamification_xp_company_id_idx on public.gamification_xp (company_id);
create index if not exists badge_catalog_company_id_idx on public.badge_catalog (company_id);
create index if not exists employee_certifications_company_id_idx on public.employee_certifications (company_id);
create index if not exists learning_completions_company_id_idx on public.learning_completions (company_id);
create index if not exists training_assignments_company_id_idx on public.training_assignments (company_id);
create index if not exists recognition_award_rules_company_id_idx on public.recognition_award_rules (company_id);
create index if not exists recognition_events_company_id_idx on public.recognition_events (company_id);
create index if not exists goal_rewards_company_id_idx on public.goal_rewards (company_id);

create or replace function public.set_goal_reward_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null and new.goal_id is not null then
    select g.company_id
    into new.company_id
    from public.goals g
    where g.id::text = new.goal_id
    limit 1;
  end if;

  if new.company_id is null and new.user_id is not null then
    select p.company_id
    into new.company_id
    from public.profiles p
    where p.id = new.user_id
    limit 1;
  end if;

  return new;
end;
$$;

drop trigger if exists set_goal_reward_company_id on public.goal_rewards;
create trigger set_goal_reward_company_id
before insert or update on public.goal_rewards
for each row execute function public.set_goal_reward_company_id();

drop trigger if exists set_gamification_xp_company_id on public.gamification_xp;
create trigger set_gamification_xp_company_id
before insert or update on public.gamification_xp
for each row execute function public.set_profile_owned_company_id();

grant select, insert, update, delete on public.kpi_insights to authenticated;
grant select, insert, update, delete on public.idea_actions to authenticated;
grant select, insert, update, delete on public.idea_cycles to authenticated;
grant select, insert, update, delete on public.ops_issues to authenticated;
grant select, insert, update, delete on public.ops_automation_suggestions to authenticated;
grant select, insert, update, delete on public.ops_kpi_snapshots to authenticated;
grant select, insert, update, delete on public.performance_reviews to authenticated;
grant select, insert, update, delete on public.daily_insights to authenticated;
grant select, insert, update, delete on public.engagement_scores to authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant select, insert, update, delete on public.vendor_visits to authenticated;
grant select, insert, update, delete on public.gamification_leaderboard to authenticated;
grant select, insert, update, delete on public.gamification_xp to authenticated;
grant select, insert, update, delete on public.badge_catalog to authenticated;
grant select, insert, update, delete on public.employee_certifications to authenticated;
grant select, insert, update, delete on public.learning_completions to authenticated;
grant select, insert, update, delete on public.training_assignments to authenticated;
grant select, insert, update, delete on public.recognition_award_rules to authenticated;
grant select, insert, update, delete on public.recognition_events to authenticated;
grant select, insert, update, delete on public.goal_rewards to authenticated;

alter table public.kpi_insights enable row level security;
alter table public.idea_actions enable row level security;
alter table public.idea_cycles enable row level security;
alter table public.ops_issues enable row level security;
alter table public.ops_automation_suggestions enable row level security;
alter table public.ops_kpi_snapshots enable row level security;
alter table public.performance_reviews enable row level security;
alter table public.daily_insights enable row level security;
alter table public.engagement_scores enable row level security;
alter table public.documents enable row level security;
alter table public.vendor_visits enable row level security;
alter table public.gamification_leaderboard enable row level security;
alter table public.gamification_xp enable row level security;
alter table public.badge_catalog enable row level security;
alter table public.employee_certifications enable row level security;
alter table public.learning_completions enable row level security;
alter table public.training_assignments enable row level security;
alter table public.recognition_award_rules enable row level security;
alter table public.recognition_events enable row level security;
alter table public.goal_rewards enable row level security;

drop policy if exists "Company members can manage kpi insights" on public.kpi_insights;
create policy "Company members can manage kpi insights" on public.kpi_insights
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage idea actions" on public.idea_actions;
create policy "Company members can manage idea actions" on public.idea_actions
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage idea cycles" on public.idea_cycles;
create policy "Company members can manage idea cycles" on public.idea_cycles
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage ops issues" on public.ops_issues;
create policy "Company members can manage ops issues" on public.ops_issues
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage ops automation suggestions" on public.ops_automation_suggestions;
create policy "Company members can manage ops automation suggestions" on public.ops_automation_suggestions
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage ops kpi snapshots" on public.ops_kpi_snapshots;
create policy "Company members can manage ops kpi snapshots" on public.ops_kpi_snapshots
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage performance reviews" on public.performance_reviews;
create policy "Company members can manage performance reviews" on public.performance_reviews
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage daily insights" on public.daily_insights;
create policy "Company members can manage daily insights" on public.daily_insights
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage engagement scores" on public.engagement_scores;
create policy "Company members can manage engagement scores" on public.engagement_scores
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage documents" on public.documents;
create policy "Company members can manage documents" on public.documents
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage vendor visits" on public.vendor_visits;
create policy "Company members can manage vendor visits" on public.vendor_visits
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage gamification leaderboard" on public.gamification_leaderboard;
create policy "Company members can manage gamification leaderboard" on public.gamification_leaderboard
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage gamification xp" on public.gamification_xp;
create policy "Company members can manage gamification xp" on public.gamification_xp
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    user_id is null
    or exists (
      select 1
      from public.profiles p
      where p.id = gamification_xp.user_id
        and p.company_id = gamification_xp.company_id
    )
  )
);

drop policy if exists "Company members can manage badge catalog" on public.badge_catalog;
create policy "Company members can manage badge catalog" on public.badge_catalog
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage employee certifications" on public.employee_certifications;
create policy "Company members can manage employee certifications" on public.employee_certifications
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    employee_id is null
    or exists (
      select 1
      from public.profiles p
      where p.id = employee_certifications.employee_id
        and p.company_id = employee_certifications.company_id
    )
  )
);

drop policy if exists "Company members can manage learning completions" on public.learning_completions;
create policy "Company members can manage learning completions" on public.learning_completions
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    employee_id is null
    or exists (
      select 1
      from public.profiles p
      where p.id = learning_completions.employee_id
        and p.company_id = learning_completions.company_id
    )
  )
);

drop policy if exists "Company members can manage training assignments" on public.training_assignments;
create policy "Company members can manage training assignments" on public.training_assignments
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    employee_id is null
    or exists (
      select 1
      from public.profiles p
      where p.id = training_assignments.employee_id
        and p.company_id = training_assignments.company_id
    )
  )
);

drop policy if exists "Company members can manage recognition award rules" on public.recognition_award_rules;
create policy "Company members can manage recognition award rules" on public.recognition_award_rules
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage recognition events" on public.recognition_events;
create policy "Company members can manage recognition events" on public.recognition_events
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    user_id is null
    or exists (
      select 1
      from public.profiles p
      where p.id = recognition_events.user_id
        and p.company_id = recognition_events.company_id
    )
  )
);

drop policy if exists "Company members can manage goal rewards" on public.goal_rewards;
create policy "Company members can manage goal rewards" on public.goal_rewards
for all to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    user_id is null
    or exists (
      select 1
      from public.profiles p
      where p.id = goal_rewards.user_id
        and p.company_id = goal_rewards.company_id
    )
  )
);

do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'recognitions'
      and c.relkind = 'v'
  ) then
    execute 'alter view public.recognitions set (security_invoker = true)';
  end if;

  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'vendor_event'
      and c.relkind = 'v'
  ) then
    execute 'alter view public.vendor_event set (security_invoker = true)';
  end if;

  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'calendar_events_full'
      and c.relkind = 'v'
  ) then
    execute 'alter view public.calendar_events_full set (security_invoker = true)';
  end if;

  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'calendar_unified_view'
      and c.relkind = 'v'
  ) then
    execute 'alter view public.calendar_unified_view set (security_invoker = true)';
  end if;
end $$;

grant select on public.recognitions to authenticated;
grant select on public.vendor_event to authenticated;
grant select on public.calendar_events_full to authenticated;
grant select on public.calendar_unified_view to authenticated;

notify pgrst, 'reload schema';
