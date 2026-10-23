# Roadmap

"Next phase" follows `.cursor/rules/Feature-Workflow.mdc`.
Read this index and open only the feature file marked active.
`PROJECT-STATUS.md` is the current status of the app.

The 6 AM daily run opens the one row marked active. That row is Tasks phases 25–30: [docs/features/tasks.md](features/tasks.md).

When the active file has no unchecked phase left, the same run updates this table before it opens another feature. The finished row becomes done. The next row in the order below becomes active. It then opens that file. After Tasks, the handoff follows the order in the table. Do not skip a row.

## Order

| # | Feature | Status | File |
| --- | --- | --- | --- |
| 1 | Production deploy | done | Commits `8687e0dc` and `791acae7` on `main`. Vercel production for `791acae7` completed. |
| 2 | Theme rework | done | [docs/features/theme.md](features/theme.md) phases 23–24. Commits `f92f6f51` and `07c0c442`. |
| 3 | System and Admin phase 8 | done | [docs/features/system-admin.md](features/system-admin.md) |
| 4 | Tasks 25–30 | active | [docs/features/tasks.md](features/tasks.md) |
| 5 | Operations | queued | [docs/features/forms-communication.md](features/forms-communication.md) |
| 6 | Team | queued | Feature file not written yet |
| 7 | Reports | queued | Feature file not written yet. Pedro's proposed name for this section is Insights. |
| 8 | Inventory | queued | [docs/features/inventory.md](features/inventory.md) |
| 9 | Company onboarding | queued | Feature file not written yet |

Only one row is active. Do not start a later row while an earlier one is still open.

Shipped schedule work stays in [docs/features/schedule.md](features/schedule.md). Phases 1–25 are checked: time off policies `820802f`, repeating availability `5dca98d`, and the leadership grid `a9aa674`. Do not reopen those phases.

### 1. Production deploy

Done. The production build failed from `d51a7be6` because marketing illustrations called `useTranslation` inside a `lazy()` loader, so `/features` could not prerender. Release Gates also failed its plan count in `phase7_ai_observability.test.sql` (18 planned, 24 ran) once Docker could start, and the last run before the fix died pulling Supabase images. `8687e0dc` moves the hook into the illustration component. `791acae7` sets the plan to 24.

### 2. Theme rework

Done. Phases 1–22 stay checked. Phases 23–24 separate the three themes: FlowForce is the white one, Light is a light blue tint, and Dark is dark navy.

### 3. System and Admin phase 8

Done. Phase 2 is answered: delete the Admin page, keep settings on the profile card, move Admin tools into the team directory, drop the duplicate reports, call the Reports section Insights, and remove the ADMIN bottom-nav group. Phases 3–8 stay checked.

### 4. Tasks 25–30

Active. Phases 9–12 stay checked as skips. Pedro's answers are phases 25–30. Languages and Time Off stay done.

### 5. Operations

Forms, communication (chats), and company updates. The file is [docs/features/forms-communication.md](features/forms-communication.md). Do not open it before System and Admin.

### 6. Team

Recognition, XP, performance, certifications, and user onboarding. Every user goes through user onboarding on their first login. The feature file is not written yet. Do not start this row early, and do not invent the file from a Theme, Languages, or Time Off run.

### 7. Reports

Reports sit on top of the features above. The feature file is not written yet. [docs/features/ai-insights.md](features/ai-insights.md) stays closed until this row is active.

### 8. Inventory

[docs/features/inventory.md](features/inventory.md). Do not open it before Reports. Company onboarding comes after this row.

### 9. Company onboarding

Review how a company creates its account and gets set up. This is the company account, not the first-login path each user takes in the Team row. The feature file is not written yet. Do not open it before Inventory.

## AI providers

Checked 2026-10-22. Product AI runs on xAI Grok. The default model is `grok-4.3` (fast, low-cost; override with `XAI_MODEL`). Translations stay on OpenAI `gpt-4o-mini` with `OPENAI_API_KEY`, including the planned user-content translation in `docs/features/languages.md`. `ai-insights` and `ai-analyze-updates` call Grok and record provider `xai`, the model, and the existing monthly cap in `ai_usage_events`. Chat requests omit `search_parameters`; xAI returns HTTP 410 when that live-search field is present. Co-Pilot dispatch, the scheduling assistant edge function, and employee evaluation do not call a model.

Phone check after the production deploy finishes: sign in at https://www.flowforce.uk, open Reports & Intelligence → AI Insights, and confirm the insight text loads. The chat sits on the right on a desktop and as a bottom sheet on a phone, above the icon nav, with nothing cut off by the screen edge. Ask "What's my busiest week next month?" and confirm a reply. The floating Co-Pilot still answers from the screen in front of you.
