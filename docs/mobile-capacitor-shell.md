# Mobile Capacitor Shell

Date: 2026-05-29
Roadmap phase: 08.03 Capacitor Shell

## Goal

FlowForce now has an active Capacitor shell for the v1 app-store path. This is a deliberate fresh shell, not the archived historical config.

## Runtime Model

The current product is a Next.js app with SSR routes and API routes, so the mobile shell should point at a reachable web runtime instead of pretending the app can be exported as a fully static bundle.

Use `CAPACITOR_SERVER_URL` when syncing/running native projects:

```bash
CAPACITOR_SERVER_URL=http://localhost:3000 npm run mobile:cap:sync
```

For a physical device, use a LAN or tunneled HTTPS URL that the device can reach. For production/TestFlight/Play testing, use the deployed FlowForce web URL and add that URL to Supabase auth redirect allowlists.

## Active Config

- Config: `capacitor.config.ts`
- App ID: `com.flowforce.app`
- App name: `FlowForce`
- Fallback web directory: `mobile-shell`
- iOS project: `ios/App`
- Android project: `android`
- Required runtime URL env: `CAPACITOR_SERVER_URL`
- Allowed origins: `localhost`, `127.0.0.1`, `flowforce.app`, `*.flowforce.app`

## Scripts

```bash
npm run check:mobile-capacitor
npm run mobile:cap:sync
npm run mobile:cap:doctor
npm run mobile:ios:open
npm run mobile:android:open
```

## Remaining Native Blockers

- Apple signing and provisioning are not in the repository.
- Android signing keys are not in the repository.
- Final app icons and splash assets still need branded artwork.
- Supabase auth redirect allowlists must include the production web URL and any native deep-link URLs chosen for app-store builds.
- Device QA still needs Xcode/Android Studio simulator or device runs using a reachable `CAPACITOR_SERVER_URL`.

## Local Android Java Runtime

Android Gradle commands use Android Studio's bundled JBR on this Mac:

```bash
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
```

That setup is persisted in `~/.zshrc`. Open a new terminal or run `source ~/.zshrc` before invoking Gradle manually.

## Verification

08.03 is complete when:

- Active Capacitor dependencies are installed.
- `capacitor.config.ts` is FlowForce-branded and does not reference archived/old app config.
- iOS and Android native projects exist.
- `npm run check:mobile-capacitor` passes.
- `npx cap sync` succeeds or the blocker is documented.

Current local verification:

- `npx cap sync` passes.
- `npx cap doctor` passes for iOS and Android dependency health.
- `xcodebuild -list -project ios/App/App.xcodeproj` passes and sees the `App` scheme.
- `cd android && ./gradlew tasks` passes after loading the Android Studio bundled JBR from `~/.zshrc`.
