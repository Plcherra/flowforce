# Mobile Auth And Routing App Shell

Date: 2026-05-29
Roadmap phase: 08.04 Auth And Routing In App Shell

## Goal

Mobile auth must behave predictably before the app-store shell carries real users. A manager or staff member should be able to open a protected route, authenticate, return to the intended route, resume the app later, and sign out without stale tenant data remaining on screen.

## Scope

08.04 covers the current Next.js PWA/mobile web app and the active Capacitor shell boundary:

- Login preserves a same-origin `redirectTo` target and rejects unsafe external redirects.
- Signup email redirects return to `/auth?intent=signup`.
- Password reset redirects return to `/auth?reset=true`.
- Invite links remain `/auth?invite=<token>`.
- Protected app routes redirect unauthenticated users to `/auth?redirectTo=<safe route>`.
- Authenticated users on auth routes return to the safe target or `/app/dashboard`.
- Session restore runs on initial hydration.
- Session refresh runs on focus, `pageshow`, visibility restore, and native-style `resume`.
- Logout clears Supabase state, invalidates React Query cache, and leaves protected UI.

## Native Shell Boundary

The repo now has an active 08.03 Capacitor shell. True iOS/Android auth verification still requires syncing the shell with a reachable `CAPACITOR_SERVER_URL` and running it in a simulator/device:

- iOS/Android universal/app links are not configured yet.
- Native secure storage is not configured yet.
- App-store redirect allowlists still need real production domains and bundle IDs.
- Android Gradle verification now passes through Android Studio's bundled JBR configured in `~/.zshrc`.

## Required QA

Run the web/PWA checks now:

```bash
npm run check:mobile-auth-routing
npm run check:local
npm run build
```

Run native shell QA after 08.03 exists:

- Open `/app/tasks?tab=today` while signed out; login should return to that route.
- Open an invite link; invalid tokens should show the explicit invite error state.
- Trigger password reset; the link should return to the reset form.
- Kill and reopen the app; the session should restore without flashing protected data to a signed-out user.
- Resume from background; session state should refresh.
- Sign out; app should land on `/auth` and clear tenant queries.

Current shell readiness checks:

- `npm run check:mobile-capacitor` passes.
- `npm run check:mobile-auth-routing` passes.
- `cd android && ./gradlew tasks` passes after loading `~/.zshrc`.
- `supabase migration list` shows local and remote migrations aligned through `20260529001000`.

## Verification

08.04 is complete when:

- `src/services/mobile/mobileAuthRouting.ts` exposes the auth route contract.
- `NavigationGuard` uses explicit `redirectTo` query routing instead of ignored router state.
- `useAuth` handles auth callback code exchange, session restore, app resume refresh, signup redirect, password reset redirect, and logout.
- `Auth` honors a safe post-login route.
- `npm run check:mobile-auth-routing` passes.
