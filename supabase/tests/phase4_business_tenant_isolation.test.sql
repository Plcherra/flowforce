begin;

create extension if not exists pgtap;

select plan(16);

select set_config('request.jwt.claim.role', 'service_role', true);
reset role;

delete from public.event_shift_links
where company_id in (
  '11000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002'
);
delete from public.event_participants
where company_id in (
  '11000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002'
);
delete from public.calendar_events
where company_id in (
  '11000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002'
);
delete from public.company_update_reactions
where company_id in (
  '11000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002'
);
delete from public.company_update_comments
where company_id in (
  '11000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002'
);
delete from public.company_updates
where company_id in (
  '11000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002'
);
delete from public.task_comments
where task_id in (
  '31000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000002'
);
delete from public.tasks
where company_id in (
  '11000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002'
);
delete from public.payments
where company_id in (
  '11000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002'
);
delete from public.expenses
where company_id in (
  '11000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002'
);
delete from public.inventory_transactions
where company_id in (
  '11000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002'
);
delete from public.inventory_items
where company_id in (
  '11000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002'
);
delete from public.company_members
where company_id in (
  '11000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002'
);
delete from public.profiles
where id in (
  '21000000-0000-4000-8000-000000000001',
  '21000000-0000-4000-8000-000000000002'
);
delete from public.companies
where id in (
  '11000000-0000-4000-8000-000000000001',
  '11000000-0000-4000-8000-000000000002'
);
delete from auth.users
where id in (
  '21000000-0000-4000-8000-000000000001',
  '21000000-0000-4000-8000-000000000002'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
)
values
  ('00000000-0000-0000-0000-000000000000', '21000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase4-owner-a@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false),
  ('00000000-0000-0000-0000-000000000000', '21000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase4-owner-b@example.test', crypt('password', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false);

insert into public.companies (id, name, slug, created_by, owner_id, registration_complete)
values
  ('11000000-0000-4000-8000-000000000001', 'Phase 4 Tenant A', 'phase-4-tenant-a', '21000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', true),
  ('11000000-0000-4000-8000-000000000002', 'Phase 4 Tenant B', 'phase-4-tenant-b', '21000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000002', true);

insert into public.profiles (id, company_id, first_name, last_name, email, role, is_company_admin)
values
  ('21000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'Phase', 'Owner A', 'phase4-owner-a@example.test', 'owner', true),
  ('21000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002', 'Phase', 'Owner B', 'phase4-owner-b@example.test', 'owner', true);

insert into public.company_members (company_id, user_id, role, added_at)
values
  ('11000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'owner', now()),
  ('11000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000002', 'owner', now());

insert into public.tasks (id, company_id, title, status, created_by)
values
  ('31000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'Tenant A task', 'open', '21000000-0000-4000-8000-000000000001'),
  ('31000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002', 'Tenant B task', 'open', '21000000-0000-4000-8000-000000000002');

insert into public.calendar_events (id, company_id, title, event_type, start_time, end_time, created_by)
values
  ('32000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'Tenant A event', 'meeting', now(), now() + interval '1 hour', '21000000-0000-4000-8000-000000000001'),
  ('32000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002', 'Tenant B event', 'meeting', now(), now() + interval '1 hour', '21000000-0000-4000-8000-000000000002');

insert into public.event_participants (company_id, event_id, profile_id, role)
values
  ('11000000-0000-4000-8000-000000000001', '32000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'owner'),
  ('11000000-0000-4000-8000-000000000002', '32000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000002', 'owner');

insert into public.event_shift_links (company_id, event_id, shift_id)
values
  ('11000000-0000-4000-8000-000000000001', '32000000-0000-4000-8000-000000000001', 'shift-a'),
  ('11000000-0000-4000-8000-000000000002', '32000000-0000-4000-8000-000000000002', 'shift-b');

insert into public.company_updates (id, company_id, title, body, status, author_id)
values
  ('33000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'Tenant A update', 'Body A', 'published', '21000000-0000-4000-8000-000000000001'),
  ('33000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002', 'Tenant B update', 'Body B', 'published', '21000000-0000-4000-8000-000000000002');

insert into public.company_update_comments (company_id, update_id, author_id, content)
values
  ('11000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'Comment A'),
  ('11000000-0000-4000-8000-000000000002', '33000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000002', 'Comment B');

insert into public.company_update_reactions (company_id, update_id, user_id, reaction_type)
values
  ('11000000-0000-4000-8000-000000000001', '33000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'like'),
  ('11000000-0000-4000-8000-000000000002', '33000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000002', 'like');

insert into public.payments (company_id, amount, created_by, recipient_name, description, status, currency)
values
  ('11000000-0000-4000-8000-000000000001', 101, '21000000-0000-4000-8000-000000000001', 'Vendor A', 'Payment A', 'pending', 'USD'),
  ('11000000-0000-4000-8000-000000000002', 202, '21000000-0000-4000-8000-000000000002', 'Vendor B', 'Payment B', 'pending', 'USD');

insert into public.expenses (company_id, amount, created_by, employee_id, category, description, status, currency, expense_date)
values
  ('11000000-0000-4000-8000-000000000001', 11, '21000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 'Meals', 'Expense A', 'pending', 'USD', current_date),
  ('11000000-0000-4000-8000-000000000002', 22, '21000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000002', 'Meals', 'Expense B', 'pending', 'USD', current_date);

insert into public.inventory_items (id, company_id, name, created_by)
values
  ('34000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'Item A', '21000000-0000-4000-8000-000000000001'),
  ('34000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000002', 'Item B', '21000000-0000-4000-8000-000000000002');

insert into public.inventory_transactions (company_id, item_id, performed_by, quantity, transaction_type)
values
  ('11000000-0000-4000-8000-000000000001', '34000000-0000-4000-8000-000000000001', '21000000-0000-4000-8000-000000000001', 1, 'adjustment'),
  ('11000000-0000-4000-8000-000000000002', '34000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000002', 2, 'adjustment');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '21000000-0000-4000-8000-000000000001', true);

select is((select count(*) from public.tasks), 1::bigint, 'Tenant A sees only own tasks');
select is((select count(*) from public.calendar_events), 1::bigint, 'Tenant A sees only own calendar events');
select is((select count(*) from public.event_participants), 1::bigint, 'Tenant A sees only own event participants');
select is((select count(*) from public.event_shift_links), 1::bigint, 'Tenant A sees only own event shift links');
select is((select count(*) from public.company_updates), 1::bigint, 'Tenant A sees only own company updates');
select is((select count(*) from public.company_update_comments), 1::bigint, 'Tenant A sees only own update comments');
select is((select count(*) from public.company_update_reactions), 1::bigint, 'Tenant A sees only own update reactions');
select is((select count(*) from public.payments), 1::bigint, 'Tenant A sees only own payments');
select is((select count(*) from public.expenses), 1::bigint, 'Tenant A sees only own expenses');
select is((select count(*) from public.inventory_items), 1::bigint, 'Tenant A sees only own inventory items');
select is((select count(*) from public.inventory_transactions), 1::bigint, 'Tenant A sees only own inventory transactions');

select is(
  (select count(*) from public.tasks where company_id = '11000000-0000-4000-8000-000000000002'),
  0::bigint,
  'Tenant B task is hidden from Tenant A'
);

select lives_ok(
  $$ insert into public.tasks (company_id, title, status, created_by)
     values ('11000000-0000-4000-8000-000000000001', 'Tenant A inserted task', 'open', '21000000-0000-4000-8000-000000000001') $$,
  'Tenant A can insert own task'
);

select throws_ok(
  $$ insert into public.payments (company_id, amount, created_by, recipient_name)
     values ('11000000-0000-4000-8000-000000000002', 303, '21000000-0000-4000-8000-000000000001', 'Blocked Vendor') $$,
  '42501',
  'new row violates row-level security policy for table "payments"',
  'Tenant A cannot insert Tenant B payment'
);

create temporary table phase4_update_result (updated_count bigint) on commit drop;

with updated as (
  update public.company_updates
  set title = 'Tenant B update changed by Tenant A'
  where id = '33000000-0000-4000-8000-000000000002'
  returning 1
)
insert into phase4_update_result
select count(*) from updated;

select is(
  (select updated_count from phase4_update_result),
  0::bigint,
  'Tenant A cannot update Tenant B company update'
);

select is(
  (select count(*) from public.payments where company_id = '11000000-0000-4000-8000-000000000002'),
  0::bigint,
  'Tenant B payment stays hidden after blocked insert'
);

select * from finish();

rollback;
