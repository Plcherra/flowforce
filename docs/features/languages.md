# Languages

Next, after Theme. Do not open this file while Theme is active. When every phase here is checked, update `docs/roadmap.md`: this row becomes done, Time Off becomes active, and the run opens [docs/features/time-off.md](time-off.md).

## Goal

The app speaks the viewer's language. A person picks one of six languages. If they have not picked, the company language is used. If the company has not picked, the language is English.

Every user-facing string in the product lives in all six locale files in the same commit. Text a person writes is stored in the language they wrote it in, translated into the other five, and cached. A viewer whose language is different sees the translation, with a way to read the original.

UI string phases come first. Content translation phases come after the UI phases are done.

## Audit

Counted on 2026-10-22.

Locales are `src/locales/en.json`, `es.json`, `pt.json`, `fr.json`, `it.json`, and `de.json`. `src/i18n/config.ts` loads all six, falls back to English, and detects language from `localStorage`, then the browser, then the html tag. It does not read the company or the profile.

Flat key counts:

| Locale | Keys | Missing from en | Extra keys not in en |
| --- | ---: | ---: | ---: |
| en | 534 | 0 | 0 |
| es | 274 | 270 | 10 |
| pt | 419 | 164 | 49 |
| fr | 421 | 162 | 49 |
| it | 421 | 162 | 49 |
| de | 368 | 215 | 49 |

There are 832 `.tsx` files under `src/` and `app/`. 47 of them import `react-i18next`. `i18next` and `react-i18next` are installed. `LanguageProvider` wraps the app in `app/providers.tsx`. `LanguageSwitcher` is rendered from `src/features/marketing/components/LandingHeader.tsx` and writes `localStorage` key `i18nextLng`. The six codes in `src/contexts/LanguageContext.tsx` are `en`, `es`, `fr`, `de`, `it`, and `pt`.

Company language is `system_settings.localization.language`, edited on the Region tab in `src/features/system/components/LocalizationSettingsPanel.tsx`. That list is English, Español, Français, Deutsch, and Português. Italian is missing. Saving it does not call `i18n.changeLanguage`. `profiles` has no language column.

Areas with no `react-i18next` import include inventory (80 tsx), scheduling (62), forms (44), messages (44), analytics (30), company updates (29), employees (28), operations (24), and tasks (22). Dashboard, auth, marketing, resources, and onboarding are only partly wired.

Product AI runs on xAI Grok. The live non-translation call is `src/server/ops/suggestions/generateAutomationSuggestion.ts`: `XAI_API_KEY` from `src/lib/env.ts`, model `grok-4.3` unless `XAI_MODEL` is set. Edge functions `ai-insights` and `ai-analyze-updates` use the same provider. Translations stay on server-side `openai`, `OPENAI_API_KEY`, and `gpt-4o-mini`. `src/services/ai/aiObservability.ts` prices both. `public.ai_budget_controls` defaults to 1,000,000 tokens and 100 USD a month (`supabase/migrations/20260529000900_phase7_ai_observability_cost_controls.sql`). `public.ai_usage_events.prompt_key` only allows `scheduling_assistant`, `inventory_assistant`, `waste_assistant`, `compliance_assistant`, and `manager_briefing`. Usage is recorded with `record_ai_usage_event`. There is no translation call.

User-written text that later phases translate, and the column it lives in:

- `company_updates.title`, `body`, `rich_content`
- `company_update_comments.content`
- `forms.title`, `description`
- `form_fields.label`, `description`, `placeholder`, `options`
- `form_submissions.submission_data`
- `tasks.title`, `description`
- `task_comments.comment`
- `reminders.title`, `description`
- `custom_reports.name`, `description`
- `employee_report.notes`
- `schedules.title`, `notes`
- `time_off_requests.reason`, `notes`
- `announcements.title`, `content`
- `messages.content`
- `goals.title`, `description`
- `learning_courses.title`, `description`
- `training_modules.title`, `description`
- `recognition_events.message`
- `employee_badge.reason`
- `helpdesk_tickets.subject`, `description`
- `ops_issues.title`, `description`
- `expenses.description`, `notes`
- `vendor_visits.description`

`vendor_visits.vendor_name` is a name. Do not translate it.

## Decisions

These are locked for the auto run. Implement them. Do not edit this section while implementing a phase.

