alter table public.reminders
  add column if not exists allow_deactivate boolean not null default false;
