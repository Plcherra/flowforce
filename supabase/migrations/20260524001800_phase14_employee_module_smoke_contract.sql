-- Phase 14 forward migration: repair employee module relationships expected by
-- PostgREST embeds in the employees repository.

create index if not exists profiles_department_id_idx
on public.profiles (department_id);

create index if not exists profiles_position_id_idx
on public.profiles (position_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_department_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_department_id_fkey
      foreign key (department_id)
      references public.departments(id)
      on delete set null
      not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_position_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_position_id_fkey
      foreign key (position_id)
      references public.positions(id)
      on delete set null
      not valid;
  end if;
end $$;
