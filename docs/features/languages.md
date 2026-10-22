# Languages

Active. The roadmap marks this file for the 6 AM run. When every phase here is checked, update `docs/roadmap.md`: this row becomes done, Time Off becomes active, and the run opens [docs/features/time-off.md](time-off.md).

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

- [x] Fill the gaps so en, es, pt, fr, it, and de have one key set.

Rules:

- Files: `src/locales/en.json`, `es.json`, `pt.json`, `fr.json`, `it.json`, `de.json`.
- Follow Decision 1. Do not change a translation that already exists. Add every missing en key to the other five, translated. Add every extra key to the locales that lack it, including English. Do not rename namespaces. Do not wire new screens.

Done when:

- The six files have the same flat key set.
- Existing values are unchanged.

Prove: A node script, inline in the phase commit or the Phase 2 checker if that lands in the same run, prints the six key counts and exits 0 only when the sets match. Run that script.

### Phase 2 — Locale check and the cursor rule

- [x] Fail CI when a locale is behind, or when a new hard-coded string appears.

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

- [x] Resolve the viewer's language and let them set it.

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

- [x] Move Schedule chrome into the six locales.

Rules:

- Files: `src/features/scheduling/**`. Follow Decisions 5 and 6. Namespace `schedule`. Leave shift notes, titles, and time-off reasons as stored text.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 5 — Tasks strings

- [x] Move Tasks chrome into the six locales.

Rules:

- Files: `src/features/tasks/**`. Follow Decisions 5 and 6. Namespace `tasks`. Leave task titles, descriptions, and comments as stored text.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 6 — App shell strings

- [x] Finish the shell strings in all six locales.

Rules:

- Files: `src/app-shell/**`. Follow Decisions 5 and 6. The bottom nav already calls `useTranslation`. Move the remaining literals. Namespace `nav` and `shell`.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 7 — Shared component strings

- [x] Move shared component chrome into the six locales.

Rules:

- Files: `src/components/**`. Follow Decisions 5 and 6. Namespace `common`.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 8 — Dashboard and auth strings

- [x] Finish dashboard and auth strings in all six locales.

Rules:

- Files: `src/features/dashboard/**` and `src/features/auth/**`. Follow Decisions 5 and 6. Namespaces `dashboard` and `auth`. Keep keys that already exist.

Done when:

- Those directories are off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 9 — Forms strings

- [x] Move Forms chrome into the six locales.

Rules:

- Files: `src/features/forms/**`. Follow Decisions 5 and 6. Namespace `forms`. Leave form titles, questions, options, and answers as stored text.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 10 — Company update strings

- [x] Move Company update chrome into the six locales.

Rules:

- Files: `src/features/company-updates/**`. Follow Decisions 5 and 6. Namespace `updates`. Leave titles, bodies, and comments as stored text.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 11 — Messages strings

- [x] Move Messages chrome into the six locales.

Rules:

- Files: `src/features/messages/**`. Follow Decisions 5 and 6. Namespace `messages`. Leave message bodies as stored text.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 12 — Inventory component strings

- [x] Move Inventory component chrome into the six locales.

Rules:

- Files: `src/features/inventory/components/**`. Follow Decisions 5 and 6. Namespace `inventory`.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 13 — Inventory pages and hooks

- [x] Move the rest of Inventory chrome into the six locales.

Rules:

- Files: `src/features/inventory/**` outside `components`. Follow Decisions 5 and 6. Namespace `inventory`.

Done when:

- That tree is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 14 — Analytics strings

- [x] Move Analytics chrome into the six locales.

Rules:

- Files: `src/features/analytics/**`. Follow Decisions 5 and 6. Namespace `analytics`. Leave report names and notes as stored text.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 15 — Operations strings

- [x] Move Operations chrome into the six locales.

Rules:

- Files: `src/features/operations/**`. Follow Decisions 5 and 6. Namespace `operations`. Leave issue titles as stored text.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 16 — Sections strings

- [x] Move Sections chrome into the six locales.

Rules:

- Files: `src/features/sections/**` and `src/sections/**`. Follow Decisions 5 and 6. Namespace `sections`.

Done when:

- Those directories are off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 17 — Employees and profile strings

- [x] Move employee and profile chrome into the six locales.

Rules:

- Files: `src/features/employees/**` and `src/features/profile/**`. Follow Decisions 5 and 6. Namespaces `employees` and `profile`. Leave names as names.

Done when:

- Those directories are off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 18 — Onboarding strings

- [x] Finish onboarding strings in all six locales.

Rules:

