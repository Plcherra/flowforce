# Time Off

Active. The 6 AM run starts here. This file has 9 phases. When they are checked, the run opens the remaining Tasks phases in [docs/features/tasks.md](tasks.md). Phases 9–12 there stay skipped until their open questions are answered.

Shipped schedule work stays in [docs/features/schedule.md](schedule.md). Do not reopen it. Phases 1–25 there are checked. The base for this file is:

- Phase 22, team requests on the list and on the grid.
- Phase 23, time off policies, commit `820802f`. Migration `supabase/migrations/20261022014849_time_off_policies.sql`. Math in `src/features/scheduling/utils/timeOffPolicy.ts`. Tests in `src/features/scheduling/utils/timeOffPolicy.test.ts`.
- Phase 24, repeating availability and unavailability, commit `5dca98d`.
- Phase 25, leadership tools and the grouped grid, commit `a9aa674`.

Tasks phases 8, 19, and 22–24 are checked in [docs/features/tasks.md](tasks.md). Tasks phases 9–12 stay skipped. Tasks is not part of this run.

## Rules

These match Schedule owner answers 10 and 11. The code for them already exists. Follow-up phases use that code. They do not add a second balance formula or a second repeat engine.

Phase 4 moves each `time_off_policies` row into one company policy of type time off. It does not leave both tables in use. Phases 5–9 read and write that time-off type. They do not add another policy table.

Until Phase 4 runs, one policy is one row in `time_off_policies`. That row holds the options together:

- a name
- a unit of hours, days, or minutes
- a cap per week, per month, and per year, in any combination, including all three at once
- the weekdays the policy allows
- a notice period in days
- the roles or people it applies to

An empty roles-and-people choice means everyone. Weekend and Weekday are two policies a maker can save. They are not hardcoded. Weekend is Saturday and Sunday only, at most 2 days in a month, and about 24 days in a year. Weekday is Monday through Friday, 7 days of notice, and 90 days in a year. A date-only request counts one eligible day as 1 day, 8 hours, or 480 minutes.

Availability and unavailability already repeat daily, weekly, monthly, every 2 weeks, or every 15 days, as one pattern copied onto every saved day. An entry with no repeat stays one entry. That is Schedule phase 24. Phase 2 extends `src/features/scheduling/utils/repeatPattern.ts` so a repeat can belong to one day or a selection of days, and so a custom every-N choice can sit beside every 2 weeks and every 15 days. It does not add a second repeat engine. Phases 5–9 do not edit that file.

The week cap uses the Sunday-start UTC week already in `periodKey`. Do not change that week start in these phases.

When the company has no policy, the staff screen keeps the existing 25-day allowance. Do not remove that fallback.

## Already on screen

Do not rebuild these:

- `TimeOffPoliciesSection` can fill the Weekend and Weekday examples and insert a policy with unit, week, month, and year caps, weekdays, notice, roles, and pasted person ids.
- `useTimeOffPolicies` updates a row when the draft has an id. The form never passes an id.
- `requestFitsPolicy` rejects a request that misses the weekdays, the notice, or a cap. A request that fits is stored with `policy_id`.
- `remainingBalances` and `balanceLabel` are the only balance math. The staff panel shows them when a policy applies. The manager panel shows them for the signed-in person only.
- Approve and reject stay on `approveTimeOff`. Repeating availability stays on Schedule phase 24.

## Decisions

These are locked for the auto run. Implement them. Do not edit this section while implementing a phase. Do not edit `docs/features/schedule.md`. Decisions 1 and 2 replace the My Availability day controls from Schedule decision 4 and extend Schedule answer 11 for per-day repeat. Decision 3 drops approval for a person's own availability. Decision 4 moves time off policies into Company policies.

