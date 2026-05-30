# Mobile App Store Readiness

Date: 2026-05-30
Roadmap phase: 08.09 App Store Readiness

## Scope

Phase 08.09 prepares FlowForce for iOS TestFlight and Google Play internal testing without committing signing secrets.

## Store Packet

- Metadata: `store/mobile/app-store-metadata.json`
- Privacy policy draft: `store/mobile/privacy-policy.md`
- Build profiles: `store/mobile/build-profiles.json`
- Internal testing flow: `store/mobile/internal-testing-flow.md`
- Runtime contract: `src/services/mobile/mobileAppStoreReadiness.ts`

## Permissions

FlowForce declares and documents only permissions tied to product behavior:

- Push notifications for urgent operational work.
- Camera for scanning and workflow evidence.
- Microphone for audio evidence fields.
- Photo/media access for selected workflow evidence files.
- Internet access for the app runtime.

iOS usage descriptions live in `ios/App/App/Info.plist`. Android permissions live in `android/app/src/main/AndroidManifest.xml`.

## Screenshots And Metadata

The app-store screenshot set must cover:

- Dashboard with urgent work.
- Tasks and checklists.
- Inventory counts.
- Forms and evidence.
- Notifications and settings.

The metadata JSON includes the app name, bundle ID, category, support URL, privacy policy path, short description, full description, keywords, and screenshot shot list.

## Build Profiles

The build profile registry covers:

- Local development.
- Internal testing.
- iOS TestFlight.
- Android Play internal testing.
- Production submission.

Apple signing certificates, provisioning profiles, Android upload keys, and keystore passwords are intentionally excluded from the repository.

## Verification

08.09 is complete when:

- `npm run check:mobile-app-store-readiness` passes.
- `npm run check:mobile-capacitor` passes.
- `npm run check:local` passes.
- `npm run build` passes.
