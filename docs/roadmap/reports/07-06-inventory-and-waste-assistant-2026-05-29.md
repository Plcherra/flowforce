# 07.06 Inventory And Waste Assistant

Plan 07.06 is complete. FlowForce now has approval-gated inventory and waste AI suggestions that use tenant AI context, cite source metrics, and keep all inventory, purchasing, prep, and waste writes behind manager review.

## Completed

- Added `buildValidatedInventoryWasteAssistant(snapshot)` with inventory and waste prompt-contract validation.
- Added `ai_inventory_waste_suggestions` as the review ledger for stockout, reorder, waste, prep, and purchasing recommendations.
- Added `refresh_ai_inventory_waste_suggestions(company_id)` to generate safe recommendations from aggregate context.
- Added `review_ai_inventory_waste_suggestion(suggestion_id, decision, comments)` for manager approval or rejection without direct inventory writes.
- Added audit events for creation, approval, and rejection.
- Wired the phase into local/release checks and the DB security suite.

## Safety Position

The assistant may suggest:

- stockout review
- reorder threshold review
- waste outlier review
- prep adjustment review
- purchasing adjustment review

It may not directly create purchase orders, prep plans, inventory adjustments, or waste records. Every stored suggestion keeps `approval_required = true`, `direct_write_executed = false`, and `writes_allowed = false`.

## Verification

- `npm run check:ai-inventory-waste-assistant`
- `supabase db reset`
- `supabase test db --local supabase/tests/phase7_inventory_waste_assistant.test.sql`
- `npm run check:local`
- `npm run test:db:security`
- `npm run build`

## Next

Phase 07.07: Compliance And Workflow Assistant should use the `compliance_assistant` prompt contract and workflow/task/form context to suggest corrective tasks and training follow-ups behind the same approval and audit model.
