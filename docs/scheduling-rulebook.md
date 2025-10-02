# Scheduling Rulebook

This repository now ships with a structured rulebook that captures the weekly scheduling playbook. The rulebook is authored as code so it can be versioned, reviewed, and eventually synchronized with Supabase once we persist it in the database.

## Location

- **Types:** `src/types/scheduleRulebook.ts`
- **Seed data:** `src/data/scheduleRulebooks.ts`
- **Accessor helpers:** `src/services/scheduleRulebookService.ts`

## Data model snapshot

```ts
type ScheduleRulebook = {
  id: string;
  name: string;
  description: string;
  version: string;
  lastUpdated: ISODateString;
  ownerRole: string;
  steps: RulebookStep[];
  constraints?: RulebookConstraint[];
}
```

Each **step** documents the purpose of the checklist stage, which roles can complete it, the evidence required to mark it done, and the actions that should be blocked until the step is satisfied. Global **constraints** define reusable guardrails such as overtime or minor-hour checks.

## Seeded rulebook

`DEFAULT_SCHEDULE_RULEBOOK` includes four core steps:

1. Collect staffing signals
2. Build shift draft
3. GM review and approval
4. Publish and capture acknowledgements

This mirrors the operational checklist and provides the metadata our forthcoming copilot / guardrail engine will use to enforce the workflow.

## Next steps

- Persist rulebooks in Supabase (mirror the TypeScript schema as tables).
- Build a guardrail service that evaluates scheduling actions against the rulebook.
- Add UI components that surface the current step, outstanding criteria, and blockers to the user.

Contributions
-------------

- Add new rulebooks or steps in `src/data/scheduleRulebooks.ts`.
- Keep the TypeScript types aligned when introducing new concepts so validation stays strict.