1. The languages are `en`, `es`, `pt`, `fr`, `it`, and `de`. A key that exists in one locale exists in all six, with a real string, in the same commit.
2. The viewer's language is `profiles.language` when it is one of the six. Otherwise it is `system_settings.localization.language` when that is one of the six. Otherwise it is `en`. After sign-in, that result wins over the browser language. `localStorage` `i18nextLng` is updated to match. Signed-out marketing pages keep the current detector.
3. The company control stays the Region tab. Add Italian there. Saving the company language does not overwrite `profiles.language`.
4. The personal control is a select of the six languages on Settings, visible when company fields are read-only. It writes `profiles.language` and calls the existing `changeLanguage`.
5. UI phases only move chrome strings. They do not translate text stored in the database.
6. A string phase uses `useTranslation`, adds the key under a namespace named for that feature, and writes the value in all six files. It does not change behavior. It removes that directory from the hard-coded baseline in the same commit.
7. Content keeps the original text in the column it already uses. The source language is the author's app language at save time. Translations of the other five languages are cached. The original save does not wait on the model. A view in a language with no fresh cache translates that language and then shows it. An edit changes the source hash and replaces the five cached rows.
8. One table, `content_translations`, holds every cache. Do not add a translations jsonb column to each source table. Columns: `company_id`, `source_table`, `source_id`, `field_path`, `source_locale`, `source_hash` (sha256 of the original string), `locale`, `translated_text`, timestamps. Unique on `(source_table, source_id, field_path, locale)`. `locale` and `source_locale` are the six codes. `locale` is not equal to `source_locale`. Enable RLS. Company members can select rows for their company through `current_user_company_ids()`. Authenticated and anon cannot insert, update, or delete. The server writes with the service role.
9. The model is the existing one. Server-side `openai`, `OPENAI_API_KEY`, `gpt-4o-mini`. Record usage with `record_ai_usage_event` and a new prompt key `content_translation`. Do not send the call through the insight output schema in `src/services/ai/aiPromptContracts.ts`. Before the call, use the existing `gpt-4o-mini` budget. When the budget blocks, or the call fails, show the original and do not cache a failure. Do not add a second budget. The monthly cap stays 1,000,000 tokens and 100 USD until someone changes `ai_budget_controls`.
10. Do not translate empty strings, person names, the company name, emails, phone numbers, URLs, SKUs, money amounts, dates, numbers, booleans, file names, or ids. A field that is only one of those is skipped. A sentence that contains one keeps it as written.
11. Form answers: translate free text. Do not translate number, date, time, rating, signature, file, scan, location, boolean, or formula values. An answer that is a selected option stays the stored option value. The translated option label is what the viewer sees.
12. `rich_content` translates text nodes and keeps the tags. If the tags would change, do not cache that result. Show the original.
13. The viewer sees one line when their language is not the source language: "Translated from {{language}}. See original". Choosing it shows the original for that record. Choosing it again shows the translation. The source language has no line. `{{language}}` is the name already in `src/contexts/LanguageContext.tsx`.
14. Push notifications and emails use the cached translation for the recipient's language. If the cache is empty, send the original.
15. Ship each phase with the Ship-To-Main rule: one commit on `main`, then push `main`. Do not open a pull request.

## Phases

Auto run: start at the first unchecked phase that is not blocked and does not depend on an unapplied migration. After that phase is green, continue to the next such phase in the same run if time allows. Each phase is its own commit on `main`. Append the Progress log as you go. Skip a blocked phase and log the skip.

Do the UI phases (1 through 24) before any content phase (25 through 43). A content phase that names the cache table depends on Phase 25. If the Progress log has `needs owner: supabase db push <migration>`, skip phases that depend on that migration and continue with phases that do not. `check:supabase:remote-drift` in deploy-readiness fails until the push lands. That is expected.

### Phase 1 — Same keys in all six locales

- [ ] Fill the gaps so en, es, pt, fr, it, and de have one key set.

Rules:

- Files: `src/locales/en.json`, `es.json`, `pt.json`, `fr.json`, `it.json`, `de.json`.
- Follow Decision 1. Do not change a translation that already exists. Add every missing en key to the other five, translated. Add every extra key to the locales that lack it, including English. Do not rename namespaces. Do not wire new screens.

Done when:

- The six files have the same flat key set.
- Existing values are unchanged.

Prove: A node script, inline in the phase commit or the Phase 2 checker if that lands in the same run, prints the six key counts and exits 0 only when the sets match. Run that script.

### Phase 2 — Locale check and the cursor rule

- [ ] Fail CI when a locale is behind, or when a new hard-coded string appears.

Rules:

- Files: a new `scripts/check-i18n.mjs`, a new `scripts/i18n-hardcoded-baseline.json`, `package.json`, `.github/workflows/deploy-readiness.yml`, and `.cursor/rules/Code-Standards.mdc`.
- Key check: every flat key in `en.json` exists in the other five, and no locale has a key the others lack. Fail otherwise.
- Hard-coded check: extract JSX text and string literals used as `placeholder`, `aria-label`, `title`, `alt`, or `label` under `src/` and `app/`. Ignore `className`, `data-testid`, ids, URLs, and strings with no letters. The extracted set must match the baseline. A new literal fails. Generate the baseline from the current tree so this phase is green.
- Add the script as `check:i18n`. Add one step to `deploy-readiness.yml` after the architecture contract. Do not edit `check:local` or `check:release`.
- Add this bullet to `Code-Standards.mdc`, and no other sentence: `Every new user-facing string is added to src/locales/en.json, es.json, pt.json, fr.json, it.json, and de.json in the same commit.`

Done when:

- `npm run check:i18n` exits 0 on this tree.
- A missing locale key fails the checker. A JSX literal that is not in the baseline fails the checker.
- The cursor rule is that one bullet.

Prove: `npm run check:i18n`. A unit test of the two comparators, with a fixture that is missing a key and a fixture that has an extra literal, expects failure. Run it with the jiti runner.

### Phase 3 — Personal language, company fallback

- [ ] Resolve the viewer's language and let them set it.

Rules:

- Files: a new `src/i18n/resolveLanguage.ts` with `src/i18n/resolveLanguage.test.ts`, `src/i18n/config.ts`, `src/contexts/LanguageContext.tsx`, `src/features/system/components/LocalizationSettingsPanel.tsx`, the Settings page that holds the personal select, and a new migration.
- Follow Decisions 2, 3, and 4. Add `profiles.language` as nullable text constrained to the six codes. Null means follow the company. Do not backfill. Users who can already update their own profile can update this column. Do not add a second profile policy if that update is already allowed.
- Create the migration with `supabase migration new`. Update `src/integrations/supabase/types.ts` and `supabase/database.types.ts` in the same commit.
- If the Supabase CLI can reach the linked project, apply it with `supabase db push`. Otherwise log `needs owner: supabase db push <migration>`. Later UI phases do not depend on the push. They can use the local types.

Done when:

- A set profile language is used after sign-in.
- An empty profile language uses the company language, then English.
- The Region tab lists Italian. The personal select writes the profile and the active i18n language.

Prove: Unit test `src/i18n/resolveLanguage.test.ts` covers profile, company fallback, and English. Run it with the jiti runner. `npm run typecheck`.

### Phase 4 — Schedule strings

- [ ] Move Schedule chrome into the six locales.

Rules:

- Files: `src/features/scheduling/**`. Follow Decisions 5 and 6. Namespace `schedule`. Leave shift notes, titles, and time-off reasons as stored text.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 5 — Tasks strings

- [ ] Move Tasks chrome into the six locales.

Rules:

- Files: `src/features/tasks/**`. Follow Decisions 5 and 6. Namespace `tasks`. Leave task titles, descriptions, and comments as stored text.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 6 — App shell strings

- [ ] Finish the shell strings in all six locales.

Rules:

- Files: `src/app-shell/**`. Follow Decisions 5 and 6. The bottom nav already calls `useTranslation`. Move the remaining literals. Namespace `nav` and `shell`.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 7 — Shared component strings

- [ ] Move shared component chrome into the six locales.

Rules:

- Files: `src/components/**`. Follow Decisions 5 and 6. Namespace `common`.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 8 — Dashboard and auth strings

- [ ] Finish dashboard and auth strings in all six locales.

Rules:

- Files: `src/features/dashboard/**` and `src/features/auth/**`. Follow Decisions 5 and 6. Namespaces `dashboard` and `auth`. Keep keys that already exist.

Done when:

- Those directories are off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 9 — Forms strings

- [ ] Move Forms chrome into the six locales.

Rules:

- Files: `src/features/forms/**`. Follow Decisions 5 and 6. Namespace `forms`. Leave form titles, questions, options, and answers as stored text.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 10 — Company update strings

- [ ] Move Company update chrome into the six locales.

Rules:

- Files: `src/features/company-updates/**`. Follow Decisions 5 and 6. Namespace `updates`. Leave titles, bodies, and comments as stored text.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 11 — Messages strings

- [ ] Move Messages chrome into the six locales.