1. Each weekday on My Availability is one of three states: Available all day, Unavailable, or Available at set hours. Available all day stores the existing full-day hours. Unavailable stores no hours. Available at set hours stores the from-time and the to-time. Choosing a time, or editing either time, sets that day to Available at set hours. A short legend above the rows names the three states. There is no All day on button and no Off button.
2. Repeat belongs to one day, or to a selection of days, not to the whole week. Sunday can be Unavailable every 15 days while Monday through Saturday keep their own availability and do not take that repeat. The named choices stay, with these labels: Does not repeat, Daily, Weekly, Monthly, Every 2 weeks (14 days), Every 15 days, and Custom. Custom is every N days or every N weeks, N at least 1, plus a start date. Every 2 weeks and every 15 days stay their own choices. Custom is not a relabel of those two. The control shows the next 3 occurrence dates from the start date. The pattern is stored on `staff_availability.recurrence` for the selected days only.
3. My Availability has one button, Send availability. Availability changes need no approval. The button does not become Save changes or Send request, and a locked week does not open an approval request. The helper says the new availability applies from the next week window, and it names that window's start date. The date comes from the existing next-window math in `src/features/availability/utils/nextAvailabilityWindow.ts`: the next window after the next posting weekday. Do not hardcode a weekday. The send stores the grid on that next window. It does not change the window already being posted. Reset stays. Save changes, Request change, and Send fixed availability are not on this screen. The general Save changes / Send request pair lives in the permission-grant plan in [docs/features/system-admin.md](system-admin.md). My Availability does not use that pair.
4. Policies live in a Company policies area, not under Team requests. A policy has a type: time off, availability, or scheduling rules. Later types can be added. A policy is assigned to users, roles, levels, or stores. A new user inherits a policy when an assignment matches that user, with no copied row at invite. The existing `time_off_policies` rows become the time-off type, keeping their ids. An old row with no roles and no people becomes one company-wide assignment, so it still applies to everyone, including a new user. Do not add a permission key.

## Phases

Auto run: start at the first unchecked phase that is not blocked and does not depend on an unapplied migration. After that phase is green, continue to the next such phase in the same run if time allows. Each phase is its own commit on `main`. Append the Progress log as you go. Skip a blocked phase and log the skip.

A phase that adds a migration follows the Feature workflow migration rule. If the Progress log has `needs owner: supabase db push <migration>`, skip phases that depend on that migration and continue with phases that do not. `check:supabase:remote-drift` in deploy-readiness fails until the push lands. That is expected.

### Phase 1 — Three day states

- [x] Replace All day on, Off, and the From/To pair with three states.

Rules:

- Files: `src/features/availability/components/AvailabilityRequestForm.tsx`, a new `src/features/availability/utils/dayAvailabilityState.ts`, and `src/features/availability/utils/dayAvailabilityState.test.ts`.
- Follow Decision 1. Do not change `src/features/onboarding/components/EmployeeFixedAvailabilityStep.tsx` in this phase.
- Available all day uses `FULL_DAY_HOURS`. Unavailable is an empty hour list. Available at set hours uses `hoursFromClockRange`.
- The From and To fields stay on the row for set hours. Changing either field selects Available at set hours.
- The legend test id is `availability-state-legend`. The state buttons are `availability-state-all-day`, `availability-state-unavailable`, and `availability-state-hours`.
- Do not add a column. Do not change open versus fixed availability.

Done when:

- A day can be Available all day, Unavailable, or Available at set hours, and only one of those is selected.
- Editing a time on an Unavailable day selects Available at set hours and stores that range.
- The legend is visible above the rows.

