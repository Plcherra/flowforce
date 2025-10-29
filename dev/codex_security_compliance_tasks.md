# Security & Compliance Audit – Supabase Auth & Data Flows

## Critical Vulnerabilities
- **Unrestricted AI insights edge function leaks tenant data**  
  - Location: `supabase/functions/ai-insights/index.ts:10`  
  - Risk: Function allows `*` CORS, never validates an end-user session, and uses the service-role key to pull raw rows from `schedules`, `tasks`, `expenses`, `forms`, and `form_submissions`, then returns them verbatim. Any caller with the function URL can exfiltrate every tenant’s data while bypassing RLS.  
  - Actions: Require a Supabase JWT (`Authorization` header) and verify it with `auth.getUser`; scope queries by the caller’s `company_id`; stop returning `analysisData`; restrict CORS to trusted origins; prefer running queries through a user-scoped client (`createClient(url, serviceKey, { global: { headers: { Authorization }}})` after validation) so RLS continues to enforce tenant boundaries.

- **AI scheduling assistant executes privileged queries on attacker input**  
  - Location: `supabase/functions/ai-scheduling-assistant/index.ts:5` and subsequent handlers (e.g. `generateShiftRecommendations`, `analyzeCoverage`, `checkCompliance`).  
  - Risk: Mirrors the issue above: `*` CORS, no session validation, and uses the service-role key. Attackers can post arbitrary `scheduleId` or `companyId` values to dump staff availability, performance records, assignments, and compliance rules for any tenant.  
  - Actions: Enforce JWT validation; refactor to build a scoped client that reuses the caller’s auth context; explicitly compare inputs against the requester’s company membership via RLS-aware queries; log denial events for monitoring; remove public CORS or front the function behind a signed-in proxy.

## High-Priority Compliance Gaps
- **Supabase publishable key hard-coded in bundle**  
  - Location: `src/integrations/supabase/client.ts:5`  
  - Risk: Ties every build to a single Supabase project, complicates key rotation and violates secret management policy. While an anon key can be public, embedding it commits production credentials to source control and makes environment separation difficult.  
  - Actions: Load `SUPABASE_URL`/`SUPABASE_ANON_KEY` from environment (e.g. `import.meta.env.VITE_*`); adopt per-environment config with secret rotation procedures.

- **Session tokens persist in `localStorage` without hardening**  
  - Location: `src/integrations/supabase/client.ts:11` (default client options) and downstream usage (`src/hooks/useAuth.tsx:15`).  
  - Risk: Supabase JS defaults store access/refresh tokens in `localStorage`, making them readable by any XSS payload. No CSP, HTTP-only cookie storage, or storage encryption is configured.  
  - Actions: Switch to `@supabase/auth-helpers` with Secure/HttpOnly cookies or supply a hardened storage adapter (e.g. `IndexedDB` wrapper with crypto); add CSP/nonces; audit the app for XSS entry points; ensure logout clears storage across tabs via `broadcast-channel`.

- **Token refresh lifecycle lacks resilience & monitoring**  
  - Location: `src/hooks/useAuth.tsx:28` (only listens for auth state changes).  
  - Risk: The client relies solely on Supabase’s background refresh; failures (network, revoked refresh tokens) present as silent 401s across the app. There is no proactive refresh, user notification, or telemetry.  
  - Actions: Handle `TOKEN_REFRESHED`/`TOKEN_REFRESH_FAILED` events to trigger `signOut` + re-auth prompts; instrument refresh failures; implement a foreground “check session” task (e.g. every 10 minutes) that calls `refreshSession` when expiry < N minutes; surface UI prompts before forced logouts.

## RLS & Supabase Policy Actions
- **Eliminate service-role bypasses**  
  - Audit all edge functions and server utilities using `supabaseAdmin` or the service role key. Replace with user-scoped clients wherever possible, or add explicit company/role checks before privileged queries. Ensure RLS stays active by avoiding service-role reads unless absolutely necessary.
- **Reconfirm helper function safety**  
  - Verify `public.get_user_company_id` and related helpers (`public.is_company_admin`, etc.) return deterministic results for users tied to multiple companies; add regression tests to ensure the functions respect row visibility when new policies are added.
- **Extend policy coverage to analytics caches & exports**  
  - Review tables without matching `WITH CHECK` clauses for insert/update paths when using `FOR ALL`; ensure storage policies restrict buckets (e.g. audit `form-uploads`) to the owning company; add policies for any newly created export or audit tables.

## Data Export Controls
- **Client-side exports lack auditing**  
  - Locations: `src/components/reports/ReportViewer.tsx:20`, `src/pages/Employees.tsx:621`, `src/hooks/useCookbook.tsx:258`.  
  - Risk: Users can download large datasets without role verification, rate limiting, or audit logging. Exports are indistinguishable from normal reads, impeding GDPR/CCPA reporting.  
  - Actions: Route exports through a dedicated API that enforces role-based limits, scopes by company, records entries in `audit_log`, and watermarks files with user + timestamp. Add throttling and download size caps.

- **No policy or monitoring for bulk data exfiltration**  
  - Risk: Repeated exports or scripted invocations (especially via compromised tokens) go untracked.  
  - Actions: Implement anomaly detection (e.g. alert on >N exports/hour), include export purpose selection UI, and require higher privileges for full-roster or financial downloads.

## Token Refresh Checklist
- Add automated refresh checks (short interval timer invoking `supabase.auth.refreshSession()` when expiry nears).  
- Provide user messaging when a refresh is needed, and block sensitive actions until a fresh token is obtained.  
- Capture refresh metrics (success/failure counts) in observability tooling.

## Next Steps
1. Patch the AI edge functions (auth validation, scoped queries, restricted CORS) and redeploy keys.  
2. Migrate the Supabase client to environment-driven config with hardened token storage.  
3. Design and implement audited export APIs, updating UI flows to call them.  
4. Validate RLS helper coverage via automated tests and peer review before shipping additional policies.  
5. Roll out token refresh telemetry and alerting so auth regressions surface quickly.
