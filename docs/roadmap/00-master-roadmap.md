# FlowForce Master Roadmap

Date: 2026-05-27

## North Star

FlowForce becomes the operating system for restaurant, retail, and service teams: one connected platform replacing fragmented checklist, workforce, inventory, spreadsheet, message, and manual manager follow-up workflows.

The product promise:

> Staff the business, run the floor, control inventory, track cost, train the team, automate operations, and see what matters from one tenant-safe system.

## Roadmap Files

- [01 Product Positioning And Scope](./01-product-positioning-and-scope.md)
- [02 Platform Architecture](./02-platform-architecture.md)
- [03 Core SaaS Foundation](./03-core-saas-foundation.md)
- [04 Web App Product Completion](./04-web-app-product-completion.md)
- [05 Inventory Finance Cost Engine](./05-inventory-finance-cost-engine.md)
- [06 Operations Workflows And Compliance](./06-operations-workflows-and-compliance.md)
- [07 AI Copilot And Automation](./07-ai-copilot-and-automation.md)
- [08 Mobile App And Offline Mode](./08-mobile-app-and-offline-mode.md)
- [09 Integrations And Migration Tools](./09-integrations-and-migration-tools.md)
- [10 Production Infrastructure And Launch](./10-production-infrastructure-and-launch.md)

## Execution Rule

When we say "next phase", we should execute the next unchecked phase in the active plan file. If no active plan is named, use this priority:

1. Finish safety and shipment blockers.
2. Finish architecture decisions before large file movement.
3. Finish the web app before deep native mobile work.
4. Build the inventory + scheduling + cost engine before broad integrations.
5. Add AI write automation only after audited approvals and logs exist.

## Current Strategic Recommendation

Do not start with a giant monorepo rewrite. FlowForce is already a large working Next.js app with hardened Supabase contracts. The best path is:

1. Document decisions.
2. Map current modules.
3. Stabilize shared types and data access.
4. Build the unique product engine.
5. Add mobile through the lowest-risk path first.
6. Add deeper monorepo/native structure only when the current app can absorb it.

## Active Roadmap State

- Active plan: [07 AI Copilot And Automation](./07-ai-copilot-and-automation.md)
- Current phase: Phase 7, AI Copilot And Automation
- Last completed phase: 06.10, Operations Workflow Signoff
- Last phase report: [06.10 Operations Workflow Signoff](./reports/06-10-operations-workflow-signoff-2026-05-29.md)

## Global Completion Criteria

- [x] Web app is production-ready for paid pilot customers.
- [ ] Mobile app path is shippable on iOS and Android.
- [ ] Core tenant data is secure, tested, and recoverable.
- [x] Restaurant/retail operators can see labor + inventory + waste + purchasing cost in one place.
- [x] Managers can run daily execution workflows from mobile.
- [ ] AI gives useful recommendations with audit trails and user approval.
- [ ] Deploy, backup, monitoring, rollback, and release gates are documented and tested.

## Phase Ledger

Use this as the high-level tracker. Each detailed file contains the actual tasks and acceptance criteria.

- [x] 1.  Product positioning and scope
- [x] 2.  Platform architecture
- [x] 3.  Core SaaS foundation
- [x] 4.  Web app product completion
- [x] 5.  Inventory finance cost engine
- [x] 6.  Operations workflows and compliance
- [ ] 7.  AI copilot and automation
- [ ] 8.  Mobile app and offline mode
- [ ] 9.  Integrations and migration tools
- [ ] 10. Production infrastructure and launch