Prove: `src/features/availability/utils/dayAvailabilityState.test.ts` maps empty hours to Unavailable, full-day hours to Available all day, a clock range to Available at set hours, and a time edit on an unavailable day to set hours. Add the file to `scripts/test-schedule-availability-engine.mjs` and run `node scripts/test-schedule-availability-engine.mjs`. Playwright coverage uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts` when `SUPABASE_SERVICE_ROLE_KEY` is present: on My Availability, change a time on an Unavailable day and assert Available at set hours is selected.

### Phase 2 — Repeat per day or selection

- [x] Let a repeat apply to one day or a selection of days, with a custom every-N choice and a three-date preview.

Rules:

- Files: `src/features/scheduling/utils/repeatPattern.ts`, `src/features/scheduling/utils/repeatPattern.test.ts`, `src/features/availability/components/AvailabilityRequestForm.tsx`, `src/features/scheduling/components/availability/PersonalAvailabilityPanel.tsx`, and `src/features/scheduling/components/dialogs/AddUnavailabilityDialog.tsx`.
- Follow Decision 2. Extend the existing repeat engine. Do not add a second one.
- Remove the week-level Repeats control as the only repeat. Each day has its own choice. Checking more than one day and setting a repeat applies that pattern to the checked days only. Unchecked days stay as they are.
- Labels: Does not repeat, Daily, Weekly, Monthly, Every 2 weeks (14 days), Every 15 days, Custom. Custom asks for N, days or weeks, and a start date.
- `patternFromChoice` keeps every-2-weeks and every-15-days as different patterns. Add a custom builder and a next-three-dates helper in the same file. The preview uses `occursOn`.
- Save writes `recurrence` only on the selected days' rows. A day set to Does not repeat stores null. Do not copy one pattern onto every inserted row.
- The Add unavailability dialog uses the same labels, the custom fields, and the preview. It still saves one pattern for the entry it creates.
- The preview test id is `availability-repeat-preview`.

Done when:

- Sunday can be Unavailable on every 15 days while Monday stays Does not repeat.
- Every 2 weeks (14 days) and Every 15 days are both in the list, with those labels.
- Custom every 10 days shows the start date and the next 3 dates.

Prove: Extend `src/features/scheduling/utils/repeatPattern.test.ts`. Every 2 weeks from a Sunday occurs that Sunday and 14 days later, and not 7 days later and not 15 days later. Every 15 days occurs on day 15 and not on day 14. Custom every 10 days occurs on the start date, 10 days later, and 20 days later. The next 3 dates for every 15 days are the start date, plus 15 days, and plus 30 days. A Sunday pattern does not occur on Monday. Run `node scripts/test-schedule-availability-engine.mjs`. Playwright coverage uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts` when `SUPABASE_SERVICE_ROLE_KEY` is present: set only Sunday to Unavailable, repeat every 15 days, assert three preview dates, and assert Monday stays Does not repeat.

### Phase 3 — Send availability

- [x] Replace Save changes and Request change with one Send availability button. Availability changes need no approval.

Rules:

- Files: `src/features/availability/components/AvailabilityRequestForm.tsx`, `src/features/availability/utils/nextAvailabilityWindow.ts`, a new `src/features/availability/utils/sendAvailabilityAction.ts`, and `src/features/availability/utils/sendAvailabilityAction.test.ts`.
- Follow Decision 3. Do not edit `docs/features/schedule.md`.
- The button label is Send availability. The test id is `availability-send`.
- The helper names the next window start from `approvedFixedAvailabilityWindow`. The UI does not say the send is waiting for approval.
- A locked week uses the same button and the same helper. Do not open the request dialog. Do not write an availability change request.
- The save writes the grid onto that next window. It does not change the window already being posted.
- Remove Save changes, Request change, and Send fixed availability from this screen. Keep Reset.
- Do not use the Save changes / Send request pair here. That pair is the permission-grant plan in `docs/features/system-admin.md`.

Done when:

- My Availability shows Send availability and the next-window message on an unlocked week and on a locked week.
- It does not show Save changes, Request change, or Send for approval.
- Sending does not create an approval request.

