# 08.06 Push Notifications

Date: 2026-05-30

## Outcome

Plan 8 now has a native push-notification foundation for the Capacitor app shell. The provider decision is Capacitor Push Notifications with Supabase-owned token registration and preferences, keeping raw device token reads away from authenticated clients.

## Artifacts

- Contract: [Mobile Push Notifications](../../mobile-push-notifications.md)
- Service: `src/services/mobile/mobilePushNotifications.ts`
- Runtime hook: `src/hooks/useMobilePushNotifications.ts`
- Native config: `capacitor.config.ts`
- Migration: `supabase/migrations/20260530000100_phase8_mobile_push_notifications.sql`
- Checker: `npm run check:mobile-push-notifications`

## Verification

- `npm run check:mobile-push-notifications`
- `npm run check:mobile-capacitor`
- `npm run check:local`
- `npm run build`
- Latest visible-module smoke baseline: `docs/test-results/visible-modules-smoke.json`

## Next

Phase 08.07 should start the offline queue foundation for tasks, forms, and inventory counts now that native push can route users back to urgent work.
