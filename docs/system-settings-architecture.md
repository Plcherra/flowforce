# System Settings Architecture

The Flowforce system settings area now lives under `src/modules/system`. This module follows a "state in hooks, UI in panels" split so we can test behaviour in isolation and lazy-load the UI.

## File Map

```
src/modules/system/
├─ hooks/
│  ├─ useSystemSettings.ts           # root hook, fetches Supabase data & permissions
│  ├─ SystemSettingsContext.tsx      # context so child panels reuse the shared state
│  ├─ systemSettingsDefaults.ts      # default JSON payloads + seeding helper
│  ├─ normalizers/                   # utilities that coerce Supabase JSON into typed models
│  ├─ useGeneralSettings.ts          # panel-specific state & save helpers
│  ├─ useSecuritySettings.ts
│  ├─ useLocalizationSettings.ts
│  ├─ useSystemNotifications.ts
│  ├─ useAICopilotSettings.ts
│  ├─ useIntegrationSettings.ts
│  └─ useAdminSettings.ts
├─ components/
│  ├─ SystemSettingsLayout.tsx       # tab shell, profiler, error/empty handling
│  ├─ ErrorState.tsx / EmptyState.tsx
│  ├─ *SettingsPanel.tsx             # one panel per domain (General, Security, …)
└─ pages/
   └─ SettingsPage.tsx               # registers panels & lazy-loads them into the layout
```

## Hook Responsibilities

- `useSystemSettings` owns lifecycle: permission lookup, default seeding, CRUD via Supabase, refresh, and exposes a single `updateSettings` method that panels call with narrow payloads.
- Specialized hooks (`useSecuritySettings`, `useLocalizationSettings`, etc.) project the shared state into panel-sized slices, clone state to avoid render-time mutation, expose `dirty/save/reset`, and encapsulate any downstream fetches (e.g., `useAdminSettings.refreshSnapshot`).
- `systemSettingsDefaults.ts` exports `seedSystemSettings` so onboarding flows can create a tenant baseline without duplicating defaults.

## UI Contract

- `SystemSettingsLayout` wraps tabs with a context provider, handles permission badges, shows loading/error/empty cases, and traces render duration with `Profiler`.
- `SettingsPage.tsx` is the single registry. **All new settings panels must register here and read the shared `SystemSettingsContext` via the relevant hook.** Panels are lazy loaded and wrapped in an error boundary so a failure in one tab does not take down the layout.

## Testing & Telemetry

- Unit coverage lives beside hooks/components (see `src/modules/system/hooks/__tests__` and `components/__tests__`).
- A Playwright flow (`tests/playwright/settings.spec.ts`) exercises the end-to-end save/refresh pipeline and validates the missing-company error path.
- Tab switches emit profiler metrics (`system-settings:<tab>:mount|update` marks) to aid future performance dashboards.

## Onboarding Notes

1. Consume state via the context-aware hooks (`useSystemSettingsContext` ➜ specific hook) to avoid duplicate fetches.
2. Keep panels under ~250 lines, prefer extracting complex logic back into hooks/utilities.
3. When adding persistence, reuse `updateSettings` so multi-tenant scoping (`company_id`) and Supabase RLS remain enforced.

## Future Enhancements

- The new `seedSystemSettings` helper can power onboarding wizards—consider calling it from tenant creation so rows exist before the first admin visits settings.
- We still duplicate Supabase fetch/update patterns across hooks; explore a generic `useScopedEntity()` wrapper that injects `company_id` filters and error handling.
