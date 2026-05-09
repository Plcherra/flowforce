# Admin / System Module Map

- **Settings hub**: `src/modules/system/pages/SettingsPage.tsx` renders lazy tabs for General, Security, Localization, Notifications, AI Copilot, Integrations, and Admin.
- **Supporting hooks**: `src/modules/system/hooks/**` provide Supabase read/write helpers plus context.
- **Components**: Presentation lives under `src/modules/system/components/` (empty states, layout, tab content).
- **Owner squad**: Admin, Permissions & Platform.
- **Notes**: Changes here ripple into permissions (rules repository), so refactors must keep APIs stable.