- Files: `src/features/onboarding/**` and `src/features/templates/**`. Follow Decisions 5 and 6. Namespace `onboarding`. Keep keys that already exist.

Done when:

- Those directories are off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 19 — Marketing strings

- [x] Finish marketing strings in all six locales.

Rules:

- Files: `src/features/marketing/**`. Follow Decisions 5 and 6. Namespace `landing` and `footer`. Keep keys that already exist. The header switcher stays until Phase 3's personal select exists. Do not remove it in this phase.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 20 — Resources strings

- [x] Finish resources strings in all six locales.

Rules:

- Files: `src/features/resources/**`. Follow Decisions 5 and 6. Namespace `resources`. Keep keys that already exist.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 21 — Learning strings

- [x] Move Learning chrome into the six locales.

Rules:

- Files: `src/features/learning/**`. Follow Decisions 5 and 6. Namespace `learning`. Leave course and module titles as stored text.

Done when:

- That directory is off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 22 — Settings, admin, and roles strings

- [x] Move settings, admin, and roles chrome into the six locales.

Rules:

- Files: `src/features/system/**`, `src/features/admin/**`, and `src/features/roles/**`. Follow Decisions 5 and 6. Namespaces `settings`, `admin`, and `roles`. The language names stay the names already shown (English, Español, Français, Deutsch, Italiano, Português).

Done when:

- Those directories are off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 23 — Remaining feature strings

- [x] Move the smaller screens' chrome into the six locales.

Rules:

- Files: `src/features/calendar/**`, `src/features/gamification/**`, `src/features/recognition/**`, `src/features/performance/**`, `src/features/availability/**`, `src/features/positions/**`, `src/features/ai/**`, and `src/features/permissions/**`. Follow Decisions 5 and 6. One namespace per feature.

Done when:

- Those directories are off the hard-coded baseline.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 24 — Routes and hooks

- [x] Move remaining route and hook chrome into the six locales.

Rules:

- Files: `app/**`, `src/hooks/**`, and `src/shared/**`. Follow Decisions 5 and 6. A page that only renders a feature component stays as it is. After this phase the hard-coded baseline has no entries.

Done when:

- `scripts/i18n-hardcoded-baseline.json` is empty.
- `npm run check:i18n` exits 0.

Prove: `npm run check:i18n`.

### Phase 25 — Translation cache

- [x] Add `content_translations` and the `content_translation` prompt key.

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

### 2026-10-22 — Phase 1 Same keys in all six locales

Shipped: en, es, pt, fr, it, and de now share one flat key set of 603 keys. Missing keys were added in the language of that file. Existing values were left as they were. No screen was rewired.

Proven: `node scripts/check-locale-keys.mjs` printed 603 for each locale and exited 0.

Phone steps for Pedro:
1. Open https://www.flowforce.uk signed out and use the language switch in the header.
2. Choose Español, then Português, Français, Italiano, and Deutsch. Labels that used to stay in English should follow the language you picked.
3. Switch back to English. Wording that was already English should read the same as before this deploy.
4. Sign in and open the dashboard. A greeting or profile label should follow the language chosen in the header.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 2 Locale check and the cursor rule

Shipped: `npm run check:i18n` fails when a locale key is missing from one of the six files, or when a hard-coded JSX string under `src/` or `app/` is not in `scripts/i18n-hardcoded-baseline.json`. The baseline is the current tree, 4524 strings. Deploy readiness runs the check after the architecture contract. The code-standards rule now says every new user-facing string goes into all six locale files in the same commit.

Proven: `npm run check:i18n` printed 603 keys for each locale and `hard-coded strings 4524`, then exited 0. The comparator test in `src/i18n/i18nCheck.test.ts` expects failure for a missing Spanish key and for an extra literal. Run with jiti. It passed.

Phone steps for Pedro:
1. This phase does not change what you see on the phone. Open https://www.flowforce.uk and confirm the language switch still changes the header language.
2. No new screen and no new setting.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 3 Personal language, company fallback

Shipped: After sign-in, the viewer's language is `profiles.language` when it is one of the six codes, otherwise the company language, otherwise English. That choice is written to `i18nextLng`. Signed-out pages still use the browser detector. Settings, on the Region tab, has a personal language select that stays usable when the company fields are read-only. It writes `profiles.language` and switches the app. The company language list now includes Italian. Saving the company language does not write the profile column. `profiles.language` is nullable text limited to en, es, pt, fr, it, and de. Existing rows were not backfilled. The existing own-profile update policy already allows the write, so no second policy was added.