Rules:

- Files: `src/features/messages/**`. Follow Decisions 5 and 6. Namespace `messages`. Leave message bodies as stored text.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 12 — Inventory component strings

- [ ] Move Inventory component chrome into the six locales.

Rules:

- Files: `src/features/inventory/components/**`. Follow Decisions 5 and 6. Namespace `inventory`.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 13 — Inventory pages and hooks

- [ ] Move the rest of Inventory chrome into the six locales.

Rules:

- Files: `src/features/inventory/**` outside `components`. Follow Decisions 5 and 6. Namespace `inventory`.

Done when:

- That tree is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 14 — Analytics strings

- [ ] Move Analytics chrome into the six locales.

Rules:

- Files: `src/features/analytics/**`. Follow Decisions 5 and 6. Namespace `analytics`. Leave report names and notes as stored text.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 15 — Operations strings

- [ ] Move Operations chrome into the six locales.

Rules:

- Files: `src/features/operations/**`. Follow Decisions 5 and 6. Namespace `operations`. Leave issue titles as stored text.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 16 — Sections strings

- [ ] Move Sections chrome into the six locales.

Rules:

- Files: `src/features/sections/**` and `src/sections/**`. Follow Decisions 5 and 6. Namespace `sections`.

Done when:

- Those directories are off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 17 — Employees and profile strings

- [ ] Move employee and profile chrome into the six locales.

Rules:

- Files: `src/features/employees/**` and `src/features/profile/**`. Follow Decisions 5 and 6. Namespaces `employees` and `profile`. Leave names as names.

Done when:

- Those directories are off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 18 — Onboarding strings

- [ ] Finish onboarding strings in all six locales.

Rules:

- Files: `src/features/onboarding/**` and `src/features/templates/**`. Follow Decisions 5 and 6. Namespace `onboarding`. Keep keys that already exist.

Done when:

- Those directories are off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 19 — Marketing strings

- [ ] Finish marketing strings in all six locales.

Rules:

- Files: `src/features/marketing/**`. Follow Decisions 5 and 6. Namespace `landing` and `footer`. Keep keys that already exist. The header switcher stays until Phase 3's personal select exists. Do not remove it in this phase.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 20 — Resources strings

- [ ] Finish resources strings in all six locales.

Rules:

- Files: `src/features/resources/**`. Follow Decisions 5 and 6. Namespace `resources`. Keep keys that already exist.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 21 — Learning strings

- [ ] Move Learning chrome into the six locales.

Rules:

- Files: `src/features/learning/**`. Follow Decisions 5 and 6. Namespace `learning`. Leave course and module titles as stored text.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 22 — Settings, admin, and roles strings

- [ ] Move settings, admin, and roles chrome into the six locales.

Rules:

- Files: `src/features/system/**`, `src/features/admin/**`, and `src/features/roles/**`. Follow Decisions 5 and 6. Namespaces `settings`, `admin`, and `roles`. The language names stay the names already shown (English, Español, Français, Deutsch, Italiano, Português).

Done when:

- Those directories are off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 23 — Remaining feature strings

- [ ] Move the smaller screens' chrome into the six locales.

Rules:

- Files: `src/features/calendar/**`, `src/features/gamification/**`, `src/features/recognition/**`, `src/features/performance/**`, `src/features/availability/**`, `src/features/positions/**`, `src/features/ai/**`, and `src/features/permissions/**`. Follow Decisions 5 and 6. One namespace per feature.

Done when:

- Those directories are off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 24 — Routes and hooks

- [ ] Move remaining route and hook chrome into the six locales.

Rules:

- Files: `app/**`, `src/hooks/**`, and `src/shared/**`. Follow Decisions 5 and 6. A page that only renders a feature component stays as it is. After this phase the hard-coded baseline has no entries.

Done when:

- `scripts/i18n-hardcoded-baseline.json` is empty.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 25 — Translation cache

- [ ] Add `content_translations` and the `content_translation` prompt key.

Rules:

- Depends on Phases 1 through 24 being checked. Follow Decision 8 and Decision 9's prompt key only. Do not call the model in this phase.
- Create the migration with `supabase migration new`. Extend the `ai_usage_events` prompt-key check and `record_ai_usage_event` so `content_translation` is allowed. Add the same code to the `AIPromptContractKey` union only if the usage helper requires it. Do not run translation text through the insight schema.
- Allow `source_table` values for every table listed in the Audit.
- Update `src/integrations/supabase/types.ts` and `supabase/database.types.ts` in the same commit.
- If the Supabase CLI can reach the linked project, apply it with `supabase db push`. Otherwise log `needs owner: supabase db push <migration>`. Phases 26 and 27 do not read the table from the hosted database. Phases 28 through 43 do. Skip them until the push is logged as landed.

