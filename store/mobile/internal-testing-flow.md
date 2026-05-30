# Mobile Internal Testing Flow

Date: 2026-05-30

## Prerequisites

- Apple Developer account owned by the product/company.
- Google Play Console account owned by the product/company.
- Production FlowForce web URL configured in `CAPACITOR_SERVER_URL`.
- Supabase auth redirect allowlists include the production URL and chosen native redirect URLs.
- Apple signing certificates and provisioning profiles are available in Xcode.
- Android upload key/keystore is available locally or in the release CI secret store.

## iOS TestFlight

1. Run `npm run check:release`.
2. Run `CAPACITOR_SERVER_URL=https://flowforce.app npm run mobile:cap:sync`.
3. Open Xcode with `npm run mobile:ios:open`.
4. Confirm bundle ID `com.flowforce.app`, version, signing team, and capabilities.
5. Archive the `App` scheme.
6. Upload to App Store Connect.
7. Add internal testers in TestFlight.
8. Verify login, session restore, push permission, notification tap routing, forms, counts, and offline queue behavior.

## Android Internal Testing

1. Run `npm run check:release`.
2. Run `CAPACITOR_SERVER_URL=https://flowforce.app npm run mobile:cap:sync`.
3. Run `npm run mobile:android:bundle`.
4. Sign the AAB with the company upload key if Gradle signing is not configured locally.
5. Upload the AAB to Play Console internal testing.
6. Add internal testers.
7. Verify login, session restore, push permission, notification tap routing, forms, counts, and offline queue behavior.

## Submission Blockers

- Final screenshots must be captured from real simulator/device builds.
- Final privacy policy and terms need legal approval.
- Apple and Android signing secrets must stay out of the repository.