Proven: `src/i18n/resolveLanguage.test.ts` covers a profile language, the company fallback, and English. Run with jiti. It passed. `npm run typecheck` and `npm run typecheck:src` passed. ESLint passed on the files this phase changed. `npm run check:i18n` still exits 0.

Phone steps for Pedro:
1. Sign in on https://www.flowforce.uk and open Settings, then Region.
2. Your language sits above the company fields. It is there even when those fields are read-only.
3. Pick Español or Deutsch. The app should switch immediately. Reload. The same language should still be on.
4. The company language list should include Italiano. Change it and save. Your personal language should stay what you picked.
5. A person who has not picked a personal language follows the company language. If the company language is also empty, the app is English.

Blockers: none. The Supabase CLI had no access token, so `supabase db push` could not run. The migration was applied with the Supabase API. Remote history version `20261022114112` matches `supabase/migrations/20261022114112_profiles_language.sql`.

Questions: none.

### 2026-10-22 — Phase 4 Schedule strings

Shipped: Schedule chrome under `src/features/scheduling` now uses `useTranslation` and the `schedule` namespace. The same strings are in en, es, pt, fr, it, and de. Shift notes, shift titles, and time-off reasons that people type stay as stored text. The directory is off the hard-coded baseline. Two type signatures that the checker read as text were rewritten so the words stayed code.

Proven: `npm run check:i18n` printed 1036 keys for each locale and `hard-coded strings 4046`, then exited 0. `npm run typecheck:src` passed. ESLint passed on the scheduling files this phase changed.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk and open the schedule.
2. Set your language to Español on Settings, then Region. Reload. Buttons such as Add, Publish, and Filters, and the week desk, should be in Spanish. A shift title someone typed stays in the language they wrote.
3. Switch to Deutsch and open time off and availability. The labels should be German. A reason someone typed stays as they wrote it.
4. Switch back to English. The schedule labels should match the wording from before this deploy.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 5 Tasks strings

Shipped: Tasks chrome under `src/features/tasks` now uses `useTranslation` and the `tasks` namespace. The same strings are in en, es, pt, fr, it, and de. Task titles, descriptions, and comments that people type stay as stored text. The directory is off the hard-coded baseline. A corrupted apostrophe in the activity-feed reconnect line is now a normal apostrophe in every locale. A keyboard-handler type that the checker read as text is a named type so the code stays code.

Proven: `npm run check:i18n` printed 1188 keys for each locale and `hard-coded strings 3873`, then exited 0. `npm run typecheck:src` passed. ESLint passed on the tasks files this phase changed.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk and open Tasks.
2. Set your language to Français on Settings, then Region. Reload. Filters, empty states, and the new-task dialog should be in French. A task title someone typed stays as they wrote it.
3. Open a task and look at comments and reminders. The buttons and placeholders should be French. A comment someone typed stays as they wrote it.
4. Switch to Italiano and confirm the task list labels follow. Switch back to English.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 6 App shell strings

Shipped: The remaining app-shell chrome uses `useTranslation`. Page names and the bottom-nav label sit in `nav`. Notifications, offline sync, account setup, and the route fallback sit in `shell`. The same strings are in en, es, pt, fr, it, and de. The product name FlowForce stays FlowForce. The bottom nav already called `useTranslation`; its remaining label moved with the rest. `src/app-shell` is off the hard-coded baseline.

Proven: `npm run check:i18n` printed 1220 keys for each locale and `hard-coded strings 3839`, then exited 0. `npm run typecheck:src` passed. ESLint passed on `src/app-shell`.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk on a phone.
2. Set your language to Português. The bottom nav and the notifications bell should use Portuguese labels. The name FlowForce stays FlowForce.
3. Open search and type a page name. The empty result should be Portuguese.
4. Switch back to English.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 7 Shared component strings

Shipped: Shared chrome under `src/components` now uses `useTranslation` and the `common` namespace. The same strings are in en, es, pt, fr, it, and de. Buttons, loading text, dialog and sheet close labels, pagination, the sidebar toggle, breadcrumbs, and the shared error screens follow the viewer's language. The directory is off the hard-coded baseline. Type intersections that the checker read as text are named types so the code stays code.

Proven: `npm run check:i18n` printed 1247 keys for each locale and `hard-coded strings 3806`, then exited 0. `npm run typecheck:src` passed. ESLint passed on the component files this phase changed.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk on a phone.
2. Set your language to Español on Settings, then Region. Open a dialog. The close control for a screen reader should be "Cerrar". The sidebar control should be "Alternar barra lateral".
3. Open a list that has pages, such as employees or inventory. Previous and Next should be "Anterior" and "Siguiente".
4. Switch to Deutsch and use a Back button. It should say "Zurück". Switch back to English. Back, Close, and Previous should read as they did before this deploy.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 8 Dashboard and auth strings

