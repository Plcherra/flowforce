# Roadmap

"Next phase" follows `.cursor/rules/Feature-Workflow.mdc`.
Read this index and open only the feature file marked active.
`PROJECT-STATUS.md` is the current status of the app.

The next run starts Scheduling + Time Off and opens [docs/features/time-off.md](features/time-off.md).

## This week

| Feature | Status | File |
| --- | --- | --- |
| Scheduling + Time Off | active | [docs/features/time-off.md](features/time-off.md) |

Shipped schedule work stays in [docs/features/schedule.md](features/schedule.md). Phases 1–25 are checked: time off policies `820802f`, repeating availability `5dca98d`, and the leadership grid `a9aa674`. Do not reopen those phases.

Tasks phases 8, 19, and 22–24 are checked. Phases 9–12 stay skipped. Tasks stays closed. [docs/features/tasks.md](features/tasks.md)

## Next week

| Feature | Status | File |
| --- | --- | --- |
| System and Admin rework | next | [docs/features/system-admin.md](features/system-admin.md) |

That file lists systems that look wrong or unnecessary. It does not change product code. Phase 2 waits on the owner.

## After that

| Feature | Status | File |
| --- | --- | --- |
| Forms and Communication | queued | [docs/features/forms-communication.md](features/forms-communication.md) |
| Inventory | queued | [docs/features/inventory.md](features/inventory.md) |
| AI Insights | queued | [docs/features/ai-insights.md](features/ai-insights.md) |

Open these in that order. Do not start one while an earlier row is still open.

## Later

Leave these closed. Theme and Languages stay written, and they are not the feature the next run opens.

| Feature | Status | File |
| --- | --- | --- |
| Theme | later | [docs/features/theme.md](features/theme.md) |
| Languages | later, after Theme | [docs/features/languages.md](features/languages.md) |

## AI providers

Checked 2026-10-22. Product AI runs on xAI Grok. The default model is `grok-4.3` (fast, low-cost; override with `XAI_MODEL`). Translations stay on OpenAI `gpt-4o-mini` with `OPENAI_API_KEY`, including the planned user-content translation in `docs/features/languages.md`. `ai-insights` and `ai-analyze-updates` call Grok and record provider `xai`, the model, and the existing monthly cap in `ai_usage_events`. Co-Pilot dispatch, the scheduling assistant edge function, and employee evaluation do not call a model.

Phone check after the production deploy finishes: sign in at https://www.flowforce.uk, open Reports & Intelligence → AI Insights, and confirm the insight text loads. On that page, open the chat, ask a short question, and confirm a reply. The floating Co-Pilot still answers from the screen in front of you.
