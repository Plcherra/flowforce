# Rule Engine Schema & Services

This repo now includes a Supabase-backed rule catalog that will power the future “Rule Studio”.

## Database objects

Migration `20250926091500_app_rules_engine.sql` creates:

- `app_rules` – rule metadata (name, slug, resource, trigger, severity, enabled flag).
- `app_rule_conditions` – condition DSL rows tied to a rule (field, operator, value, logical grouping).
- `app_rule_actions` – describes what happens when a rule fires (auto adjust, block, notify, etc.).
- `app_rule_targets` – scoping (company, location, role, team) with optional metadata.
- `app_rule_audits` – audit log for each rule evaluation.

Indices are included for the most common lookups (by rule id, resource, etc.).

## TypeScript models

- `src/types/rules.ts` provides strongly typed models for rules, conditions, actions, targets, and audits.
- `src/services/rules/ruleRepository.ts` exposes helper functions to list rules, fetch by slug, and read audit history.

These utilities use the project’s Supabase client so they can be reused by future UI screens and server routes.

## Next steps

- Build UI pages under a `/rules` route, including creation & editing wizards.
- Implement evaluators that execute condition sets and run the corresponding actions.
- Feed rule evaluations into existing guardrail flows (scheduling, availability, time off).
- Expand `app_rule_actions` config to support specific automation hooks (auto break insertion, reminder notifications, etc.).

Until the Rule Studio is ready, you can inspect raw data via Supabase dashboard or the new repository helpers.

