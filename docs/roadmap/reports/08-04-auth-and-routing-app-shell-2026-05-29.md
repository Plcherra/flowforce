# 08.04 Auth And Routing In App Shell

Date: 2026-05-29

## Outcome

Plan 8 now has an app-shell auth and routing contract for the current Next.js PWA/mobile web app and future Capacitor shell. The implementation preserves protected-route deep links through login, rejects unsafe redirect targets, refreshes session state on app resume/focus, and keeps signup/reset redirects same-origin.

## In Scope

- Login, signup, password reset, invite-link entry, protected-route redirect, session restore, app resume refresh, and logout.
- Web/PWA executable contract plus a native-shell QA contract for the active 08.03 Capacitor shell.

## Artifacts

- Contract: [Mobile Auth And Routing App Shell](../../mobile-auth-routing-app-shell.md)
- Service: `src/services/mobile/mobileAuthRouting.ts`
- Runtime auth: `src/hooks/useAuth.tsx`
- Runtime routing: `src/app-shell/navigation/NavigationGuard.tsx`
- Auth page routing: `src/features/auth/pages/Auth.tsx`
- Checker: `npm run check:mobile-auth-routing`

## Verification

- `npm run check:mobile-auth-routing`
- `npm run check:local`
- `npm run build`

Native shell QA now requires syncing the active Capacitor shell with a reachable `CAPACITOR_SERVER_URL`, then running it in iOS/Android simulator or device environments.

Post-08.03 shell revalidation:

- `npm run check:mobile-capacitor` passes.
- `npm run check:mobile-auth-routing` passes.
- `cd android && ./gradlew tasks` passes with Android Studio's bundled JBR loaded from `~/.zshrc`.
- `supabase migration list` shows remote migrations aligned through `20260529001000_phase7_ai_security_hardening.sql`.

## Next

Phase 08.05 should harden the mobile core workflows after the 08.04 auth/routing contract remains green in the PWA and then in the synced native shell.