Prove: `src/features/availability/utils/sendAvailabilityAction.test.ts` returns the label Send availability, includes the next window start from `approvedFixedAvailabilityWindow`, and does not return Save changes, Request change, or Send for approval. The same result comes back when the week is locked. Add the file to `scripts/test-schedule-availability-engine.mjs` and run `node scripts/test-schedule-availability-engine.mjs`. Playwright coverage uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts` when `SUPABASE_SERVICE_ROLE_KEY` is present: My Availability shows Send availability and the next-window message, and does not show Save changes or Request change.

### Phase 4 — Company policies

- [ ] Give policies one Company policies area, with a type and assignments, and migrate `time_off_policies` into the time-off type.

Rules:

- Files: a new migration, `src/integrations/supabase/types.ts`, `src/features/scheduling/types/panels.ts`, `src/features/scheduling/components/ScheduleMoreMenu.tsx`, `src/features/scheduling/components/SchedulingPanelSheet.tsx`, `src/features/scheduling/components/TimeOffManagementPanel.tsx`, `src/features/scheduling/components/TimeOffPoliciesSection.tsx`, `src/features/availability/components/TimeOffRequestPanel.tsx`, and a new `src/features/scheduling/utils/companyPolicy.ts` with `src/features/scheduling/utils/companyPolicy.test.ts`.
- Follow Decision 4. The panel id is `company-policies`. The label is Company policies. It is not inside Team requests.
- Show the area only to someone who already passes the manage check `TimeOffPoliciesSection` uses (`canManage`). Do not add a permission key.
- Commit the migration and the generated types. If the Supabase API can reach the linked project, apply the migration. Otherwise log `needs owner: supabase db push <migration>`. Phases 5–9 depend on this migration. Skip them until it is applied.
- Migration path, in this order, in one migration:
  1. Create `company_policies` with `id`, `company_id`, `name`, `type`, and the current time-off columns (`unit`, `cap_week`, `cap_month`, `cap_year`, `eligible_weekdays`, `notice_days`). `type` is `time_off`, `availability`, or `scheduling_rules`.
  2. Create `company_policy_assignments` with `policy_id`, `target_type`, and `target_id`. `target_type` is `user`, `role`, `level`, `store`, or `company`.
  3. Copy every `time_off_policies` row into `company_policies` with the same `id` and `type` `time_off`. Copy the caps, weekdays, notice, and name.
  4. For each copied role id, insert a `role` assignment. For each copied user id, insert a `user` assignment. When both arrays are empty, insert one `company` assignment for that `company_id`.
  5. Point `time_off_requests.policy_id` at `company_policies`. The ids are unchanged, so existing requests keep their policy.
  6. Drop `time_off_policies` after that copy. Do not keep a second policy table.
- A level assignment stores a product level key: `staff`, `manager`, `admin`, or `owner`. A store assignment stores `profiles.location_id`, the store the week grid already groups by. Do not add a stores table.
- A person inherits a policy when one assignment matches their user id, `role_id`, product level, or `location_id`, or when the policy has a `company` assignment. Matching is computed. Do not insert an assignment when a user is invited.
- Empty state test id `company-policies-empty`. The line is "No company policies yet." Create policy opens the form. The type choices are Time off, Availability, and Scheduling rules.
- Time off uses the existing fields: unit, caps, weekdays, notice, and assignments. Availability and scheduling rules save a name, the type, and assignments only. Do not invent caps or weekday rules for those two types.
- This phase does not list or edit saved rows beyond the create form. Listing and editing a saved time-off policy stays Phase 5.
- Remove `TimeOffPoliciesSection` from Team requests. The request flow link text is Company policies. It opens this area. Hide it when the person lacks the manage check.
- Do not change `requestFitsPolicy` or `remainingBalances`. Weekend and Weekday examples stay on the time-off form.

Done when:

- Company policies opens from the schedule menu without opening Team requests.
- With no policies, the empty state and Create policy are visible to someone who can manage policies.
- Create policy can save a time-off policy, and the type list includes Availability and Scheduling rules.
- A migrated time-off policy keeps its id, its caps, and who it applied to. A new user in a matching role or store inherits it without a new assignment row.
- Team requests no longer contains the policy form.

Prove: `src/features/scheduling/utils/companyPolicy.test.ts` maps a `time_off_policies` row to a `time_off` company policy with the same id and caps. Role ids become `role` assignments, user ids become `user` assignments, and empty roles and people become one `company` assignment. A new user matches a role assignment, a level assignment, a store assignment, and a company assignment, and does not match an unrelated user assignment. Add the file to `scripts/test-schedule-task-link.mjs` and run `node scripts/test-schedule-task-link.mjs`. Assert the generated `company_policies` type includes `type` and the generated assignment type includes `target_type`. Playwright coverage uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts` when `SUPABASE_SERVICE_ROLE_KEY` is present: the managing user opens Company policies, sees the empty state and Create policy, and sees the Company policies link on My time off. The user without that check does not.

### Phase 5 — List and edit a saved policy

- [ ] Show saved policies and update the row the maker picks.

Rules:

- Files: `src/features/scheduling/components/TimeOffPoliciesSection.tsx`, `src/features/scheduling/hooks/useTimeOffPolicies.ts`, and a new `src/features/scheduling/utils/policyDraft.ts` with `src/features/scheduling/utils/policyDraft.test.ts`.
- The section lives in the Company policies area from Phase 4. Read and write `company_policies` where `type` is `time_off`. Do not write `time_off_policies`.
- List each saved time-off policy with its name, unit, week cap, month cap, year cap, weekdays, notice, and who it applies to.
- Edit loads that row into the existing form and calls `savePolicy` with that id. Save updates the row. It does not insert a second policy with the same name.
- Weekend example and Weekday example still fill a new policy. They do not overwrite a saved row unless Edit is open on that row.
- Do not add a table. Do not change `requestFitsPolicy` or `remainingBalances`.

