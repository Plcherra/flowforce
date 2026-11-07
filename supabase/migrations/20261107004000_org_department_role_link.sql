-- Additive link from a company role to its department, plus department
-- permission defaults. Existing rows stay valid. Do not apply from an agent.

alter table public.departments
  add column if not exists permissions jsonb not null default '{}'::jsonb;

alter table public.company_roles
  add column if not exists department_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'company_roles_department_id_fkey'
  ) then
    alter table public.company_roles
      add constraint company_roles_department_id_fkey
      foreign key (department_id)
      references public.departments (id)
      on delete set null
      not valid;
  end if;
end $$;