Done when:

- The table, the check constraint, and the types include the cache and `content_translation`.
- The Progress log says the push landed, or it says `needs owner: supabase db push <migration>`.

Prove: `npm run typecheck`. A SQL test is not required in this environment when the push did not run.

### Phase 26 — Translate on save and on first view

- [ ] Cache a translation without blocking the original save.

Rules:

- Depends on Phase 25 being applied. Files: a new `src/server/i18n/translateContent.ts` with `src/server/i18n/translateContent.test.ts`.
- Follow Decisions 7, 9, and 10. The test uses a fake model client. Do not call OpenAI from the test.
- The helper hashes the original, skips the source language, skips the empty and non-translatable cases, returns the cached row when the hash matches, and replaces rows when the hash differs.
- A budget block or a thrown client returns the original and writes no row.

Done when:

- A fresh hash misses the cache and stores the other five locales.
- The same hash does not call the model again.
- A failed call leaves the cache empty.

Prove: Unit test `src/server/i18n/translateContent.test.ts`. Run it with the jiti runner.

### Phase 27 — See original

- [ ] Show the translated-from line.

Rules:

- Files: a new `src/features/i18n/TranslatedText.tsx` with `src/features/i18n/translatedText.test.ts`, and the six locale files.
- Follow Decision 13. The line is one control for the whole record. The source language renders the original and no line.
- Add the two strings to all six locales in this commit.

Done when:

- A Spanish viewer of an English source sees "Translated from English. See original" in Spanish, and the control swaps the body.
- An English viewer of that source sees no line.

Prove: Unit test `src/features/i18n/translatedText.test.ts` covers both viewers. Run it with the jiti runner. `npm run check:i18n`.

### Phase 28 — Company update content

- [ ] Translate company update title, body, and rich content.

Rules:

- Depends on Phases 25 and 26. Files: the company update save path and the read path under `src/features/company-updates/**`, plus `TranslatedText`.
- Follow Decisions 7, 11, and 12. Field paths: `title`, `body`, `rich_content`.
- Do not translate comments in this phase.

Done when:

- An English update saved by an English author is shown in Spanish from the cache.
- Editing the body replaces the cached body.
- The original save succeeds when the model is not called.

Prove: Unit test the field list and the hash replacement for a company update. Run it with the jiti runner.

### Phase 29 — Company update comments

- [ ] Translate a comment on a company update.

Rules:

- Files: the comment save and read path. Field path `content`. Follow Decisions 7 and 13.

Done when:

- A comment shows in the viewer's language, with the see-original line when the languages differ.

Prove: Unit test the comment field path and the source-language hide. Run it with the jiti runner.

### Phase 30 — Form titles

- [ ] Translate a form's title and description.

Rules:

- Files: the form save and read path under `src/features/forms/**`. Field paths `title` and `description`. Follow Decision 7.

Done when:

- The form list and the form header use the cache. The source language shows the original.

Prove: Unit test those two field paths. Run it with the jiti runner.

### Phase 31 — Form questions and options

- [ ] Translate labels, help, placeholders, and option labels.

Rules:

- Files: the form builder save path and the fill and review read path. Follow Decisions 7 and 11.
- Read the options JSON the builder already writes. Do not invent a second options shape. Field paths: `label`, `description`, `placeholder`, and one path per option label that matches that JSON.
- The stored answer remains the option value.

Done when:

- A viewer sees translated questions and option labels.
- The submission still stores the same option value it stores today.

Prove: Unit test an options JSON taken from the builder, and assert the stored value is unchanged. Run it with the jiti runner.

### Phase 32 — Form answers

- [ ] Translate free-text answers.

Rules:

- Files: the submission read path. Follow Decisions 7, 10, and 11. Field path `submission_data.{fieldId}` for text the fill dialog stored as prose.
- Do not translate the skipped types in Decision 11.

Done when:

- A free-text answer is translated. A number, a date, a rating, a file, and a chosen option value are not sent to the model.

Prove: Unit test one answer of each of those kinds. Run it with the jiti runner.

### Phase 33 — Task content

- [ ] Translate task title and description.

Rules:

- Files: the task save and read path under `src/features/tasks/**`. Field paths `title` and `description`. Follow Decision 7. Do not translate comments in this phase.

