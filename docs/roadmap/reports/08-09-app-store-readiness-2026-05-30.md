# 08.09 App Store Readiness

Date: 2026-05-30

## Outcome

Phase 08.09 created the mobile store-readiness packet for iOS TestFlight and Google Play internal testing.

## Delivered

- Added `src/services/mobile/mobileAppStoreReadiness.ts`.
- Added app metadata at `store/mobile/app-store-metadata.json`.
- Added privacy policy draft at `store/mobile/privacy-policy.md`.
- Added build profile registry at `store/mobile/build-profiles.json`.
- Added internal testing flow at `store/mobile/internal-testing-flow.md`.
- Added iOS permission usage descriptions.
- Added Android notification, camera, microphone, and selected media permissions.
- Added `npm run mobile:android:bundle`.
- Added `npm run check:mobile-app-store-readiness`.

## Verification

- `npm run check:mobile-app-store-readiness`
- `npm run check:mobile-capacitor`
- `npm run typecheck:src`
- `npm run check:local`
- `npm run build`
- `git diff --check`

## Remaining Manual Work

- Capture final app-store screenshots from simulator/device builds.
- Complete legal review of the privacy policy and terms.
- Configure Apple signing and Android upload signing outside the repository.
