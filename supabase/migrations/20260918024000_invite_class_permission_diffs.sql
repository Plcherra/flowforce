alter table public.company_invites
  add column if not exists role_id text,
  add column if not exists permission_overrides jsonb not null default '{}'::jsonb,
  add column if not exists department_id uuid,
  add column if not exists location_id uuid;

delete from public.user_permissions a
using public.user_permissions b
where a.ctid < b.ctid
  and a.user_id is not distinct from b.user_id
  and a.permission_key is not distinct from b.permission_key;

create unique index if not exists user_permissions_user_id_permission_key_uidx
  on public.user_permissions (user_id, permission_key);
