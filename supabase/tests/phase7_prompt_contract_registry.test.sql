begin;

create extension if not exists pgtap;

select plan(10);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '7c100000-0000-4000-8000-000000000001', true);

select is(
  (select count(*)::integer from public.ai_prompt_contracts_v),
  5,
  'prompt contract registry exposes five contracts'
);

select ok(
  exists (
    select 1
    from public.ai_prompt_contracts_v
    where prompt_key = 'scheduling_assistant'
      and required_context_modules @> array['scheduling', 'employees', 'cost', 'tasks']::text[]
  ),
  'scheduling prompt declares required context modules'
);

select ok(
  exists (
    select 1
    from public.ai_prompt_contracts_v
    where prompt_key = 'inventory_assistant'
      and required_context_modules @> array['inventory', 'cost', 'tasks']::text[]
  ),
  'inventory prompt declares required context modules'
);

select ok(
  exists (
    select 1
    from public.ai_prompt_contracts_v
    where prompt_key = 'waste_assistant'
      and action_level = 'suggested_action'
  ),
  'waste prompt is suggestion-only'
);

select ok(
  exists (
    select 1
    from public.ai_prompt_contracts_v
    where prompt_key = 'manager_briefing'
      and action_level = 'read_only_insight'
  ),
  'manager briefing prompt is read-only'
);

select ok(
  (select all_require_json_output from public.ai_prompt_contract_readiness_v),
  'all prompt contracts require JSON output'
);

select ok(
  (select all_require_schema_validation from public.ai_prompt_contract_readiness_v),
  'all prompt contracts require schema validation'
);

select ok(
  (select all_block_direct_writes from public.ai_prompt_contract_readiness_v),
  'all prompt contracts block direct writes'
);

select ok(
  (select all_have_fallback_behavior from public.ai_prompt_contract_readiness_v),
  'all prompt contracts declare fallback behavior'
);

select ok(
  (select ready_for_manager_briefing from public.ai_prompt_contract_readiness_v),
  'prompt contract readiness is complete'
);

select * from finish();

rollback;
