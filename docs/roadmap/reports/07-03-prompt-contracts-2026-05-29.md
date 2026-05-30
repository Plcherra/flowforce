# 07.03 Prompt Contracts

Date: 2026-05-29

## Outcome

Plan 07.03 is complete. FlowForce now has strict prompt contracts for the first five AI assistant surfaces, with JSON-only output, schema validation, invalid-output rejection, and safe fallback behavior.

## Completed Work

- Added prompt contracts for scheduling, inventory, waste, compliance, and manager briefing.
- Added `validateAIPromptOutput(promptKey, output)` with strict Zod schemas.
- Added safe fallback behavior for malformed or unsafe model output.
- Added `buildAIPromptContractInput(promptKey, contextSnapshot)` so prompts consume the Plan 07.02 context snapshot.
- Added `ai_prompt_contracts_v` and `ai_prompt_contract_readiness_v` as the SQL registry/release gate.
- Added local contract checks that prove valid output passes and invalid output is rejected.

## Files

- Documentation: [docs/ai-prompt-contracts.md](../../ai-prompt-contracts.md)
- Service contract: [src/services/ai/aiPromptContracts.ts](../../../src/services/ai/aiPromptContracts.ts)
- Migration: [20260529000300_phase7_prompt_contract_registry.sql](../../../supabase/migrations/20260529000300_phase7_prompt_contract_registry.sql)
- DB test: [phase7_prompt_contract_registry.test.sql](../../../supabase/tests/phase7_prompt_contract_registry.test.sql)
- Contract check: [scripts/check-ai-prompt-contracts-contract.mjs](../../../scripts/check-ai-prompt-contracts-contract.mjs)

## Verification

- `npm run check:ai-prompt-contracts`
- `npm run check:local`
- `supabase db reset`
- `supabase test db --local supabase/tests/phase7_prompt_contract_registry.test.sql`
- `npm run test:db:security`
- `npm run build`

## Next

Phase 07.04: Manager Briefing should use the `manager_briefing` prompt contract and `get_ai_context_snapshot(company_id)` to produce today's read-only operations briefing with evidence and safe fallback behavior.
