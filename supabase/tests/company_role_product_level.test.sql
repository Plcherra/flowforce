begin;
create extension if not exists pgtap;
select plan(6);

select has_column('public', 'company_roles', 'product_level', 'company_roles has a locked product_level');

select is(
  public.infer_company_role_product_level('Kitchen manager', 2),
  'manager',
  'custom manager-named classes infer the manager level'
);

select is(
  public.infer_company_role_product_level('Owner', 1),
  'owner',
  'Owner name maps to the owner level even when hierarchy is 1'
);

select ok(
  (public.clamp_permissions_to_product_level(
    'manager',
    '{"approveTimeOff": true, "admin.settings": true, "billing.manage": true, "billing.view": true}'::jsonb
  ) ->> 'approveTimeOff') = 'true'
  and not (public.clamp_permissions_to_product_level(
    'manager',
    '{"approveTimeOff": true, "admin.settings": true, "billing.manage": true, "billing.view": true}'::jsonb
  ) ? 'admin.settings')
  and not (public.clamp_permissions_to_product_level(
    'manager',
    '{"approveTimeOff": true, "admin.settings": true, "billing.manage": true, "billing.view": true}'::jsonb
  ) ? 'billing.manage')
  and not (public.clamp_permissions_to_product_level(
    'manager',
    '{"approveTimeOff": true, "admin.settings": true, "billing.manage": true, "billing.view": true}'::jsonb
  ) ? 'billing.view'),
  'Kitchen manager cannot receive settings or billing'
);

select ok(
  (public.clamp_permissions_to_product_level(
    'owner',
    '{"admin": true, "owner": true, "billing.manage": false, "systemSettings": false, "approveTimeOff": false}'::jsonb
  ) ->> 'billing.manage') = 'true'
  and (public.clamp_permissions_to_product_level(
    'owner',
    '{"admin": true, "owner": true, "billing.manage": false, "systemSettings": false, "approveTimeOff": false}'::jsonb
  ) ->> 'systemSettings') = 'true'
  and (public.clamp_permissions_to_product_level(
    'owner',
    '{"admin": true, "owner": true, "billing.manage": false, "systemSettings": false, "approveTimeOff": false}'::jsonb
  ) ->> 'manageUsers') = 'true'
  and (public.clamp_permissions_to_product_level(
    'owner',
    '{"admin": true, "owner": true, "billing.manage": false, "systemSettings": false, "approveTimeOff": false}'::jsonb
  ) ->> 'admin.roles') = 'true'
  and (public.clamp_permissions_to_product_level(
    'owner',
    '{"admin": true, "owner": true, "billing.manage": false, "systemSettings": false, "approveTimeOff": false}'::jsonb
  ) ->> 'approveTimeOff') = 'false',
  'Owner keeps major permissions even when a stub or uncheck tries to strip them'
);

select ok(
  (public.clamp_permissions_to_product_level(
    'staff',
    '{"viewOwnSchedules": true, "viewTeamSchedules": true, "schedule.view": true, "editSchedules": true, "billing.manage": true}'::jsonb
  ) ->> 'viewTeamSchedules') = 'true'
  and (public.clamp_permissions_to_product_level(
    'staff',
    '{"viewOwnSchedules": true, "viewTeamSchedules": true, "schedule.view": true, "editSchedules": true, "billing.manage": true}'::jsonb
  ) ->> 'schedule.view') = 'true'
  and not (public.clamp_permissions_to_product_level(
    'staff',
    '{"viewOwnSchedules": true, "viewTeamSchedules": true, "schedule.view": true, "editSchedules": true, "billing.manage": true}'::jsonb
  ) ? 'editSchedules')
  and not (public.clamp_permissions_to_product_level(
    'staff',
    '{"viewOwnSchedules": true, "viewTeamSchedules": true, "schedule.view": true, "editSchedules": true, "billing.manage": true}'::jsonb
  ) ? 'billing.manage'),
  'Staff can receive team schedule view but not schedule edits or billing'
);

select * from finish();
rollback;
