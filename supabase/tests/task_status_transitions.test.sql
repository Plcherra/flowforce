begin;

create extension if not exists pgtap;

select plan(12);

select ok(
  not public.task_status_transition_allowed('todo', 'in_progress'),
  'todo cannot move to in_progress'
);

select ok(
  public.task_status_transition_allowed('todo', 'completed'),
  'todo may complete directly'
);

select ok(
  public.task_status_transition_allowed('todo', 'cancelled'),
  'todo may cancel'
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
  public.task_status_transition_allowed('in_progress', 'completed'),
  'legacy in_progress may complete'
);

select ok(
  public.task_status_transition_allowed('in_progress', 'todo'),
  'legacy in_progress may return to todo'
);

select ok(
  not public.task_status_transition_allowed('in_progress', 'review'),
  'legacy in_progress cannot enter review'
);

select ok(
  public.task_status_transition_allowed('completed', 'todo'),
  'completed may undo to todo'
);

select ok(
  not public.task_status_transition_allowed('completed', 'in_progress'),
  'completed cannot re-open to in_progress'
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
     set status = 'completed'
     where id = 'f11e0000-0000-4000-8000-000000000099' $$,
  'todo may complete via trigger'
);

select throws_ok(
  $$ update public.tasks
     set status = 'in_progress'
     where id = 'f11e0000-0000-4000-8000-000000000099' $$,
  'P0001',
  'Invalid task status transition from completed to in_progress',
  'Completed cannot move to in_progress'
);

insert into public.tasks (
  id, company_id, title, status, created_by, assigned_to, source
)
values (
  'f11e0000-0000-4000-8000-000000000098',
  'a11e0000-0000-4000-8000-000000000001',
  'Legacy in progress probe',
  'in_progress',
  'a11e0000-0000-4000-8000-000000000020',
  'a11e0000-0000-4000-8000-000000000020',
  'manual'
)
on conflict (id) do update set status = excluded.status;

select lives_ok(
  $$ update public.tasks
     set status = 'completed'
     where id = 'f11e0000-0000-4000-8000-000000000098' $$,
  'legacy in_progress row may complete via trigger'
);

delete from public.tasks where id in (
  'f11e0000-0000-4000-8000-000000000099',
  'f11e0000-0000-4000-8000-000000000098'
);

select * from finish();

rollback;