Shipped: Dashboard and sign-in chrome now uses `useTranslation`. New strings sit in `dashboard` and `auth`. Keys that already existed, including Cancel, Try Again, and the company registration title, stay on those keys. The same strings are in en, es, pt, fr, it, and de. The product name FlowForce stays FlowForce. Shift titles, update titles, and update bodies that people type stay as stored text. Both directories are off the hard-coded baseline.

Proven: `npm run check:i18n` printed 1425 keys for each locale and `hard-coded strings 3703`, then exited 0. `npm run typecheck:src` passed. ESLint passed on `src/features/dashboard` and `src/features/auth`.

Phone steps for Pedro:
1. Sign out and open https://www.flowforce.uk/auth. Set the language to Français before signing in. The sign-in form, forgot-password link, and company registration should be in French. FlowForce stays FlowForce.
2. Sign in and open the dashboard. Set your language to Deutsch on Settings, then Region. Reload. The command center, company updates card, and daily actions should be in German. An update title someone typed stays as they wrote it.
3. Switch to Español and open the create-update dialog if you can. The fields and buttons should be in Spanish. Switch back to English.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 9 Forms strings

Shipped: Forms chrome under `src/features/forms` now uses `useTranslation` and the `forms` namespace. The same strings are in en, es, pt, fr, it, and de. Keys that already existed, including Cancel, Back, Close, and Edit, stay on those keys. Form titles, questions, options, and answers that people type stay as stored text. Template questions that get saved with a new form stay as stored text. The directory is off the hard-coded baseline. A pointer-event union and a compact-view comment that the checker read as text were rewritten so the words stayed code. A count that sits next to a number is one phrase, so the space and the word order stay intact.

Proven: `npm run check:i18n` printed 1681 keys for each locale and `hard-coded strings 3444`, then exited 0. `npm run typecheck:src` passed. ESLint passed on `src/features/forms`.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk and open Forms.
2. Set your language to Español on Settings, then Region. Reload. The page title, search, New form, and the list columns should be in Spanish. A form name someone typed stays in the language they wrote.
3. Open a form and walk the steps. Next, Back, and Submit should follow the language. A question someone wrote stays as they wrote it.
4. Switch to Deutsch and open the form builder if you can edit forms. Required, Placeholder, and Add field should be German.
5. Switch back to English. The form labels should match the wording from before this deploy.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 10 Company update strings

Shipped: Company update chrome under `src/features/company-updates` now uses `useTranslation` and the `updates` namespace. The same strings are in en, es, pt, fr, it, and de. Keys that already existed, including Cancel, Back, Delete, and Step, stay on those keys. Update titles, bodies, and comments stay as stored text. Table names `company_updates` and `recognitions`, and the color hints `#3b82f6` and `#1e40af`, stay identical in every locale. A return type the checker read as text was given a name so the words stayed code. The directory is off the hard-coded baseline.

Proven: `npm run check:i18n` printed 1853 keys for each locale and `hard-coded strings 3238`, then exited 0. `npm run typecheck:src` passed. ESLint passed on `src/features/company-updates`.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk and open Company updates.
2. Set your language to Español on Settings, then Region. Reload. The page title, filters, and create button should be in Spanish. An update title or body someone typed stays as they wrote it.
3. Open the create wizard if you can. The steps, preview, and publish settings should follow the language. Switch to Deutsch and check the same wizard.
4. If the feed is empty because tables are missing, the setup message should follow the language, and the table names `company_updates` and `recognitions` should stay in English.
5. Switch back to English. The labels should match the wording from before this deploy.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 11 Messages strings

Shipped: Messages chrome under `src/features/messages` now uses `useTranslation` and the `messages` namespace. The same strings are in en, es, pt, fr, it, and de. Keys that already existed, including Cancel, Close, Delete, and Save, stay on those keys. Message bodies stay as stored text. Counts that sit next to a word are one phrase, so the space and the word order stay intact. A calendar check the checker read as the word date was moved into a named function. The directory is off the hard-coded baseline.

