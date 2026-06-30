export type MobileStorePlatform = "ios" | "android";

export type MobileStorePermission = {
  key: string;
  platform: MobileStorePlatform | "both";
  purpose: string;
  userFacingCopy: string;
};

export type MobileBuildProfile = {
  id: "local_dev" | "internal_testing" | "testflight" | "play_internal" | "production";
  platform: MobileStorePlatform | "both";
  command: string;
  signingRequired: boolean;
  purpose: string;
};

export const mobileStoreMetadata = {
  appName: "FlowForce",
  bundleId: "com.flowforce.app",
  category: "Business",
  supportUrl: "https://flowforce.app/support",
  privacyPolicyPath: "store/mobile/privacy-policy.md",
  description:
    "FlowForce helps restaurant, retail, and service teams run tasks, schedules, forms, inventory counts, cost alerts, and manager workflows from one secure operating system.",
  keywords: [
    "operations",
    "tasks",
    "scheduling",
    "inventory",
    "forms",
    "restaurants",
    "retail",
  ],
} as const;

export const mobileStorePermissions: MobileStorePermission[] = [
  {
    key: "push_notifications",
    platform: "both",
    purpose: "Bring users back to urgent tasks, approvals, schedule changes, messages, low stock, and overdue workflows.",
    userFacingCopy:
      "FlowForce sends notifications for urgent operational work such as assigned tasks, schedule changes, approvals, messages, low stock, and overdue workflows.",
  },
  {
    key: "camera",
    platform: "both",
    purpose: "Capture workflow evidence, scan codes, and attach proof to forms or checklist runs.",
    userFacingCopy:
      "FlowForce uses the camera only when you scan a code or attach photo/video evidence to a task, form, inventory count, or workflow.",
  },
  {
    key: "microphone",
    platform: "both",
    purpose: "Allow form/audio evidence fields when a workflow asks for a recorded response.",
    userFacingCopy:
      "FlowForce uses the microphone only when you choose to record audio evidence inside a form or workflow.",
  },
  {
    key: "photo_library",
    platform: "ios",
    purpose: "Attach existing photos or videos as workflow evidence.",
    userFacingCopy:
      "FlowForce can access selected photos or videos only when you choose an existing file as workflow evidence.",
  },
  {
    key: "media_picker",
    platform: "android",
    purpose: "Attach selected images, video, or audio as workflow evidence.",
    userFacingCopy:
      "FlowForce can access selected media only when you choose files to attach as workflow evidence.",
  },
] as const;

export const mobileBuildProfiles: MobileBuildProfile[] = [
  {
    id: "local_dev",
    platform: "both",
    command: "CAPACITOR_SERVER_URL=http://localhost:3000 npm run mobile:cap:sync",
    signingRequired: false,
    purpose: "Local simulator/device development against the Next.js dev server.",
  },
  {
    id: "internal_testing",
    platform: "both",
    command: "npm run mobile:cap:doctor && npm run mobile:cap:sync",
    signingRequired: true,
    purpose: "Prepare signed builds for product-team QA.",
  },
  {
    id: "testflight",
    platform: "ios",
    command: "npm run mobile:ios:open",
    signingRequired: true,
    purpose: "Open Xcode to archive and upload an iOS build to TestFlight.",
  },
  {
    id: "play_internal",
    platform: "android",
    command: "npm run mobile:android:bundle",
    signingRequired: true,
    purpose: "Create an Android App Bundle for Play Console internal testing.",
  },
  {
    id: "production",
    platform: "both",
    command: "npm run check:release && npm run mobile:cap:sync",
    signingRequired: true,
    purpose: "Final store-submission gate after release checks pass.",
  },
] as const;

export const mobileAppStoreReadinessChecks = [
  "privacy_policy_and_terms_paths_are_defined",
  "ios_and_android_permission_copy_is_defined",
  "screenshots_and_metadata_are_listed",
  "buildprofiles_cover_internal_testflight_play_and_production",
  "internal_testing_flow_is_documented",
] as const;

export function getMobileStorePermission(key: string) {
  return mobileStorePermissions.find((permission) => permission.key === key) ?? null;
}

export function isMobileAppStoreReadinessReady() {
  const profileIds = new Set(mobileBuildProfiles.map((profile) => profile.id));
  const permissionKeys = new Set(
    mobileStorePermissions.map((permission) => permission.key),
  );

  return (
    mobileStoreMetadata.appName === "FlowForce" &&
    mobileStoreMetadata.bundleId === "com.flowforce.app" &&
    mobileStoreMetadata.privacyPolicyPath ===
      "store/mobile/privacy-policy.md" &&
    permissionKeys.has("push_notifications") &&
    permissionKeys.has("camera") &&
    permissionKeys.has("microphone") &&
    profileIds.has("internal_testing") &&
    profileIds.has("testflight") &&
    profileIds.has("play_internal") &&
    profileIds.has("production") &&
    mobileAppStoreReadinessChecks.includes(
      "internal_testing_flow_is_documented",
    )
  );
}
