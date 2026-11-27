begin;

create extension if not exists pgtap;

select plan(8);

select ok(
  public.task_status_transition_allowed('todo', 'in_progress'),
  'todo may move to in_progress'
);

select ok(
  public.task_status_transition_allowed('todo', 'completed'),
  'todo may complete without in_progress'
);

select ok(
  not public.task_status_transition_allowed('todo', 'review'),
  'todo cannot skip to review'
);

select ok(
  public.task_status_transition_allowed('open', 'completed'),
  'legacy open status may complete'
);

select ok(
  public.task_status_transition_allowed('in_progress', 'review'),
  'in_progress may enter review'
);

insert into public.tasks (
  id, company_id, title, status, created_by, assigned_to, source
)
values (
  'f11e0000-0000-4000-8000-000000000099',
  'a11e0000-0000-4000-8000-000000000001',
  'Status transition probe',
  'todo',
  'a11e0000-0000-4000-8000-000000000020',
  'a11e0000-0000-4000-8000-000000000020',
  'manual'
)
on conflict (id) do update set status = excluded.status;

select lives_ok(
  $$ update public.tasks
     set status = 'in_progress'
     where id = 'f11e0000-0000-4000-8000-000000000099' $$,
  'Allowed transition persists'
);

select lives_ok(
  $$ update public.tasks
     set status = 'completed'
     where id = 'f11e0000-0000-4000-8000-000000000099' $$,
  'in_progress may complete'
);

select throws_ok(
  $$ update public.tasks
     set status = 'in_progress'
     where id = 'f11e0000-0000-4000-8000-000000000099' $$,
  'P0001',
  'Invalid task status transition from completed to in_progress',
  'Completed tasks cannot re-open to in_progress'
);

delete from public.tasks where id = 'f11e0000-0000-4000-8000-000000000099';

select * from finish();

rollback;