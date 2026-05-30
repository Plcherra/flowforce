# 08.03 Capacitor Shell

Date: 2026-05-29

## Outcome

FlowForce now has an active Capacitor-first mobile shell for iOS and Android. The shell uses a fresh FlowForce app ID/name, a small packaged fallback, and a `CAPACITOR_SERVER_URL` runtime model for the current SSR/API-backed Next.js app.

## Artifacts

- Config: `capacitor.config.ts`
- Fallback web shell: `mobile-shell/index.html`
- Contract: [Mobile Capacitor Shell](../../mobile-capacitor-shell.md)
- Service: `src/services/mobile/mobileCapacitorShell.ts`
- Checker: `npm run check:mobile-capacitor`
- Native projects: `ios/App`, `android`

## Verification

- `npm run check:mobile-capacitor`
- `npx cap sync` passed.
- `npx cap doctor` passed for iOS and Android dependency health.
- `xcodebuild -list -project ios/App/App.xcodeproj` passed.
- `cd android && ./gradlew tasks` passed after loading Android Studio's bundled JBR from `~/.zshrc`.
- `npm run check:local`
- `npm run build`

Device builds still require Xcode/Android Studio device or simulator setup and real signing/provisioning. The repository now has the shell foundation needed for those runs.

## Next

Re-run 08.04 native auth QA against this shell with a reachable `CAPACITOR_SERVER_URL`, then continue to 08.05 mobile core workflow hardening.
