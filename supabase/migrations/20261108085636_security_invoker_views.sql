-- Advisor: security_definer_view.
-- These three views are selected by the app, SQL functions, and pgTAP,
-- so the authenticated grants stay. security_invoker makes the workload
-- view follow task_workflow_instances RLS instead of the view owner.
-- The prompt-contract views are constant catalogs with no base table.

alter view public.operations_daily_workload_v set (security_invoker = on);
alter view public.ai_prompt_contracts_v set (security_invoker = on);
alter view public.ai_prompt_contract_readiness_v set (security_invoker = on);

notify pgrst, 'reload schema';