Done when:

- Weekend and Weekday both appear after they are saved.
- Editing Weekend's month cap keeps one Weekend row and shows the new cap on that row.

Prove: Unit test `src/features/scheduling/utils/policyDraft.test.ts` builds a draft from a saved policy and keeps the id, the caps, the weekdays, and the notice. Run it with `node scripts/test-schedule-task-link.mjs` and add the file to that runner. Playwright coverage uses `tests/playwright/helpers/schedulingPlaywrightTenant.ts` when `SUPABASE_SERVICE_ROLE_KEY` is present: save Weekend, edit the month cap, and assert one Weekend row.

### Phase 6 — Pick people from the team

- [ ] Replace the pasted person-id box with the company roster.

Rules:

- Files: `src/features/scheduling/components/TimeOffPoliciesSection.tsx` and `src/features/scheduling/utils/policyDraft.ts` with its test.
- People come from the team list scheduling already loads. The chosen ids are `user` assignments on `company_policy_assignments`.
- An empty assignment list still means everyone, stored as the `company` assignment from Phase 4. Do not store a sentinel id.
- Use the matcher from Phase 4. Do not add a second applies-to function. Do not add a permission list.

Done when:

- A maker can add and remove a person without typing an id.
- Saving with nobody selected still applies the policy to everyone.

Prove: Extend `policyDraft.test.ts` so selected people become `user` assignments and an empty selection becomes the `company` assignment. Run it with `node scripts/test-schedule-task-link.mjs`.

### Phase 7 — Retire a policy

- [ ] Stop a policy from taking new requests without dropping its history.

Rules:

- Files: a new migration that adds nullable `archived_at` on `company_policies`, `src/integrations/supabase/types.ts`, `src/features/scheduling/hooks/useTimeOffPolicies.ts`, `src/features/scheduling/utils/policyDraft.ts`, `src/features/scheduling/components/TimeOffPoliciesSection.tsx`, and `src/features/availability/components/TimeOffRequestPanel.tsx`.
- This column is on the company policy row from Phase 4. Do not add it to `time_off_policies`.
- Commit the migration and the generated types. If the Supabase API can reach the linked project, apply the migration. Otherwise log `needs owner: supabase db push <migration>`.
- Retire sets `archived_at`. It does not delete the row. Old requests keep `policy_id`.
- An archived policy is off the request picker and off the "applies to you" balance list. A request already stored against it stays on the list and on the grid.
- Do not change the cap math.

Done when:

- Retiring Weekend hides it from new requests and from remaining-balance lines.
- A request already saved on Weekend still shows that policy name.

Prove: Extend `policyDraft.test.ts` so an archived policy is closed and an open policy stays open. Assert the generated `company_policies` type includes `archived_at`. Run it with `node scripts/test-schedule-task-link.mjs`.

### Phase 8 — The requester's balance on the team row

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

### Phase 9 — Edge cases on the existing fit rules

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

Blockers: none. The retire-policy follow-up, now Phase 7, adds a migration when it runs.

Questions: none.

### 2026-10-22 — Pedro's availability and policy placement

Shipped: no product code. Four phases are now first: three day states (Decision 1), repeat per day or selection (Decision 2), Send availability with no approval (Decision 3), and Company policies (Decision 4). The earlier five follow-ups are phases 5–9 and are still unchecked. They read the time-off type on `company_policies` after Phase 4.

Proven: docs only.

Blockers: none. Phase 4 adds the company-policies migration. Phase 7 adds `archived_at`. Phases 5–9 wait until the Phase 4 migration is applied.

Questions: none.

### 2026-10-22 — Phase 1 Three day states

Shipped: Each weekday on My Availability is Available all day, Unavailable, or Available at set hours. Available all day stores the existing full-day hours. Unavailable stores an empty hour list. Available at set hours stores the from-time and the to-time. Editing From or To on an Unavailable day selects Available at set hours and stores that range. A legend above the rows names the three states. There is no All day on button and no Off button. Open availability is unchanged. Reset stays.