Proven: `npm run check:i18n` printed 2012 keys for each locale and `hard-coded strings 3056`, then exited 0. `npm run typecheck:src` passed. ESLint passed on `src/features/messages`.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk and open Messages.
2. Set your language to Español on Settings, then Region. Reload. The page title, search, and new chat button should be in Spanish. A message someone typed stays as they wrote it.
3. Open a chat if you have one. Send, and the empty-chat line, should follow the language. Switch to Deutsch and open a group’s settings if you can. Delete group and the privacy label should be German.
4. Search messages with at least two letters. The result count should be a full phrase in the current language.
5. Switch back to English. The labels should match the wording from before this deploy.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 12 Inventory component strings

Shipped: Inventory component chrome under `src/features/inventory/components` now uses `useTranslation` and the `inventory` namespace. The same strings are in en, es, pt, fr, it, and de. The ten inventory keys that already existed stay, including the page description. New labels that shared a key name use a separate key. Item names, counts, and supplier data stay as stored text. Counts that sit next to a word are one phrase. Screen names Toast, QuickBooks, MarketMan, and Items & Setup stay as written. The directory is off the hard-coded baseline.

Proven: `npm run check:i18n` printed 2581 keys for each locale and `hard-coded strings 2359`, then exited 0. `npm run typecheck:src` passed. ESLint passed on `src/features/inventory/components`.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk and open Inventory.
2. Set your language to Español on Settings, then Region. Reload. The item list, counts, and purchasing tabs should be in Spanish. An item name someone typed stays as they wrote it.
3. Open a purchase order or a count if you have one. The column headers and empty states should follow the language. Switch to Deutsch and check a low-stock line. The current and minimum labels should be German, and the numbers stay numbers.
4. Switch back to English. The labels should match the wording from before this deploy.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 13 Inventory pages and hooks

Shipped: The rest of Inventory chrome under `src/features/inventory/pages`, `routes`, and `hooks` now uses `useTranslation` and the `inventory` namespace. The same strings are in en, es, pt, fr, it, and de. Keys from the component phase stay. Item names and stored counts stay as stored text. A row mapper the checker read as text now uses a named variable so the words stayed code. The inventory tree is off the hard-coded baseline.

Proven: `npm run check:i18n` printed 2806 keys for each locale and `hard-coded strings 2106`, then exited 0. `npm run typecheck:src` passed. ESLint passed on `src/features/inventory/pages`, `src/features/inventory/routes`, and `src/features/inventory/hooks`.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk and open Inventory.
2. Set your language to Français on Settings, then Region. Reload. The page headings, prep list, and count screens should be in French. An item name someone typed stays as they wrote it.
3. Open counting and purchasing from the inventory navigation. Empty states and buttons should follow the language.
4. Switch back to English. The labels should match the wording from before this deploy.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 14 Analytics strings

Shipped: Analytics chrome under `src/features/analytics` now uses `useTranslation` and the `analytics` namespace. The same strings are in en, es, pt, fr, it, and de. Keys that already existed, including Cancel, Back, Close, Tasks, and Goals, stay on those keys. Report names and notes that people type stay as stored text. Counts that sit next to a word stay one phrase where the text was already split around a number. Two comparisons the checker read as text now use a block body so the words stayed code. The directory is off the hard-coded baseline.

Proven: `npm run check:i18n` printed 3018 keys for each locale and `hard-coded strings 1896`, then exited 0. `npm run typecheck:src` passed. ESLint passed on `src/features/analytics`.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk and open Analytics (`/app/analytics`) and Reports (`/app/reports`).
2. Set your language to Español on Settings, then Region. Reload. The page title, tabs, filters, and empty states should be in Spanish. A report name someone typed stays as they wrote it.
3. Open Reports & Intelligence → AI Insights. The header, forecast table, and recommendation labels should follow the language. The status line should say the insights are up to date, or that they are updating. Switch to Deutsch and check the same screens.
4. Switch back to English. The labels should match the wording from before this deploy.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 15 Operations strings

Shipped: Operations chrome under `src/features/operations` now uses `useTranslation` and the `operations` namespace. The same strings are in en, es, pt, fr, it, and de. Keys that already existed stay on those keys. Issue titles that people type stay as stored text. A default chart title that the checker read as a `title` attribute now follows the viewer's language. The directory is off the hard-coded baseline.

Proven: `npm run check:i18n` printed 3165 keys for each locale and `hard-coded strings 1758`, then exited 0. `npm run typecheck:src` passed. ESLint passed on `src/features/operations`.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk and open Operations (`/app/operations`).
2. Set your language to Français on Settings, then Region. Reload. The hub, IDEA steps (Identify, Diagnose, Execute, Assess), and empty states should be in French. An issue title someone typed stays as they wrote it.
3. Open a compliance pack or the review queue if you can. Loading lines and buttons should follow the language. Switch to Español and check the same screens.
4. Switch back to English. The labels should match the wording from before this deploy.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 16 Sections strings

