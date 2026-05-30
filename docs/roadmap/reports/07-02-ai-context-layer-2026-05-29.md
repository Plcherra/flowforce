# 07.02 AI Context Layer

Date: 2026-05-29

## Outcome

Plan 07.02 is complete. FlowForce now has a tenant-scoped AI context layer that gives future prompts structured module summaries instead of raw operational record dumps.

## Completed Work

- Added `ai_context_module_summaries_v` for six stable module summaries: scheduling, inventory, tasks, forms, employees, and cost.
- Added `ai_context_readiness_v` with `ready_for_prompt_contracts`.
- Added `get_ai_context_snapshot(company_id)` to return one structured JSON context object.
- Required the Plan 07.01 AI governance baseline before context snapshots can be fetched.
- Added redaction metadata that blocks raw PII, cross-tenant data, secret material, and payroll detail.
- Added TypeScript contract helpers in `src/services/ai/aiContextLayer.ts`.
- Added DB and local contract checks for tenant scoping, redaction, freshness, and readiness.

## Files

- Documentation: [docs/ai-context-layer.md](../../ai-context-layer.md)
- Service contract: [src/services/ai/aiContextLayer.ts](../../../src/services/ai/aiContextLayer.ts)
- Migration: [20260529000200_phase7_ai_context_layer.sql](../../../supabase/migrations/20260529000200_phase7_ai_context_layer.sql)
- DB test: [phase7_ai_context_layer.test.sql](../../../supabase/tests/phase7_ai_context_layer.test.sql)
- Contract check: [scripts/check-ai-context-layer-contract.mjs](../../../scripts/check-ai-context-layer-contract.mjs)

## Verification

- `npm run check:ai-context`
- `npm run check:local`
- `supabase db reset`
- `supabase test db --local supabase/tests/phase7_ai_context_layer.test.sql`
- `npm run test:db:security`
- `npm run build`

## Next

Phase 07.03: Prompt Contracts should consume `get_ai_context_snapshot(company_id)` and require schema-validated JSON output for scheduling, inventory, waste, compliance, and manager briefing prompts.
