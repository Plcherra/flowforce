import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createJiti } from "jiti";

const root = process.cwd();
const jiti = createJiti(import.meta.url);

const readText = (relativePath) => {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
  return readFileSync(absolutePath, "utf8");
};

const readJson = (relativePath) => JSON.parse(readText(relativePath));

const requireIncludes = (text, needles, label) => {
  const missing = needles.filter((needle) => !text.includes(needle));
  if (missing.length) {
    throw new Error(`${label} missing required terms: ${missing.join(", ")}`);
  }
};

const doc = readText("docs/mobile-app-store-readiness.md");
const report = readText(
  "docs/roadmap/reports/08-09-app-store-readiness-2026-05-30.md",
);
const plan = readText("docs/roadmap/08-mobile-app-and-offline-mode.md");
const master = readText("docs/roadmap/00-master-roadmap.md");
const service = readText("src/services/mobile/mobileAppStoreReadiness.ts");
const metadata = readJson("store/mobile/app-store-metadata.json");
const buildProfiles = readJson("store/mobile/build-profiles.json");
const privacyPolicy = readText("store/mobile/privacy-policy.md");
const testingFlow = readText("store/mobile/internal-testing-flow.md");
const iosInfoPlist = readText("ios/App/App/Info.plist");
const androidManifest = readText("android/app/src/main/AndroidManifest.xml");
const androidStrings = readText("android/app/src/main/res/values/strings.xml");
const packageJson = readJson("package.json");

requireIncludes(
  doc,
  [
    "Mobile App Store Readiness",
    "store/mobile/app-store-metadata.json",
    "store/mobile/privacy-policy.md",
    "store/mobile/build-profiles.json",
    "store/mobile/internal-testing-flow.md",
    "Push notifications",
    "Camera",
    "Microphone",
    "Photo/media access",
    "npm run check:mobile-app-store-readiness",
  ],
  "mobile app store readiness doc",
);

requireIncludes(
  service,
  [
    "mobileStoreMetadata",
    "mobileStorePermissions",
    "mobileBuildProfiles",
    "mobileAppStoreReadinessChecks",
    "testflight",
    "play_internal",
    "production",
    "isMobileAppStoreReadinessReady",
  ],
  "mobile app store readiness service",
);

requireIncludes(
  iosInfoPlist,
  [
    "NSCameraUsageDescription",
    "NSMicrophoneUsageDescription",
    "NSPhotoLibraryUsageDescription",
    "NSUserNotificationsUsageDescription",
    "workflow evidence",
  ],
  "iOS permission descriptions",
);

requireIncludes(
  androidManifest,
  [
    "android.permission.INTERNET",
    "android.permission.POST_NOTIFICATIONS",
    "android.permission.CAMERA",
    "android.permission.RECORD_AUDIO",
    "android.permission.READ_MEDIA_IMAGES",
    "android.permission.READ_MEDIA_VIDEO",
    "android.permission.READ_MEDIA_AUDIO",
  ],
  "Android permissions",
);

requireIncludes(
  androidStrings,
  [
    "camera_permission_reason",
    "microphone_permission_reason",
    "notification_permission_reason",
  ],
  "Android permission reason strings",
);

requireIncludes(
  privacyPolicy,
  [
    "FlowForce Mobile Privacy Policy Draft",
    "Push notifications",
    "Camera",
    "Microphone",
    "Photos/media",
    "Offline Data",
    "Legal review is still required",
  ],
  "mobile privacy policy draft",
);

requireIncludes(
  testingFlow,
  [
    "iOS TestFlight",
    "Android Internal Testing",
    "CAPACITOR_SERVER_URL=https://flowforce.app",
    "Apple signing certificates",
    "Android upload key",
    "Verify login, session restore, push permission, notification tap routing, forms, counts, and offline queue behavior.",
  ],
  "mobile internal testing flow",
);

requireIncludes(
  plan,
  [
    "- [x] Add privacy policy and permissions explanations.",
    "- [x] Add screenshots and metadata.",
    "- [x] Add build profiles.",
    "- [x] Add TestFlight/internal testing flow.",
    "08.09 App Store Readiness",
    "mobile-app-store-readiness.md",
  ],
  "Plan 08 roadmap",
);

const phaseNineBlock = plan.match(
  /### Phase 9: App Store Readiness[\s\S]*?(?=### Phase 10: Native Future Evaluation)/,
)?.[0];

if (!phaseNineBlock || phaseNineBlock.includes("- [ ]")) {
  throw new Error("Plan 08 phase 9 still has unchecked tasks");
}

requireIncludes(
  master,
  [
    "Active plan: [09 Integrations And Migration Tools]",
    "Last completed phase: 09.04, Checklist Platform Migration Path",
    "Last phase report: [09.04 Checklist Platform Migration Path]",
  ],
  "master roadmap",
);

requireIncludes(
  report,
  [
    "mobile store-readiness packet",
    "store/mobile/app-store-metadata.json",
    "iOS permission usage descriptions",
    "Android notification, camera, microphone, and selected media permissions",
    "npm run check:mobile-app-store-readiness",
  ],
  "Plan 08 phase report",
);

if (metadata.appName !== "FlowForce") {
  throw new Error("Store metadata appName must be FlowForce");
}

if (metadata.bundleId !== "com.flowforce.app") {
  throw new Error("Store metadata bundleId must be com.flowforce.app");
}

if (!metadata.screenshots?.ios?.length || !metadata.screenshots?.android?.length) {
  throw new Error("Store metadata must list iOS and Android screenshots");
}

const profileIds = new Set(
  Array.isArray(buildProfiles.profiles)
    ? buildProfiles.profiles.map((profile) => profile.id)
    : [],
);
for (const requiredProfile of [
  "local_dev",
  "internal_testing",
  "testflight",
  "play_internal",
  "production",
]) {
  if (!profileIds.has(requiredProfile)) {
    throw new Error(`Missing mobile build profile: ${requiredProfile}`);
  }
}

requireIncludes(
  JSON.stringify(packageJson.scripts ?? {}),
  [
    "check:mobile-app-store-readiness",
    "scripts/check-mobile-app-store-readiness-contract.mjs",
    "mobile:android:bundle",
  ],
  "package scripts",
);

const readiness = await jiti.import(
  join(root, "src/services/mobile/mobileAppStoreReadiness.ts"),
);

if (!readiness.isMobileAppStoreReadinessReady()) {
  throw new Error("Mobile app store readiness contract is not ready");
}

process.stdout.write("OK mobile app store readiness contract\n");
