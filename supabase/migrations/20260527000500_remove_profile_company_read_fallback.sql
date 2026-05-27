-- Remove the legacy company read policy that treated profiles.company_id as
-- tenant membership. The v1 tenant source of truth is company_members.

drop policy if exists "Users can read their company" on public.companies;

drop policy if exists "Company members can read companies" on public.companies;
create policy "Company members can read companies"
on public.companies
for select
to authenticated
using (id in (select public.current_user_company_ids()));
