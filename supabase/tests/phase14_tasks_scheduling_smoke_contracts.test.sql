begin;

create extension if not exists pgtap;

select plan(10);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.tasks'::regclass and conname = 'tasks_assigned_to_fkey' and contype = 'f'),
  'tasks exposes assigned profile relationship'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.tasks'::regclass and conname = 'tasks_created_by_fkey' and contype = 'f'),
  'tasks exposes created profile relationship'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.tasks'::regclass and conname = 'tasks_department_id_fkey' and contype = 'f'),
  'tasks exposes department relationship'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.tasks'::regclass and conname = 'tasks_goal_id_fkey' and contype = 'f'),
  'tasks exposes goal relationship'
);

select ok(
  exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'task_activities' and column_name = 'company_id'),
  'task_activities has company_id for tenant-scoped feeds'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.task_activities'::regclass and conname = 'task_activities_task_id_fkey' and contype = 'f'),
  'task_activities exposes task relationship'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.task_activities'::regclass and conname = 'task_activities_user_id_fkey' and contype = 'f'),
  'task_activities exposes actor profile relationship'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.position_assignments'::regclass and conname = 'position_assignments_position_id_fkey' and contype = 'f'),
  'position_assignments exposes position relationship'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.position_assignments'::regclass and conname = 'position_assignments_user_id_fkey' and contype = 'f'),
  'position_assignments exposes assigned user relationship'
);

select ok(
  exists (select 1 from pg_constraint where conrelid = 'public.positions'::regclass and conname = 'positions_department_id_fkey' and contype = 'f'),
  'positions exposes department relationship'
);

select * from finish();

rollback;
