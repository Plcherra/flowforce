# Quality Assurance Hardening Tasks

## React Error Boundaries
- [ ] Wrap the marketing/public router shell with an error boundary so crashes in unauthenticated routes do not take down the whole app. Update `src/components/navigation/AppLayout.tsx` to nest `RouteLoadingBoundary` inside `ErrorBoundary` (mirroring `AppShell`) and add a fallback UI.
- [ ] Add a localized boundary for the messaging workspace so realtime failures do not blank the entire application shell. Introduce a small boundary component around the heavy data region in `src/pages/MessagesPage.tsx` to surface toast-friendly fallback states while leaving navigation intact.
- [ ] Ensure lazy resource routes have explicit route-level boundaries. Audit `src/routes/resourceRoutes.tsx` usage and wrap the routes collection in an error boundary to handle doc/video page render exceptions.

## Async Error Handling
- [ ] Guard Supabase auth bootstrap against rejected promises. In `src/hooks/useAuth.tsx:37`, add `.catch` handling (and toast/console reporting) around `supabase.auth.getSession()` so initialization errors don’t trigger unhandled promise rejections.
- [ ] Add error handling for sign-out failures. Wrap `supabase.auth.signOut()` in `src/hooks/useAuth.tsx:137` with try/catch and surface errors via toast/logging so rejected sign-out calls don’t bubble as unhandled rejections.
- [ ] Normalize async subscriptions in the messaging reactions widget. Update `src/components/messages/MessageReactions.tsx` so the `useEffect` returns the cleanup function from `subscribeToReactions()` and wrap realtime callbacks in try/catch to prevent silent promise rejections when the channel fails to register.

## Supabase Tenant Scope & RLS Tests
- [ ] Scope messaging queries by company. Add `.eq('company_id', activeCompanyId)` (or join-safe equivalent) to Supabase calls in:
  - `src/pages/MessagesPage.tsx:102` (profiles roster bootstrap)
  - `src/components/messages/MessageSearch.tsx:80-115` (message + channel search)
  - `src/components/messages/UserSelector.tsx:71-88` (user lookup)
  - `src/components/messages/ChannelMembers.tsx:80-121` and `ChannelSettings.tsx:70-114` (member updates/deletes)  
  Ensure the relevant company context is available and plumbed through hooks.
- [ ] Harden analytics aggregates to filter by tenant. In `src/services/analytics/businessAnalyticsService.ts:370-401`, add `company_id` filters to the `tasks`, `inventory_transactions`, and `expenses` queries so cross-tenant user IDs cannot leak data.
- [ ] Introduce server-side guards for service-role mutations. Update `src/server/vendorEvents.ts:29-50` to require a caller-provided company identifier, validate it against the authenticated tenant, and constrain updates/deletes with both `id` and `company_id`. Add similar checks to any other `supabaseAdmin` helpers.
- [ ] Expand Supabase RLS coverage tests. Under `supabase/tests/`, add policy tests that assert `message_channels`, `channel_members`, `messages`, and `vendor_event` tables reject access from users outside the tenant, including service-role bypass attempts. Cover the new channel/company filters and vendor event guard paths.
