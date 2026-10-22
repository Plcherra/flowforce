# Time Off

Scheduling plus Time Off is the current feature. This file is the one the roadmap marks for the next run.

Shipped schedule work stays in [docs/features/schedule.md](schedule.md). Do not reopen it. Phases 1–25 there are checked. The base for this file is:

- Phase 22, team requests on the list and on the grid.
- Phase 23, time off policies, commit `820802f`. Migration `supabase/migrations/20261022014849_time_off_policies.sql`. Math in `src/features/scheduling/utils/timeOffPolicy.ts`. Tests in `src/features/scheduling/utils/timeOffPolicy.test.ts`.
- Phase 24, repeating availability and unavailability, commit `5dca98d`.
- Phase 25, leadership tools and the grouped grid, commit `a9aa674`.

Tasks phases 8, 19, and 22–24 are checked in [docs/features/tasks.md](tasks.md). Tasks phases 9–12 stay skipped. Tasks is not part of this run.

## Rules

These match Schedule owner answers 10 and 11. The code for them already exists. Follow-up phases use that code. They do not add a second policy model, a second balance formula, or a second repeat engine.

One policy is one row in `time_off_policies`. That row holds the options together:

- a name
- a unit of hours, days, or minutes
- a cap per week, per month, and per year, in any combination, including all three at once
- the weekdays the policy allows
- a notice period in days
- the roles or people it applies to

An empty roles-and-people choice means everyone. Weekend and Weekday are two policies a maker can save. They are not hardcoded. Weekend is Saturday and Sunday only, at most 2 days in a month, and about 24 days in a year. Weekday is Monday through Friday, 7 days of notice, and 90 days in a year. A date-only request counts one eligible day as 1 day, 8 hours, or 480 minutes.

Availability and unavailability already repeat daily, weekly, monthly, every 2 weeks, or every 15 days. An entry with no repeat stays one entry. That is Schedule phase 24. Do not edit `src/features/scheduling/utils/repeatPattern.ts` in these phases.

The week cap uses the Sunday-start UTC week already in `periodKey`. Do not change that week start in these phases.

When the company has no policy, the staff screen keeps the existing 25-day allowance. Do not remove that fallback.

## Already on screen

Do not rebuild these:

- `TimeOffPoliciesSection` can fill the Weekend and Weekday examples and insert a policy with unit, week, month, and year caps, weekdays, notice, roles, and pasted person ids.
- `useTimeOffPolicies` updates a row when the draft has an id. The form never passes an id.
- `requestFitsPolicy` rejects a request that misses the weekdays, the notice, or a cap. A request that fits is stored with `policy_id`.
- `remainingBalances` and `balanceLabel` are the only balance math. The staff panel shows them when a policy applies. The manager panel shows them for the signed-in person only.
- Approve and reject stay on `approveTimeOff`. Repeating availability stays on Schedule phase 24.

## Phases

Auto run: start at the first unchecked phase that is not blocked and does not depend on an unapplied migration. After that phase is green, continue to the next such phase in the same run if time allows. Each phase is its own commit on `main`. Append the Progress log as you go. Skip a blocked phase and log the skip.

A phase that adds a migration follows the Feature workflow migration rule. If the Progress log has `needs owner: supabase db push <migration>`, skip phases that depend on that migration and continue with phases that do not. `check:supabase:remote-drift` in deploy-readiness fails until the push lands. That is expected.

### Phase 1 — List and edit a saved policy

- [ ] Show saved policies and update the row the maker picks.

Rules:

- Files: `src/features/scheduling/components/TimeOffPoliciesSection.tsx`, `src/features/scheduling/hooks/useTimeOffPolicies.ts`, and a new `src/features/scheduling/utils/policyDraft.ts` with `src/features/scheduling/utils/policyDraft.test.ts`.
- List each saved policy with its name, unit, week cap, month cap, year cap, weekdays, notice, and who it applies to.
- Edit loads that row into the existing form and calls `savePolicy` with that id. Save updates the row. It does not insert a second policy with the same name.
- Weekend example and Weekday example still fill a new policy. They do not overwrite a saved row unless Edit is open on that row.
- Do not add a table. Do not change `requestFitsPolicy` or `remainingBalances`.

Done when:

- Weekend and Weekday both appear after they are saved.
- Editing Weekend's month cap keeps one Weekend row and shows the new cap on that row.