Proven: `src/features/availability/utils/dayAvailabilityState.test.ts` passed through `node scripts/test-schedule-availability-engine.mjs`. Empty hours map to Unavailable, full-day hours map to Available all day, a clock range maps to Available at set hours, and a time edit on an unavailable day maps to set hours. `npm run check:i18n` printed 4588 keys for each locale and `hard-coded strings 0`. `npm run typecheck:src` passed. ESLint passed on `AvailabilityRequestForm.tsx`, `dayAvailabilityState.ts`, and `dayAvailabilityState.test.ts`. Playwright was not run because `SUPABASE_SERVICE_ROLE_KEY` is not set in this environment.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk, set the language to English, and open My Availability. The company must be on fixed availability, not open availability.
2. A legend above the weekday rows says each day is one of three states. Each day has Available all day, Unavailable, and Available at set hours, and only one is selected. There is no All day on button and no Off button.
3. Set a day to Unavailable, then change From or To. That day should switch to Available at set hours and keep the range you typed.
4. Available all day should not show From and To. Reset still clears unsaved edits.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 2 Repeat per day or selection

Shipped: Repeat belongs to one day or to the days that are checked, not to the whole week. The choices are Does not repeat, Daily, Weekly, Monthly, Every 2 weeks (14 days), Every 15 days, and Custom. Custom asks for N, days or weeks, and a start date. The preview lists the next 3 dates. Save writes `staff_availability.recurrence` only on the checked days. A day set to Does not repeat stores null. An Unavailable day with a repeat stores one row with that recurrence and no hours. Add unavailability uses the same labels, custom fields, and preview, and still saves one pattern for the entry it creates.

Proven: `src/features/scheduling/utils/repeatPattern.test.ts` passed through `node scripts/test-schedule-availability-engine.mjs`. Every 2 weeks from a Sunday occurs that Sunday and 14 days later, and not 7 days later and not 15 days later. Every 15 days occurs on day 15 and not on day 14. Custom every 10 days occurs on the start date, 10 days later, and 20 days later. The next 3 dates for every 15 days are the start date, plus 15 days, and plus 30 days. A Sunday pattern does not occur on Monday. Applying every 15 days to Sunday leaves Monday as Does not repeat. `npm run check:i18n` printed 4599 keys for each locale and `hard-coded strings 0`. `npm run typecheck:src` passed. ESLint passed on the files this phase changed. Playwright was not run because `SUPABASE_SERVICE_ROLE_KEY` is not set in this environment.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk, set the language to English, and open My Availability on fixed availability.
2. Each day shows its own repeat choice. Check only Sunday and set Repeats to Every 15 days. The preview under the control lists that Sunday and the next two dates, 15 and 30 days later. Monday still says Does not repeat.
3. Open the repeat list. Every 2 weeks (14 days) and Every 15 days are both there. Choose Custom, set N to 10 and Days, and set a start date. The preview shows that start date, 10 days later, and 20 days later.
4. Open Add unavailability. The same list, the custom fields, and the three-date preview are there. Saving still creates one unavailability entry.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 3 Send availability

Shipped: My Availability has one button, Send availability, and Reset. Save changes, Request change, and Send fixed availability are gone from this screen. The helper names the next window start from `approvedFixedAvailabilityWindow`. A locked week uses the same button and the same helper. Sending writes the grid on that next window and does not write an availability request. The posted window stays as it is.

Proven: `src/features/availability/utils/sendAvailabilityAction.test.ts` passed through `node scripts/test-schedule-availability-engine.mjs`. The label is Send availability. The window start matches `approvedFixedAvailabilityWindow`. The result does not include Save changes, Request change, or Send for approval. A locked week returns the same result. `npm run check:i18n` printed 4601 keys for each locale and `hard-coded strings 0`. `npm run typecheck:src` passed. ESLint passed on the TypeScript files this phase changed. Playwright was not run because `SUPABASE_SERVICE_ROLE_KEY` is not set in this environment.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk and open My Availability. The company availability choice needs a posting weekday and a window start and end. Those live on the availability choice settings.
2. On an unlocked week, the screen shows Send availability and a line that names the next window start date. It does not show Save changes, Request change, or Send fixed availability. Reset is still there.
3. On a locked week, the same button and the same next-window line are there. There is no request dialog and no line that says the change is waiting for approval.
4. Send availability. The week already being posted does not change. The grid is stored on the next window named in the helper.

Blockers: none. No migration.

Questions: none.
