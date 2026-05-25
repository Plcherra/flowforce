-- Phase 14 forward migration: repair custom sections contract used by the
-- app shell navigation and module smoke tests.

alter table public.custom_section_pages
  alter column section_id type uuid
  using case
    when section_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then section_id::uuid
    else null
  end;

create index if not exists custom_section_pages_section_id_idx
on public.custom_section_pages (section_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.custom_section_pages'::regclass
      and conname = 'custom_section_pages_section_id_fkey'
  ) then
    alter table public.custom_section_pages
      add constraint custom_section_pages_section_id_fkey
      foreign key (section_id)
      references public.custom_sections(id)
      on delete cascade;
  end if;
end $$;

alter table public.custom_section_pages enable row level security;

grant select, insert, update, delete on public.custom_section_pages to authenticated;

drop policy if exists "Company members can manage custom section pages" on public.custom_section_pages;
create policy "Company members can manage custom section pages"
on public.custom_section_pages
for all
to authenticated
using (
  exists (
    select 1
    from public.custom_sections cs
    where cs.id = custom_section_pages.section_id
      and cs.company_id in (select public.current_user_company_ids())
  )
)
with check (
  exists (
    select 1
    from public.custom_sections cs
    where cs.id = custom_section_pages.section_id
      and cs.company_id in (select public.current_user_company_ids())
  )
);
