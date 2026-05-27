Task ID: T22

Section: Admin & Setup

Component: Admin & Setup – System Settings

Category: [BACKEND]

Priority: Critical

Est. Time: 16h

Description

Expand System Settings into fully working Admin Configuration Hub: **General:** Enable saving of company name, contact info, and logo; connect to Supabase and sync across modules. **Security:** Make Two-Factor Authentication functional; add configurable password strength rules and session timeout controls. **Localization:** Enable live saving of Timezone, Language, and Currency preferences; auto-update across scheduling and finance areas. **Notifications:** Redesign into unified configuration system; allow company-wide defaults but also per-module overrides (Scheduling, Tasks, Payments, Inventory, etc.); consider modular settings in each section for better UX. **Integrations:** Build API integration panel allowing owners to connect third-party systems like Toast (for payroll, scheduling, and sales data), MarketMan (inventory sync), and frontline workforce platform (scheduling and HR data); include a field for user-provided API keys or OAuth authentication; auto-detect compatible data models and sync fields dynamically. **Appearance:** Make theme editor functional; allow customization of colors, logo placement, sidebar branding, and dashboard layout; store configurations per business in Supabase; add “Preview Mode” before saving. **Admin Configurations (New Section):** Add an Admin Config area (beside System Settings) for: - Managing business structure (locations, departments, working hours) - Default role templates and permissions - API usage logs and system monitoring - AI Co-Pilot configuration for automation scopes.
Context: System Settings tabs currently visual-only; features not functional

Dependencies

T21

Expected Outcome

Once complete, Admin & Setup – System Settings will:

- Expand System Settings into fully working Admin Configuration Hub: **General:** Enable saving of company name, contact info, and logo
- Connect to Supabase and sync across modules
- **Security:** Make Two-Factor Authentication functional
- Add configurable password strength rules and session timeout controls
- **Localization:** Enable live saving of Timezone, Language, and Currency preferences
- Auto-update across scheduling and finance areas
- **Notifications:** Redesign into unified configuration system
- Allow company-wide defaults but also per-module overrides (Scheduling, Tasks, Payments, Inventory, etc
- )
- Consider modular settings in each section for better UX
- **Integrations:** Build API integration panel allowing owners to connect third-party systems like Toast (for payroll, scheduling, and sales data), MarketMan (inventory sync), and frontline workforce platform (scheduling and HR data)
- Include a field for user-provided API keys or OAuth authentication
- Auto-detect compatible data models and sync fields dynamically
- **Appearance:** Make theme editor functional
- Allow customization of colors, logo placement, sidebar branding, and dashboard layout
- Store configurations per business in Supabase
- Add “Preview Mode” before saving
- **Admin Configurations (New Section):** Add an Admin Config area (beside System Settings) for: - Managing business structure (locations, departments, working hours) - Default role templates and permissions - API usage logs and system monitoring - AI Co-Pilot configuration for automation scopes

Technical Scope

- **Affected Files:** Codex will identify automatically from repo.
- **APIs / DB:** connect to Supabase and sync across modules; **Integrations:** Build API integration panel allowing owners to connect third-party systems like Toast (for payroll, scheduling, and sales data), MarketMan (inventory sync), and frontline workforce platform (scheduling and HR data); include a field for user-provided API keys or OAuth authentication; store configurations per business in Supabase; **Admin Configurations (New Section):** Add an Admin Config area (beside System Settings) for: - Managing business structure (locations, departments, working hours) - Default role templates and permissions - API usage logs and system monitoring - AI Co-Pilot configuration for automation scopes
- **UI Components:** **Notifications:** Redesign into unified configuration system; consider modular settings in each section for better UX; **Integrations:** Build API integration panel allowing owners to connect third-party systems like Toast (for payroll, scheduling, and sales data), MarketMan (inventory sync), and frontline workforce platform (scheduling and HR data); allow customization of colors, logo placement, sidebar branding, and dashboard layout
- **Co-Pilot Links:** **Admin Configurations (New Section):** Add an Admin Config area (beside System Settings) for: - Managing business structure (locations, departments, working hours) - Default role templates and permissions - API usage logs and system monitoring - AI Co-Pilot configuration for automation scopes