Done when:

- The task list and the task dialog use the cache.

Prove: Unit test the two field paths and an edit that changes the hash. Run it with the jiti runner.

### Phase 34 — Task comments

- [ ] Translate a task comment.

Rules:

- Files: the task comment save and read path. Field path `comment`. Follow Decisions 7 and 13.

Done when:

- A comment shows in the viewer's language, with the see-original line when the languages differ.

Prove: Unit test the comment field path. Run it with the jiti runner.

### Phase 35 — Reminders

- [ ] Translate reminder title and description.

Rules:

- Files: the reminder save and read path. Field paths `title` and `description`. Follow Decisions 7 and 14.

Done when:

- The reminder on screen uses the cache. A notification uses the cache or, if it is missing, the original.

Prove: Unit test the two field paths and the empty-cache notification fallback. Run it with the jiti runner.

### Phase 36 — Reports

- [ ] Translate report names and written notes.

Rules:

- Files: the custom report and employee report read and save paths. Field paths `custom_reports.name`, `custom_reports.description`, and `employee_report.notes`. Follow Decisions 7 and 10. Do not translate filters, column ids, or amounts.

Done when:

- A report name and an employee note show in the viewer's language.

Prove: Unit test those field paths and a skipped amount. Run it with the jiti runner.

### Phase 37 — Schedule text

- [ ] Translate shift titles, shift notes, and time-off reasons.

Rules:

- Files: the schedule and time-off save and read paths. Field paths `schedules.title`, `schedules.notes`, `time_off_requests.reason`, and `time_off_requests.notes`. Follow Decisions 7 and 10. Do not translate `schedules.color` or a person's name.

Done when:

- The grid and the time-off list use the cache for those fields.

Prove: Unit test the four field paths. Run it with the jiti runner.

### Phase 38 — Announcements

- [ ] Translate announcement title and content.

Rules:

- Files: the announcement save and read path. Field paths `title` and `content`. Follow Decision 7.

Done when:

- An announcement shows in the viewer's language.

Prove: Unit test the two field paths. Run it with the jiti runner.

### Phase 39 — Message bodies

- [ ] Translate a message body.

Rules:

- Files: the message save and read path. Field path `content`. Follow Decisions 7, 9, and 13. The original send does not wait on the model. A budget block shows the original.

Done when:

- A message shows in the viewer's language when the cache exists, and shows the original when the budget blocks.

Prove: Unit test the cache hit and the budget block. Run it with the jiti runner.

### Phase 40 — Goals

- [ ] Translate goal title and description.

Rules:

- Files: the goal save and read path. Field paths `title` and `description`. Follow Decision 7.

Done when:

- A goal shows in the viewer's language.

Prove: Unit test the two field paths. Run it with the jiti runner.

### Phase 41 — Learning content

- [ ] Translate course and module titles and descriptions.

Rules:

- Files: the learning course and training module save and read paths. Field paths `learning_courses.title`, `learning_courses.description`, `training_modules.title`, and `training_modules.description`. Follow Decision 7.

Done when:

- A course and a module show in the viewer's language.

Prove: Unit test the four field paths. Run it with the jiti runner.

### Phase 42 — Recognition

- [ ] Translate recognition messages and badge reasons.

Rules:

- Files: the recognition and badge read and save paths. Field paths `recognition_events.message` and `employee_badge.reason`. Follow Decisions 7 and 10. Do not translate the person's name.

Done when:

- The message and the reason show in the viewer's language.

Prove: Unit test the two field paths. Run it with the jiti runner.

### Phase 43 — Remaining written text

- [ ] Translate the remaining notes people type.

Rules:

- Files: helpdesk, ops issue, expense, and vendor visit save and read paths. Field paths `helpdesk_tickets.subject`, `helpdesk_tickets.description`, `ops_issues.title`, `ops_issues.description`, `expenses.description`, `expenses.notes`, and `vendor_visits.description`. Follow Decisions 7 and 10. Do not translate `vendor_visits.vendor_name`, amounts, or receipt URLs.

Done when:

- Those fields show in the viewer's language, and a vendor name is unchanged.

Prove: Unit test the field paths and the untouched vendor name. Run it with the jiti runner.

## Open questions

None. The model, the price table, and the monthly cap are the ones the app already uses.

## Progress log

### 2026-10-22 — Plan

Shipped: this file. No app code, no locale edits, no migration.

Blockers: none.

Questions: none.
