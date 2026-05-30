# 07 AI Copilot And Automation

## Goal

Make AI useful, safe, auditable, and tied to FlowForce's operational data. AI should recommend and assist before it writes; writes must be approved, scoped, and logged.

## Phases

### Phase 1: AI Governance Model

- [x] Define read-only insight, suggested action, approved action, and automated action.
- [x] Define AI permissions.
- [x] Define audit log requirements.
- [x] Define data that AI may and may not access.

Acceptance:

- AI cannot become an uncontrolled side door.

Verification:

- AI rules appear in security and product docs.

Status:

- Completed on 2026-05-29.
- Governance doc: [docs/ai-governance-model.md](../ai-governance-model.md)
- Governance service: [src/services/ai/aiGovernance.ts](../../src/services/ai/aiGovernance.ts)
- Migration: [20260529000100_phase7_ai_governance_model.sql](../../supabase/migrations/20260529000100_phase7_ai_governance_model.sql)
- Phase report: [07.01 AI Governance Model](./reports/07-01-ai-governance-model-2026-05-29.md)

### Phase 2: AI Context Layer

- [x] Build tenant-scoped context fetchers.
- [x] Add module summaries for scheduling, inventory, tasks, forms, employees, and cost.
- [x] Redact sensitive data where possible.
- [x] Add freshness timestamps.

Acceptance:

- AI receives structured context instead of raw random dumps.

Verification:

- Context tests enforce tenant scoping.

Status:

- Completed on 2026-05-29.
- Context doc: [docs/ai-context-layer.md](../ai-context-layer.md)
- Context service: [src/services/ai/aiContextLayer.ts](../../src/services/ai/aiContextLayer.ts)
- Migration: [20260529000200_phase7_ai_context_layer.sql](../../supabase/migrations/20260529000200_phase7_ai_context_layer.sql)
- Phase report: [07.02 AI Context Layer](./reports/07-02-ai-context-layer-2026-05-29.md)

### Phase 3: Prompt Contracts

- [x] Create prompts for scheduling, inventory, waste, compliance, and manager briefing.
- [x] Require structured JSON output.
- [x] Add schema validation.
- [x] Add failure and fallback behavior.

Acceptance:

- AI output is predictable enough for product use.

Verification:

- Invalid output is rejected safely.

Status:

- Completed on 2026-05-29.
- Prompt contract doc: [docs/ai-prompt-contracts.md](../ai-prompt-contracts.md)
- Prompt contract service: [src/services/ai/aiPromptContracts.ts](../../src/services/ai/aiPromptContracts.ts)
- Migration: [20260529000300_phase7_prompt_contract_registry.sql](../../supabase/migrations/20260529000300_phase7_prompt_contract_registry.sql)
- Phase report: [07.03 Prompt Contracts](./reports/07-03-prompt-contracts-2026-05-29.md)

### Phase 4: Manager Briefing

- [x] Build "today's operations briefing."
- [x] Include staffing risks, inventory risks, overdue tasks, workflow exceptions, and cost anomalies.
- [x] Add evidence links.
- [x] Add refresh/logging behavior.

Acceptance:

- Managers get actionable daily guidance.

Verification:

- Briefing only references records the user can access.

Status:

- Completed on 2026-05-29.
- Manager briefing doc: [docs/ai-manager-briefing.md](../ai-manager-briefing.md)
- Manager briefing service: [src/services/ai/aiManagerBriefing.ts](../../src/services/ai/aiManagerBriefing.ts)
- Migration: [20260529000400_phase7_manager_briefing.sql](../../supabase/migrations/20260529000400_phase7_manager_briefing.sql)
- Phase report: [07.04 Manager Briefing](./reports/07-04-manager-briefing-2026-05-29.md)

### Phase 5: Scheduling Assistant

- [x] Suggest shifts based on demand, availability, roles, and labor cost.
- [x] Detect understaffing/overstaffing.
- [x] Suggest replacements for absence or conflicts.
- [x] Require manager approval before writes.

Acceptance:

- AI helps schedule, but does not silently publish schedules.

Verification:

- Suggested schedule writes are audited and permission-gated.

Status:

- Completed on 2026-05-29.
- Scheduling assistant doc: [docs/ai-scheduling-assistant.md](../ai-scheduling-assistant.md)
- Scheduling assistant service: [src/services/ai/aiSchedulingAssistant.ts](../../src/services/ai/aiSchedulingAssistant.ts)
- Migration: [20260529000500_phase7_scheduling_assistant.sql](../../supabase/migrations/20260529000500_phase7_scheduling_assistant.sql)
- Phase report: [07.05 Scheduling Assistant](./reports/07-05-scheduling-assistant-2026-05-29.md)

