# Roadmap

"Next phase" follows `.cursor/rules/Feature-Workflow.mdc`.
Read this index and open only the feature file marked active.
`PROJECT-STATUS.md` is the current status of the app.

The 6 AM daily run opens the one row marked active. That row is Time Off: [docs/features/time-off.md](features/time-off.md).

When the active file has no unchecked phase left, the same run updates this table before it opens another feature. The finished row becomes done. The next row in the order below becomes active. It then opens that file. The handoff is Theme, then Languages, then Time Off. Do not skip a row.

## Order

| # | Feature | Status | File |
| --- | --- | --- | --- |
| 1 | Theme | done | [docs/features/theme.md](features/theme.md) |
| 2 | Languages | done | [docs/features/languages.md](features/languages.md) |
| 3 | Time Off, then remaining Tasks | active | [docs/features/time-off.md](features/time-off.md), then [docs/features/tasks.md](features/tasks.md) |
| 4 | System and Admin | queued | [docs/features/system-admin.md](features/system-admin.md) |
| 5 | Operations | queued | [docs/features/forms-communication.md](features/forms-communication.md) |
| 6 | Team | queued | Feature file not written yet |
| 7 | Reports | queued | Feature file not written yet |
| 8 | Inventory | queued | [docs/features/inventory.md](features/inventory.md) |
| 9 | Company onboarding | queued | Feature file not written yet |

Only one row is active. Do not start a later row while an earlier one is still open.

Shipped schedule work stays in [docs/features/schedule.md](features/schedule.md). Phases 1–25 are checked: time off policies `820802f`, repeating availability `5dca98d`, and the leadership grid `a9aa674`. Do not reopen those phases.

### 1. Theme

Done. Every phase in `docs/features/theme.md` is checked.

### 2. Languages

Done. Every phase in `docs/features/languages.md` is checked. Time Off is the active row.

### 3. Time Off, then remaining Tasks

Active. The 6 AM run starts here.

Time Off has 9 phases in [docs/features/time-off.md](features/time-off.md). When those 9 are checked, open [docs/features/tasks.md](features/tasks.md) for the remaining phases. Phases 9–12 stay skipped until their open questions are answered. Do not redo the checked Tasks phases. If 9–12 are still blocked, log the skip and move the pointer to System and Admin.

### 4. System and Admin

The permission-grant model. Chats, updates, and the features below need it, so this row comes before them. Candidate phase 2 still waits on the owner. The permission-grant phases wait until this row is active. [docs/features/system-admin.md](features/system-admin.md)

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
