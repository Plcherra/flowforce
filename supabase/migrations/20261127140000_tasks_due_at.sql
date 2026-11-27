-- Optional deadline time for tasks (calendar due_date remains for date-only tasks).
alter table public.tasks add column if not exists due_at timestamptz;

comment on column public.tasks.due_at is
  'When set, the task is overdue after this instant (shop-local picker stored as timestamptz). Null keeps date-only due_date behaviour.';

create index if not exists tasks_due_at_open_idx
  on public.tasks (assigned_to, due_at)
  where due_at is not null
    and status in ('todo', 'in_progress', 'review');

notify pgrst, 'reload schema';