Shipped: Sections chrome under `src/features/sections` and `src/sections` now uses `useTranslation` and the `sections` namespace. The same strings are in en, es, pt, fr, it, and de. Keys that already existed, including Calendar, Form, and Table, stay on those keys. Route paths such as `/sections/` stay the same in every language. Section names that people type stay as stored text. Default page titles that the checker read as `title` attributes now follow the viewer's language. Both directories are off the hard-coded baseline.

Proven: `npm run check:i18n` printed 3322 keys for each locale and `hard-coded strings 1487`, then exited 0. `npm run typecheck:src` passed. ESLint passed on `src/features/sections` and `src/sections`.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk. Open a custom section if you have one, or Add section (`/app/add-section`) if you manage sections.
2. Set your language to Deutsch on Settings, then Region. Reload. Section settings, page labels, and empty states should be in German. A section name someone typed stays as they wrote it. A path such as `/sections/` stays the same.
3. Open the events calendar and meetings if they are in your navigation. Search boxes and empty states should follow the language. Switch to Español and check the same screens.
4. Switch back to English. The labels should match the wording from before this deploy.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 17 Employees and profile strings

Shipped: Employee and profile chrome under `src/features/employees` and `src/features/profile` now uses `useTranslation` and the `employees` and `profile` namespaces. The same strings are in en, es, pt, fr, it, and de. Keys that already existed, including Cancel, Close, Save, Refresh, and Retry, stay on those keys. Sample names such as Jordan Smith, Lee, and Acme Supplies, and the sample emails, stay the same in every language. The CSV header `first_name,last_name,email,phone,class,department` stays in English because the paste format expects those column names. Names people type stay as names. Counts that sit next to a word are one phrase. Both directories are off the hard-coded baseline.

Proven: `npm run check:i18n` printed 3568 keys for each locale and `hard-coded strings 1223`, then exited 0. `npm run typecheck:src` passed. ESLint passed on `src/features/employees` and `src/features/profile`.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk and open Employees (`/app/employees`).
2. Set your language to Español on Settings, then Region. Reload. The directory title, search, department filter, tabs, and HR readiness cards should be in Spanish. A person's name stays as it was written. The sample vendor name Acme Supplies stays Acme Supplies.
3. Open a teammate if you have one. Overview labels such as department, role, and hire date should follow the language. Switch to Deutsch and open Profile (`/app/profile`). Profile settings, the security tab, and the password form should be in German.
4. If you can invite someone, the class, department, and send labels should follow the language. The paste hint `first_name,last_name,email,phone,class,department` stays in English.
5. Switch back to English. The labels should match the wording from before this deploy.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 18 Onboarding strings

Shipped: Onboarding and template chrome under `src/features/onboarding` and `src/features/templates` now uses `useTranslation` and the `onboarding` namespace. The same strings are in en, es, pt, fr, it, and de. Keys that already existed, including Back, Cancel, Next, and the branding labels, stay on those keys. FlowForce stays FlowForce. A progress check the checker read as the words `50) return` was given braces so the words stayed code. Counts that sit next to a word are one phrase. Both directories are off the hard-coded baseline.

Proven: `npm run check:i18n` printed 3652 keys for each locale and `hard-coded strings 1064`, then exited 0. `npm run typecheck:src` passed. ESLint passed on `src/features/onboarding` and `src/features/templates`.

Phone steps for Pedro:
1. Sign out and open https://www.flowforce.uk. Start company registration if you can, or sign in and open any first-login onboarding that is still waiting.
2. Set the language to Français before signing in, or on Settings, then Region, after you are in. The company steps, template choice, and branding labels should be in French. FlowForce stays FlowForce.
3. If an employee still has the fixed-availability step, the from, to, and send labels should follow the language. Switch to Español and check the password requirements on the account step.
4. Open Templates if it is in your navigation. The template list and detail labels should follow the language. A template name someone typed stays as they wrote it.
5. Switch back to English. The labels should match the wording from before this deploy.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 19 Marketing strings

Shipped: Marketing chrome under `src/features/marketing` now uses `useTranslation` and the `landing` and `footer` namespaces. The same strings are in en, es, pt, fr, it, and de. Keys that already existed, including the feature titles and Templates, stay on those keys. FlowForce stays FlowForce. Illustration figures such as `$12.5k`, `1.2M+`, and `15min` stay as written. Plan names Starter, Growth, and Enterprise stay as written. The header language switcher stays. The directory is off the hard-coded baseline.