Prove: Unit test `src/features/scheduling/utils/policyDraft.test.ts` builds a draft from a saved policy and keeps the id, the caps, the weekdays, and the notice. Run it with `node scripts/test-schedule-task-link.mjs` and add the file to that runner. Playwright coverage uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts` when `SUPABASE_SERVICE_ROLE_KEY` is present: save Weekend, edit the month cap, and assert one Weekend row.

### Phase 2 — Pick people from the team

- [ ] Replace the pasted person-id box with the company roster.

Rules:

- Files: `src/features/scheduling/components/TimeOffPoliciesSection.tsx` and `src/features/scheduling/utils/policyDraft.ts` with its test.
- People come from the team list scheduling already loads. The chosen ids are `appliesToUserIds`.
- An empty roles-and-people choice still means everyone. Do not store a sentinel id.
- Do not add a permission list. Do not change `policyAppliesTo`.

Done when:

- A maker can add and remove a person without typing an id.
- Saving with nobody selected still applies the policy to everyone.

Prove: Extend `policyDraft.test.ts` so selected people become `appliesToUserIds` and an empty selection stays an empty list. Run it with `node scripts/test-schedule-task-link.mjs`.

### Phase 3 — Retire a policy

- [ ] Stop a policy from taking new requests without dropping its history.

Rules:

- Files: a new migration that adds nullable `archived_at` on `time_off_policies`, `src/integrations/supabase/types.ts`, `src/features/scheduling/hooks/useTimeOffPolicies.ts`, `src/features/scheduling/utils/policyDraft.ts`, `src/features/scheduling/components/TimeOffPoliciesSection.tsx`, and `src/features/availability/components/TimeOffRequestPanel.tsx`.
- Commit the migration and the generated types. If the Supabase API can reach the linked project, apply the migration. Otherwise log `needs owner: supabase db push <migration>`.
- Retire sets `archived_at`. It does not delete the row. Old requests keep `policy_id`.
- An archived policy is off the request picker and off the "applies to you" balance list. A request already stored against it stays on the list and on the grid.
- Do not change the cap math.

Done when:

- Retiring Weekend hides it from new requests and from remaining-balance lines.
- A request already saved on Weekend still shows that policy name.

Prove: Extend `policyDraft.test.ts` so an archived policy is closed and an open policy stays open. Assert the generated `time_off_policies` type includes `archived_at`. Run it with `node scripts/test-schedule-task-link.mjs`.

### Phase 4 — The requester's balance on the team row

- [ ] Show the remaining balance for the person who asked, on that request.

Rules:

- Files: `src/features/scheduling/components/TimeOffManagementPanel.tsx`, `src/features/scheduling/utils/timeOffPolicy.ts`, and `src/features/scheduling/utils/timeOffPolicy.test.ts`.
- Use `remainingBalances` and `balanceLabel`. Pass only that person's requests. Another person's usage must not reduce this balance.
- The manager's own balance lines stay. The staff panel already shows policy balances. Do not add a second calculator.
- A request with no policy keeps the current row. The 25-day allowance stays only when no policy applies to that person.

Done when:

- A team request stored on Weekend shows that person's Weekend balance, in the policy unit.
- Person B's Weekend request does not change person A's remaining days.

Prove: Extend `timeOffPolicy.test.ts` with two people on one policy. Run it with `node scripts/test-schedule-task-link.mjs`. Playwright coverage uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts` when `SUPABASE_SERVICE_ROLE_KEY` is present.

### Phase 5 — Edge cases on the existing fit rules

- [ ] Lock the week cap, rejected requests, and who a policy applies to.

Rules:

- Files: `src/features/scheduling/utils/timeOffPolicy.test.ts` only, unless a case fails. Then fix `src/features/scheduling/utils/timeOffPolicy.ts` and leave the shipped weekend and weekday examples as they are.
- Add these cases to the existing test. Do not copy the cases phase 23 already asserts.
- A week cap rejects another eligible day in the same Sunday-start week and allows a day in the next week.
- One policy with a week cap, a month cap, and a year cap rejects the request that breaks any one of them.
- Denied and rejected usage does not reduce remaining. Pending usage does.
- `appliesToUserIds` allows the listed person and refuses a different person. Empty roles and people still means everyone.
- A range that mixes an eligible day and an ineligible day is rejected.

Done when:

- Those cases pass on the current `requestFitsPolicy` and `remainingBalances`.
- The Weekend example is still Saturday and Sunday, 2 days a month, and 24 days a year. The Weekday example is still 7 days of notice and 90 days a year.

Prove: `src/features/scheduling/utils/timeOffPolicy.test.ts`, run with `node scripts/test-schedule-task-link.mjs`.

## Open questions

None.

## Progress log

### 2026-10-22 — Follow-up plan

Shipped: no product code. Schedule phases 23–25 are the base (`820802f`, `5dca98d`, `a9aa674`). This file adds five follow-ups: edit a saved policy, pick people from the team, retire a policy, show the requester's balance, and lock the remaining fit cases.

Proven: docs only. The policy unit test from phase 23 already covers the weekend example, the weekday example, month and year caps together, notice, hours, and minutes.

Blockers: none. Phase 3 adds a migration when it runs.

Questions: none.
