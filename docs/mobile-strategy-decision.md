# Mobile Strategy Decision

Date: 2026-05-29
Roadmap phase: 08.01 Mobile Strategy Decision

## Decision

FlowForce will use a Capacitor-first path for the v1 mobile app while keeping the current Next.js PWA/mobile web app as the source product.

This means v1 mobile is not a Flutter rewrite, not an Expo-first rewrite, and not a second product. The app-store build should wrap the stabilized Next.js experience, then add native capabilities only where pilot workflows prove they are necessary.

Expo/native later remains the fallback for field-heavy screens if Capacitor cannot meet real usage needs around offline work, camera/evidence capture, push reliability, background sync, or app-store quality. Flutter is not planned for v1 because it would force a full UI and product rewrite before the web app is fully shipped.

## Why This Path

FlowForce already has a large Next.js product surface with tenant-safe Supabase contracts, app-shell navigation, mobile viewport coverage, and production readiness gates. The lowest-risk mobile path is to harden that product for mobile users first, then package it through Capacitor when the mobile web baseline is stable.

The decision keeps one product system for web and mobile:

- Web app: Next.js App Router for desktop and tablet operations.
- Mobile now: Next.js PWA/mobile web for responsive pilot use.
- App-store v1: Capacitor-first wrapper around the same Next.js product.
- Native later: Expo/React Native screens only for proven native/offline pressure.

## Pilot Mobile Must Do

The v1 mobile app must support daily manager and staff work without making them return to desktop for core field execution:

- Auth, signup handoff, onboarding status, session restore, logout, and tenant switching.
- Today dashboard with urgent tasks, schedule changes, workflow exceptions, cost alerts, and AI suggestions.
- Schedule read access, shift detail, availability-aware staff context, and manager quick actions.
- Tasks, SOP checklists, recurring operations, evidence capture states, manager review queue, and exceptions.
- Messages, announcements, company updates, and notification-driven return paths.
- Forms, checklist runs, incident reports, and approval/review status.
- Inventory counts, waste/adjustments, stock position checks, low-stock alerts, and purchasing handoff.
- Settings that matter on mobile: profile, notifications, company context, language, and support.
- Mobile-safe navigation, safe areas, touch targets, modals, forms, tables, and text wrapping.

## App Store Requirements

Before app-store submission, FlowForce needs:

- Apple Developer and Google Play Console accounts owned by the product/company.
- Bundle IDs, app names, icons, splash screens, screenshots, and store metadata.
- Privacy policy, terms, support URL, data deletion/export path, and permission explanations.
- Camera/photo/storage permission copy for workflow evidence and form attachments.
- Push notification provider choice, device-token storage, preferences, and opt-out behavior.
- Deep links, redirect URLs, app-bound domains, and Supabase auth redirect configuration.
- Build profiles for local dev, internal testing, TestFlight, Play internal testing, and production.
- A mobile QA checklist covering auth, routing, offline behavior, notifications, and core workflows.

## Web-Only For V1

Some admin-heavy work should remain web-only for v1 mobile so the app can ship with a focused field experience:

- Company setup, billing, plan management, and tenant-level administration.
- Role matrix editing, permission registry changes, support/admin tooling, and audit-log investigation.
- Complex report builders, financial exports, bulk imports, migration tools, and large data cleanup.
- Deep analytics workbenches, long-form configuration, and desktop-heavy table editing.
- Roadmap/infrastructure operations such as deploy, backup, rollback, and release-gate management.

## Native Triggers

Move from Capacitor-wrapped web to selective Expo/native screens only if pilot usage shows one or more of these blockers:

- Offline counts/forms lose data or create unacceptable conflict resolution friction.
- Evidence capture needs native camera, file handling, compression, or background upload behavior the wrapper cannot support well.
- Push notification delivery, deep links, or route restore remain unreliable after the Capacitor shell work.
- Staff workflows require native performance or gestures beyond the wrapped app.
- App-store review or platform policy forces native implementation changes.

## Plan 8 Flow

Plan 8 should proceed in this order:

1. Finish responsive mobile QA for the current Next.js app.
2. Add the Capacitor shell only after the PWA/mobile web baseline is usable.
3. Validate auth, routing, session restore, and app resume in the shell.
4. Harden field workflows before adding broad native features.
5. Add push notifications.
6. Add offline queue and offline counts/forms.
7. Prepare store submission.
8. Re-evaluate native/Expo only after real usage data.

## Verification

08.01 is complete when:

- This decision is linked from the master roadmap and Plan 8.
- `src/services/mobile/mobileStrategy.ts` exposes the chosen path and v1 scope.
- `npm run check:mobile-strategy` passes.