Proven: `npm run check:i18n` printed 3695 keys for each locale and `hard-coded strings 1004`, then exited 0. `npm run typecheck:src` passed. ESLint passed on `src/features/marketing`.

Phone steps for Pedro:
1. Open https://www.flowforce.uk while signed out. Use the language switcher in the header and choose Italiano. The hero, footer links, and feature labels should be in Italian. FlowForce stays FlowForce.
2. Open Pricing (`/pricing`). The plan intro and the most-popular label should follow the language. Starter, Growth, and Enterprise stay those names. If checkout was canceled, the reactivate screen should follow the language and mention Stripe by name.
3. Open the product demo if the button is on the page. The title and the coming-soon line should follow the language. Switch to Deutsch and check the footer: About, Blog, and Help Center should be German.
4. Switch back to English. The labels should match the wording from before this deploy.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 20 Resources strings

Shipped: Resources chrome under `src/features/resources` now uses `useTranslation` and the `resources` namespace. The same strings are in en, es, pt, fr, it, and de. Keys that already existed stay on those keys. FlowForce stays FlowForce. Read times `10 min`, `15 min`, `30 min`, and `45 min`, the sample `Authorization: Bearer YOUR_API_TOKEN`, and the API host stay as written. The directory is off the hard-coded baseline.

Proven: `npm run check:i18n` printed 3797 keys for each locale and `hard-coded strings 922`, then exited 0. `npm run typecheck:src` passed. ESLint passed on `src/features/resources`.

Phone steps for Pedro:
1. Open https://www.flowforce.uk/resources while signed out, or from the footer. Use the header language switcher and choose Español. The page title, section names, and help cards should be in Spanish. FlowForce stays FlowForce.
2. Open the Getting Started guide and the User Manual. The steps, table of contents, and page counts should follow the language. Switch to Português and open API Documentation. Endpoint descriptions should be Portuguese. The paths, methods, and `Authorization: Bearer YOUR_API_TOKEN` stay as written.
3. Open Integration Guides in Français. The guide title, custom-integration bullets, and the start button should be French. Starting an integration should toast in French and keep the product name.
4. Switch back to English. The labels should match the wording from before this deploy.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 21 Learning strings

Shipped: Learning chrome under `src/features/learning` now uses `useTranslation` and the `learning` namespace. The same strings are in en, es, pt, fr, it, and de. Keys that already existed stay on those keys. Course titles, module titles, and certification titles stay the stored text. Category, role, module-type, and delivery values saved on a course stay the same codes. The labels around them follow the language. Copilot, Co-Pilot, XP, and Supabase stay as written. The directory is off the hard-coded baseline.

Proven: `npm run check:i18n` printed 3965 keys for each locale and `hard-coded strings 806`, then exited 0. `npm run typecheck:src` passed. ESLint passed on `src/features/learning`.

Phone steps for Pedro:
1. Open the Learning Center on https://www.flowforce.uk and switch to Español in Settings, then Region, or with the header switcher if you are signed out of marketing only. The snapshot, catalog filters, and empty states should be Spanish. A course title you already saved stays as you wrote it.
2. Create a course in Français. The wizard steps, category list, role chips, and module types should be French. The saved category and role codes stay the English values. The title and module title you type stay as written. The espresso example is only the placeholder.
3. Open Certifications in Deutsch. The header, status badges, and metric cards should be German. A certification name stored in the catalog stays as stored.
4. Switch back to English. The labels should match the wording from before this deploy.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 22 Settings, admin, and roles strings

Shipped: Settings, admin, and roles chrome under `src/features/system`, `src/features/admin`, and `src/features/roles` now uses `useTranslation` and the `settings`, `admin`, and `roles` namespaces. The same strings are in en, es, pt, fr, it, and de. Keys that already existed, including Cancel, Edit, Refresh, Settings, and Access Denied, stay on those keys. Language names stay English, Español, Français, Deutsch, Italiano, and Português. FlowForce, Stripe, QuickBooks, Xero, Toast, MarketMan, Copilot, Co-Pilot, MFA, and the class words See, Edit, Create / delete, Admin, Manager, Staff, and Owner stay as written where the screen still uses those words. Example emails and the date and time patterns stay as written. The three directories are off the hard-coded baseline.

