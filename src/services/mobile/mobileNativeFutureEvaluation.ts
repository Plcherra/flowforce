export type MobileRuntimeDecision =
  | "capacitor_is_v1_path"
  | "selective_native_screens_later"
  | "native_rewrite_required";

export type NativeTriggerSeverity = "monitor" | "plan" | "blocker";

export type NativeFutureTrigger = {
  id: string;
  label: string;
  severity: NativeTriggerSeverity;
  threshold: string;
  fallbackPlan: string;
};

export type NativeCandidateScreen = {
  id: string;
  label: string;
  nativeCandidate: boolean;
  reason: string;
  sharedContracts: string[];
};

export const mobileNativeFutureDecision = {
  decision: "capacitor_is_v1_path" as MobileRuntimeDecision,
  nativeRewriteStatus: "deferred_until_pilot_evidence",
  rationale:
    "The Next.js mobile web app now has a Capacitor shell, app-store packet, push routing, core mobile workflows, and offline protection for forms and inventory counts. A native rewrite is not justified before pilot usage proves a specific field-workflow blocker.",
  nextReviewMilestone:
    "After internal TestFlight/Play testing and the first paid-pilot field usage cycle.",
} as const;

export const nativeFutureTriggers: NativeFutureTrigger[] = [
  {
    id: "offlinedata_loss",
    label: "Offline field work loses data or creates repeated conflicts",
    severity: "blocker",
    threshold:
      "Any reproducible data loss, or more than 2 percent of offline form/count syncs requiring manual repair during pilot use.",
    fallbackPlan:
      "Build selective Expo/React Native screens for forms, inventory counts, and evidence capture while keeping the Next.js app for admin workflows.",
  },
  {
    id: "evidence_capture_limits",
    label: "Evidence capture needs native camera/media/background upload behavior",
    severity: "plan",
    threshold:
      "Managers cannot reliably capture, compress, attach, or sync photos, video, audio, scans, or signatures from the Capacitor shell.",
    fallbackPlan:
      "Move evidence-heavy workflow steps to native screens with shared upload, audit, and offline contracts.",
  },
  {
    id: "push_or_deep_link_reliability",
    label: "Push taps or deep links do not restore users into the right workflow",
    severity: "plan",
    threshold:
      "More than one unresolved route-restore failure in internal testing or pilot usage after app-shell fixes.",
    fallbackPlan:
      "Add native notification/deep-link handling for urgent workflow routes while preserving existing route contracts.",
  },
  {
    id: "field_performance_pressure",
    label: "Staff field workflows feel too slow or awkward in the wrapper",
    severity: "monitor",
    threshold:
      "Repeated pilot feedback that count entry, checklist execution, or task completion is slower than the manual process it replaces.",
    fallbackPlan:
      "Prototype native field execution screens for the narrow workflow causing friction.",
  },
  {
    id: "platform_policy_blocker",
    label: "App-store review requires native behavior",
    severity: "blocker",
    threshold:
      "Apple or Google rejects the app for a policy reason that cannot be fixed in the Capacitor shell.",
    fallbackPlan:
      "Implement the minimum native change required for store approval before broad native investment.",
  },
] as const;

export const nativeCandidateScreens: NativeCandidateScreen[] = [
  {
    id: "inventory_counts",
    label: "Inventory count execution",
    nativeCandidate: true,
    reason:
      "High-frequency field entry, weak connectivity, barcode/camera pressure, and conflict handling can justify a native screen later.",
    sharedContracts: [
      "tenant context",
      "inventory count repository",
      "offline queue",
      "review status",
      "audit events",
    ],
  },
  {
    id: "forms_and_evidence",
    label: "Forms, checklists, and evidence capture",
    nativeCandidate: true,
    reason:
      "Camera, microphone, media selection, signatures, scans, offline drafts, and uploads are the strongest native-pressure surface.",
    sharedContracts: [
      "form schema",
      "submission payload",
      "evidence metadata",
      "offline queue",
      "review status",
    ],
  },
  {
    id: "tasks_and_workflows",
    label: "Task and workflow field execution",
    nativeCandidate: true,
    reason:
      "If staff spend most mobile time completing tasks, native interactions may become worth it after pilot measurement.",
    sharedContracts: [
      "task model",
      "workflow steps",
      "push route map",
      "audit events",
      "offline queue",
    ],
  },
  {
    id: "admin_and_reports",
    label: "Admin, settings, and reports",
    nativeCandidate: false,
    reason:
      "Desktop/web remains the right v1 surface for tenant administration, billing, complex reporting, and bulk data work.",
    sharedContracts: ["auth", "tenant context", "permissions"],
  },
] as const;

export const mobileNativeSharedContracts = [
  "Supabase auth/session restore",
  "tenant company context",
  "role and permission registry",
  "safe /app route map",
  "mobile push event routes",
  "offline queue payloads",
  "form submission payloads",
  "inventory count line updates",
  "workflow review status",
  "audit event taxonomy",
] as const;

export const mobileNativeFutureChecks = [
  "capacitor_remains_v1_path",
  "native_rewrite_is_deferred_until_pilot_evidence",
  "expo_nativecandidates_are_limited_to_field_heavy_workflows",
  "shared_contracts_are_defined_before_native_work",
  "native_rebuild_is_not_started_without_trigger",
] as const;

export function shouldStartNativeRewrite(triggerIds: string[]) {
  const blockers = new Set(
    nativeFutureTriggers
      .filter((trigger) => trigger.severity === "blocker")
      .map((trigger) => trigger.id),
  );

  return triggerIds.some((triggerId) => blockers.has(triggerId));
}

export function getNativeCandidateScreen(screenId: string) {
  return (
    nativeCandidateScreens.find((screen) => screen.id === screenId) ?? null
  );
}

export function isMobileNativeFutureEvaluationReady() {
  const candidateIds = new Set(nativeCandidateScreens.map((screen) => screen.id));
  const triggerIds = new Set(nativeFutureTriggers.map((trigger) => trigger.id));

  return (
    mobileNativeFutureDecision.decision === "capacitor_is_v1_path" &&
    mobileNativeFutureDecision.nativeRewriteStatus ===
      "deferred_until_pilot_evidence" &&
    candidateIds.has("inventory_counts") &&
    candidateIds.has("forms_and_evidence") &&
    candidateIds.has("tasks_and_workflows") &&
    triggerIds.has("offlinedata_loss") &&
    triggerIds.has("platform_policy_blocker") &&
    mobileNativeSharedContracts.includes("offline queue payloads") &&
    mobileNativeFutureChecks.includes(
      "native_rebuild_is_not_started_without_trigger",
    ) &&
    shouldStartNativeRewrite(["offlinedata_loss"]) &&
    !shouldStartNativeRewrite(["field_performance_pressure"])
  );
}