### Phase 6: Inventory And Waste Assistant

- [x] Detect repeated stockouts.
- [x] Suggest reorder quantities.
- [x] Detect waste outliers.
- [x] Suggest prep or purchasing adjustments.

Acceptance:

- AI makes inventory/cost engine more useful.

Verification:

- Recommendations cite source metrics.

Status:

- Completed on 2026-05-29.
- Inventory and waste assistant doc: [docs/ai-inventory-waste-assistant.md](../ai-inventory-waste-assistant.md)
- Inventory and waste assistant service: [src/services/ai/aiInventoryWasteAssistant.ts](../../src/services/ai/aiInventoryWasteAssistant.ts)
- Migration: [20260529000600_phase7_inventory_waste_assistant.sql](../../supabase/migrations/20260529000600_phase7_inventory_waste_assistant.sql)
- Phase report: [07.06 Inventory And Waste Assistant](./reports/07-06-inventory-and-waste-assistant-2026-05-29.md)

### Phase 7: Compliance And Workflow Assistant

- [x] Detect overdue recurring workflows.
- [x] Summarize failed checklist patterns.
- [x] Suggest corrective tasks.
- [x] Suggest training follow-ups.

Acceptance:

- AI supports operational discipline.

Verification:

- AI-created suggestions can be approved into tasks.

Status:

- Completed on 2026-05-29.
- Compliance and workflow assistant doc: [docs/ai-compliance-workflow-assistant.md](../ai-compliance-workflow-assistant.md)
- Compliance and workflow assistant service: [src/services/ai/aiComplianceWorkflowAssistant.ts](../../src/services/ai/aiComplianceWorkflowAssistant.ts)
- Migration: [20260529000700_phase7_compliance_workflow_assistant.sql](../../supabase/migrations/20260529000700_phase7_compliance_workflow_assistant.sql)
- Phase report: [07.07 Compliance And Workflow Assistant](./reports/07-07-compliance-and-workflow-assistant-2026-05-29.md)

### Phase 8: Learning Loop

- [x] Track accepted/rejected recommendations.
- [x] Capture reason codes.
- [x] Improve future suggestions from user feedback.
- [x] Keep tenant-specific learning separated.

Acceptance:

- AI improves without leaking tenant data.

Verification:

- Feedback records are tenant-scoped and auditable.

Status:

- Completed on 2026-05-29.
- Learning loop doc: [docs/ai-learning-loop.md](../ai-learning-loop.md)
- Learning loop service: [src/services/ai/aiLearningLoop.ts](../../src/services/ai/aiLearningLoop.ts)
- Migration: [20260529000800_phase7_learning_loop.sql](../../supabase/migrations/20260529000800_phase7_learning_loop.sql)
- Phase report: [07.08 Learning Loop](./reports/07-08-learning-loop-2026-05-29.md)

### Phase 9: AI Observability And Cost Controls

- [x] Log model, tokens, latency, errors, and user.
- [x] Add tenant/model budget controls.
- [x] Add retry and timeout behavior.
- [x] Add admin AI usage dashboard.

Acceptance:

- AI cost and reliability are visible.

Verification:

- Failed AI calls degrade gracefully.

Status:

- Completed on 2026-05-29.
- Observability doc: [docs/ai-observability-and-cost-controls.md](../ai-observability-and-cost-controls.md)
- Observability service: [src/services/ai/aiObservability.ts](../../src/services/ai/aiObservability.ts)
- Migration: [20260529000900_phase7_ai_observability_cost_controls.sql](../../supabase/migrations/20260529000900_phase7_ai_observability_cost_controls.sql)
- Phase report: [07.09 AI Observability And Cost Controls](./reports/07-09-ai-observability-and-cost-controls-2026-05-29.md)

### Phase 10: AI Copilot Signoff

- [x] Add release gates for AI contract tests.
- [x] Add safety review checklist.
- [x] Add demo workflow.
- [x] Update roadmap status.

Acceptance:

- AI is a controlled product capability, not a fragile novelty.

Verification:

- AI demos work with seeded data and pass audit expectations.

Status:

- Completed on 2026-05-29.
- Signoff doc: [docs/ai-copilot-signoff.md](../ai-copilot-signoff.md)
- Release gates: [.github/workflows/release-gates.yml](../../.github/workflows/release-gates.yml)
- Signoff test: [phase7_ai_copilot_signoff.test.sql](../../supabase/tests/phase7_ai_copilot_signoff.test.sql)
- Phase report: [07.10 AI Copilot Signoff](./reports/07-10-ai-copilot-signoff-2026-05-29.md)