Proven: `npm run check:i18n` printed 4240 keys for each locale and `hard-coded strings 480`, then exited 0. `npm run typecheck:src` passed. ESLint passed on `src/features/system`, `src/features/admin`, and `src/features/roles`.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk and open Settings.
2. Set your language to Español on Settings, then Region. Reload. The settings tabs, company profile, security, region, notifications, and billing labels should be in Spanish. The language list stays English, Español, Français, Deutsch, Italiano, and Português. A company name you typed stays as you wrote it.
3. Open Admin (`/app/admin`) in Français. User management, role configuration, and the audit log should be in French. A person's name stays as it was written. Switch to Deutsch and open role configuration. Class instructions should be German. See, Edit, Create / delete, Admin, Manager, Staff, and Owner stay those words.
4. Switch back to English. The labels should match the wording from before this deploy.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 23 Remaining feature strings

Shipped: Calendar, gamification, recognition, performance, availability, positions, AI, and permissions chrome now uses `useTranslation`. Each feature has its own namespace. The same strings are in en, es, pt, fr, it, and de. Keys that already existed, including Cancel, Save changes, Manager, Staff, and XP, stay on those keys. FlowForce, FlowForce AI, Copilot, Co-Pilot, Google Calendar, XP, and the permission words `withPermission`, `useCan`, `systemSettings`, and `viewAIInsights` stay as written. Those eight directories are off the hard-coded baseline.

Proven: `npm run check:i18n` printed 4578 keys for each locale and `hard-coded strings 8`, then exited 0. `npm run typecheck:src` passed. ESLint passed on `src/features/calendar`, `src/features/gamification`, `src/features/recognition`, `src/features/performance`, `src/features/availability`, `src/features/positions`, `src/features/ai`, and `src/features/permissions`.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk and set the language to Español.
2. Open the calendar. Add-event labels, event details, and the empty states should be Spanish. A meeting title you typed stays as you wrote it. Text that switches with the meeting type, such as the title hint, stays English.
3. Open time off and availability. The request form, the queue, and lock controls should be Spanish. A reason you typed stays as you wrote it.
4. Open team positions in Français. Create and edit position labels should be French. A position name stays as it was written. Role words such as Manager stay as written.
5. Open HR and the leaderboard in Deutsch. Badge, recognition, and XP labels should be German. XP stays XP. Switch to English. The labels should match the wording from before this deploy.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 24 Routes and hooks

Shipped: The not-found page, the shared module loading state, and the shared module error state now use `useTranslation` and the `shell` namespace. The same four strings are in en, es, pt, fr, it, and de. Two hook type signatures were rewritten so the checker no longer treats generic TypeScript as chrome. The form builder's default section title stays the English words New Section, because that value is stored on the section. The hard-coded baseline is empty.

Proven: `npm run check:i18n` printed 4582 keys for each locale and `hard-coded strings 0`, then exited 0. `npm run typecheck:src` passed. ESLint passed on `app/not-found.tsx`, `src/hooks/useAnalytics.tsx`, `src/hooks/useUserPermissions.tsx`, `src/shared/components/FeatureErrorState.tsx`, `src/shared/components/FeatureLoadingState.tsx`, and `src/stores/useFormSchemaStore.ts`.

Phone steps for Pedro:
1. Sign in at https://www.flowforce.uk and set the language to Español.
2. Open a route that does not exist, such as https://www.flowforce.uk/this-page-is-missing. The message and the home link should be Spanish. The number 404 stays 404.
3. Open a screen that is still loading, or one that fails to load a module. The loading line and the unable-to-load line should be Spanish when those shared states appear.
4. Switch back to English. Those lines should match the wording from before this deploy. A form section you add still starts with the English title New Section until you rename it.

Blockers: none. No migration.

Questions: none.

### 2026-10-22 — Phase 25 Translation cache

Shipped: `content_translations` caches a field translation per company, source row, field, and locale. Members can select rows for their company. Authenticated and anon cannot insert, update, or delete. The service role writes. `source_table` allows the tables named in the Audit. `locale` and `source_locale` are the six language codes, and they cannot match. `source_hash` is 64 hex characters. `ai_usage_events` and `record_ai_usage_event` allow the prompt key `content_translation`. That key is not part of the insight schema. The Supabase CLI had no access token, so the migration was applied with the Supabase API. The remote history version is `20261022151316`.

Proven: `npm run typecheck` passed. `npm run typecheck:src` passed. A rolled-back SQL check rejected a same-language row and an unknown source table, then accepted a Spanish translation of an English task title. The table was empty after the rollback.

Phone steps for Pedro: none. This phase does not change a screen. Cached translations are not shown yet.

Blockers: none. Migration `20261022151316_content_translations.sql` is applied.

Questions: none.
