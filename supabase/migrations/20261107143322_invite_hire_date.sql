-- Remember the day an invited person starts work.
-- Additive. Existing invite rows stay valid with a null date.
-- Do not apply this from an agent.

alter table public.company_invites
  add column if not exists hire_date date;
