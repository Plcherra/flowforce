# AI Copilot Signoff

Plan 07.10 closes the AI copilot and automation plan by proving that FlowForce AI is a controlled product capability. The signoff is intentionally focused on gates, safety, demo readiness, auditability, and tenant containment.

## Release Gates

AI work is now part of the release-gates workflow. A release is not ready unless all of these pass:

- `npm run check:ai-copilot`
- `npm run test:db:ai-copilot`
- `npm run check:local`
- `npm run build`

The `check:ai-copilot` script runs every AI contract checker from governance through this signoff. The database gate runs the focused pgTAP AI suite, including the signoff demo workflow.

## Safety Review Checklist

- Governance baseline exists before AI context, suggestions, learning, or usage logging can run.
- Governance policy mutation is admin/audited-RPC only; clients cannot directly weaken policy rows.
- Context fetchers are tenant-scoped and avoid raw PII, payroll detail, secrets, and cross-tenant data.
- Prompt contracts require structured output, schema validation, and safe fallback behavior.
- Recommendations stay in pending review until a manager approves or rejects them.
- Direct writes are blocked in the current v1 AI assistant surfaces.
- Approved suggestions remain audit-backed and do not silently publish operational records.
- Learning feedback is tenant-specific and must not train from another tenant's corrections.
- Usage events record model, tokens, latency, retries, timeout, error, fallback, and estimated cost.
- Usage telemetry is written from trusted server context only so clients cannot forge tokens, status, or cost.
- Budget controls can block or degrade AI calls before spend becomes uncontrolled.
- Release gates fail if the AI signoff checklist, demo, roadmap, or test coverage is removed.

## Demo Workflow

The seeded demo path exercises a realistic manager flow without requiring a live model provider:

1. Install the tenant AI governance baseline through the admin/audited RPC.
2. Refresh the manager briefing from scheduling, tasks, forms, inventory, workflow exception, and cost context.
3. Refresh scheduling assistant suggestions from an understaffed shift.
4. Approve one scheduling suggestion while confirming `direct_write_executed = false`.
5. Record tenant-scoped learning feedback for the approved suggestion.
6. Configure model budget controls.
7. Record successful AI usage telemetry for the briefing from a trusted server context.
8. Confirm audit events exist for briefing generation, suggestion creation, suggestion approval, learning feedback, usage telemetry, and budget updates.
9. Confirm another tenant cannot read or mutate the first tenant's AI records.

## Shipment Position

Plan 7 is ready for the next roadmap plan when:

- AI is useful through manager briefing, scheduling, inventory, waste, compliance, and workflow suggestions.
- AI remains approval-gated and audit-backed.
- AI costs and fallback behavior are visible.
- Tenant isolation is covered by database tests.
- CI runs AI contract gates before release.
