-- Phase 4 forward migration: extend tenant RLS from core setup tables to the
-- highest-risk business tables that already carry, or clearly require,
-- company_id scoping.

alter table public.payments add column if not exists company_id uuid;
alter table public.expenses add column if not exists company_id uuid;
alter table public.inventory_items add column if not exists company_id uuid;
alter table public.inventory_transactions add column if not exists company_id uuid;

update public.payments pay
set company_id = p.company_id
from public.profiles p
where pay.company_id is null
  and pay.created_by = p.id
  and p.company_id is not null;

update public.expenses exp
set company_id = p.company_id
from public.profiles p
where exp.company_id is null
  and coalesce(exp.employee_id, exp.created_by, exp.approved_by) = p.id
  and p.company_id is not null;

update public.inventory_items item
set company_id = p.company_id
from public.profiles p
where item.company_id is null
  and item.created_by = p.id
  and p.company_id is not null;

update public.inventory_transactions txn
set company_id = item.company_id
from public.inventory_items item
where txn.company_id is null
  and item.id::text = txn.item_id
  and item.company_id is not null;

update public.inventory_transactions txn
set company_id = p.company_id
from public.profiles p
where txn.company_id is null
  and p.id::text = txn.performed_by
  and p.company_id is not null;

create index if not exists payments_company_id_idx on public.payments (company_id);
create index if not exists expenses_company_id_idx on public.expenses (company_id);
create index if not exists inventory_items_company_id_idx on public.inventory_items (company_id);
create index if not exists inventory_transactions_company_id_idx on public.inventory_transactions (company_id);
create index if not exists tasks_company_id_idx on public.tasks (company_id);
create index if not exists calendar_events_company_id_idx on public.calendar_events (company_id);
create index if not exists company_updates_company_id_idx on public.company_updates (company_id);

grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.task_comments to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.goal_tasks to authenticated;
grant select, insert, update, delete on public.calendar_events to authenticated;
grant select, insert, update, delete on public.event_participants to authenticated;
grant select, insert, update, delete on public.event_shift_links to authenticated;
grant select, insert, update, delete on public.company_updates to authenticated;
grant select, insert, update, delete on public.company_update_comments to authenticated;
grant select, insert, update, delete on public.company_update_reactions to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;
grant select, insert, update, delete on public.inventory_items to authenticated;
grant select, insert, update, delete on public.inventory_transactions to authenticated;

alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.goals enable row level security;
alter table public.goal_tasks enable row level security;
alter table public.calendar_events enable row level security;
alter table public.event_participants enable row level security;
alter table public.event_shift_links enable row level security;
alter table public.company_updates enable row level security;
alter table public.company_update_comments enable row level security;
alter table public.company_update_reactions enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.inventory_items enable row level security;
alter table public.inventory_transactions enable row level security;

drop policy if exists "Company members can manage tasks" on public.tasks;
create policy "Company members can manage tasks"
on public.tasks
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage task comments" on public.task_comments;
create policy "Company members can manage task comments"
on public.task_comments
for all
to authenticated
using (
  exists (
    select 1
    from public.tasks t
    where t.id::text = task_comments.task_id
      and t.company_id in (select public.current_user_company_ids())
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.tasks t
    where t.id::text = task_comments.task_id
      and t.company_id in (select public.current_user_company_ids())
  )
);

drop policy if exists "Company members can manage goals" on public.goals;
create policy "Company members can manage goals"
on public.goals
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage goal task links" on public.goal_tasks;
create policy "Company members can manage goal task links"
on public.goal_tasks
for all
to authenticated
using (
  exists (
    select 1
    from public.goals g
    where g.id::text = goal_tasks.goal_id
      and g.company_id in (select public.current_user_company_ids())
  )
)
with check (
  exists (
    select 1
    from public.goals g
    where g.id::text = goal_tasks.goal_id
      and g.company_id in (select public.current_user_company_ids())
  )
);

drop policy if exists "Company members can manage calendar events" on public.calendar_events;
create policy "Company members can manage calendar events"
on public.calendar_events
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage event participants" on public.event_participants;
create policy "Company members can manage event participants"
on public.event_participants
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage event shift links" on public.event_shift_links;
create policy "Company members can manage event shift links"
on public.event_shift_links
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage company updates" on public.company_updates;
create policy "Company members can manage company updates"
on public.company_updates
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage company update comments" on public.company_update_comments;
create policy "Company members can manage company update comments"
on public.company_update_comments
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage company update reactions" on public.company_update_reactions;
create policy "Company members can manage company update reactions"
on public.company_update_reactions
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  user_id = auth.uid()
  and company_id in (select public.current_user_company_ids())
);

drop policy if exists "Company members can manage payments" on public.payments;
create policy "Company members can manage payments"
on public.payments
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage expenses" on public.expenses;
create policy "Company members can manage expenses"
on public.expenses
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage inventory items" on public.inventory_items;
create policy "Company members can manage inventory items"
on public.inventory_items
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

drop policy if exists "Company members can manage inventory transactions" on public.inventory_transactions;
create policy "Company members can manage inventory transactions"
on public.inventory_transactions
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

notify pgrst, 'reload schema';
