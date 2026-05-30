# AI Prompt Contracts

Plan 07.03 defines predictable prompt contracts for the first FlowForce AI assistant surfaces. These contracts sit after `get_ai_context_snapshot(company_id)` and before any model output is shown or converted into a product suggestion.

## Contracts

The supported prompt keys are:

- `scheduling_assistant`
- `inventory_assistant`
- `waste_assistant`
- `compliance_assistant`
- `manager_briefing`

Each prompt contract declares:

- Required context modules.
- JSON-only output.
- Strict schema validation.
- Evidence requirements.
- Human approval requirements.
- Safe fallback behavior.

## Output Rules

Every valid output must include:

- `contract_version`
- `prompt_key`
- `generated_at`
- `status`
- `summary`
- `confidence`
- `evidence`
- `recommendations`
- `safety`

Recommendations are allowed to draft suggested work, but they cannot write directly. Every recommendation must set `requires_human_approval` to `true`, and the output safety block must set `writes_allowed` to `false`.

## Rejection And Fallback

`validateAIPromptOutput(promptKey, output)` rejects invalid model responses with Zod. Invalid output is not repaired silently and is not converted into product actions. Instead, FlowForce returns a safe fallback object:

- `status: "fallback"`
- `confidence: 0`
- empty `evidence`
- empty `recommendations`
- `writes_allowed: false`
- `requires_human_approval: true`

This keeps future AI work predictable and prevents malformed model output from creating tasks, schedule changes, purchases, or compliance actions.

## Safety Boundary

Prompt contracts inherit the Plan 07.01 and 07.02 boundaries:

- Use only tenant-scoped context.
- Block raw PII, payroll detail, secret material, and cross-tenant data.
- Require structured evidence from the context snapshot.
- Keep writes behind manager approval and audit events.

## Verification

Use:

```bash
npm run check:ai-prompt-contracts
```

The check verifies contract coverage, schema validation, invalid-output rejection, fallback behavior, roadmap wiring, and the SQL prompt registry.
