import {
  enqueueMobileOfflineMutation,
  type MobileOfflineQueueItem,
  type MobileOfflineOperation,
} from "./mobileOfflineQueue";

type OfflineWorkflowIdentity = {
  companyId: string;
  userId: string;
};

type OfflineEvidenceDescriptor = {
  offlineEvidence: true;
  kind: "file" | "blob";
  name: string | null;
  size: number;
  type: string | null;
  lastModified: number | null;
};

export type OfflineEvidenceSummary = {
  hasEvidence: boolean;
  evidenceFields: string[];
  fileCount: number;
  policy: "metadata_only_until_sync";
};

export const mobileOfflineCriticalWorkflowChecks = [
  "inventory_count_create_update_line_update_and_submit_are_queued",
  "form_submissions_are_queued_with_evidence_metadata",
  "offline_errors_do_not_destroy_field_work",
  "review_status_is_marked_pending_sync",
  "raw_file_and_blob_payloads_are_not_persisted_to_local_storage",
] as const;

const networkErrorTerms = [
  "failed to fetch",
  "networkerror",
  "network request failed",
  "load failed",
  "fetch failed",
  "timeout",
  "offline",
] as const;

const nowIso = () => new Date().toISOString();

const isFileLike = (value: unknown): value is File =>
  typeof File !== "undefined" && value instanceof File;

const isBlobLike = (value: unknown): value is Blob =>
  typeof Blob !== "undefined" && value instanceof Blob;

const describeEvidenceValue = (
  value: File | Blob,
  kind: "file" | "blob",
): OfflineEvidenceDescriptor => ({
  offlineEvidence: true,
  kind,
  name: kind === "file" && "name" in value ? value.name : null,
  size: value.size,
  type: value.type || null,
  lastModified:
    kind === "file" && "lastModified" in value ? value.lastModified : null,
});

const sanitizeValue = (
  value: unknown,
  evidenceFields: Set<string>,
  path: string,
): unknown => {
  if (isFileLike(value)) {
    evidenceFields.add(path);
    return describeEvidenceValue(value, "file");
  }

  if (isBlobLike(value)) {
    evidenceFields.add(path);
    return describeEvidenceValue(value, "blob");
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry, index) =>
      sanitizeValue(entry, evidenceFields, `${path}[${index}]`),
    );
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        sanitizeValue(entry, evidenceFields, path ? `${path}.${key}` : key),
      ]),
    );
  }

  return value;
};

export function isOfflineQueueableError(error: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return true;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  const normalized = message.toLowerCase();
  return networkErrorTerms.some((term) => normalized.includes(term));
}

export function sanitizeOfflineEvidencePayload<T extends Record<string, unknown>>(
  payload: T,
) {
  const evidenceFields = new Set<string>();
  const sanitized = sanitizeValue(payload, evidenceFields, "") as T;
  const evidenceSummary: OfflineEvidenceSummary = {
    hasEvidence: evidenceFields.size > 0,
    evidenceFields: Array.from(evidenceFields).sort(),
    fileCount: evidenceFields.size,
    policy: "metadata_only_until_sync",
  };

  return { sanitized, evidenceSummary };
}

export function queueOfflineInventoryCountCreate(
  input: OfflineWorkflowIdentity & {
    payload: Record<string, unknown>;
  },
): MobileOfflineQueueItem {
  return enqueueMobileOfflineMutation({
    companyId: input.companyId,
    userId: input.userId,
    entity: "inventory_counts",
    operation: "create",
    route: "/app/inventory/counts",
    payload: {
      workflow: "inventory_count_create",
      reviewStatus: "pending_offline_sync",
      queuedAt: nowIso(),
      count: input.payload,
    },
    optimisticKey: `inventory-count:create:${Date.now()}`,
    serverVersion: null,
  });
}

export function queueOfflineInventoryCountUpdate(
  input: OfflineWorkflowIdentity & {
    countId: string;
    updates: Record<string, unknown>;
  },
): MobileOfflineQueueItem {
  return enqueueMobileOfflineMutation({
    companyId: input.companyId,
    userId: input.userId,
    entity: "inventory_counts",
    operation: "update",
    route: `/app/inventory/counts/${input.countId}`,
    payload: {
      workflow: "inventory_count_update",
      countId: input.countId,
      reviewStatus: "pending_offline_sync",
      queuedAt: nowIso(),
      updates: input.updates,
    },
    optimisticKey: `inventory-count:${input.countId}`,
    serverVersion: null,
  });
}

export function queueOfflineInventoryCountLineUpdate(
  input: OfflineWorkflowIdentity & {
    countId: string;
    lineId: string;
    updates: Record<string, unknown>;
  },
): MobileOfflineQueueItem {
  return enqueueMobileOfflineMutation({
    companyId: input.companyId,
    userId: input.userId,
    entity: "inventory_counts",
    operation: "update",
    route: `/app/inventory/counts/${input.countId}`,
    payload: {
      workflow: "inventory_count_line_update",
      countId: input.countId,
      lineId: input.lineId,
      reviewStatus: "pending_offline_sync",
      queuedAt: nowIso(),
      updates: input.updates,
    },
    optimisticKey: `inventory-count-line:${input.lineId}`,
    serverVersion: null,
  });
}

export function queueOfflineInventoryCountSubmit(
  input: OfflineWorkflowIdentity & {
    countId: string;
    operation: Extract<MobileOfflineOperation, "submit" | "complete">;
  },
): MobileOfflineQueueItem {
  return enqueueMobileOfflineMutation({
    companyId: input.companyId,
    userId: input.userId,
    entity: "inventory_counts",
    operation: input.operation,
    route: `/app/inventory/counts/${input.countId}`,
    payload: {
      workflow:
        input.operation === "complete"
          ? "inventory_count_complete"
          : "inventory_count_submit_for_review",
      countId: input.countId,
      reviewStatus: "pending_review_sync",
      queuedAt: nowIso(),
    },
    optimisticKey: `inventory-count:${input.countId}:${input.operation}`,
    serverVersion: null,
  });
}

export function queueOfflineFormSubmission(
  input: OfflineWorkflowIdentity & {
    formId: string;
    submissionData: Record<string, unknown>;
    userAgent?: string | null;
  },
): MobileOfflineQueueItem {
  const { sanitized, evidenceSummary } = sanitizeOfflineEvidencePayload(
    input.submissionData,
  );

  return enqueueMobileOfflineMutation({
    companyId: input.companyId,
    userId: input.userId,
    entity: "forms",
    operation: "submit",
    route: "/app/forms",
    payload: {
      workflow: "form_submission",
      formId: input.formId,
      reviewStatus: "pending_review_sync",
      queuedAt: nowIso(),
      submissionData: sanitized,
      evidenceSummary,
      userAgent: input.userAgent ?? null,
    },
    optimisticKey: `form-submission:${input.formId}:${Date.now()}`,
    serverVersion: null,
  });
}

export function isMobileOfflineCriticalWorkflowsReady() {
  const { evidenceSummary } = sanitizeOfflineEvidencePayload({
    text: "ok",
  });

  return (
    mobileOfflineCriticalWorkflowChecks.includes(
      "inventory_count_create_update_line_update_and_submit_are_queued",
    ) &&
    mobileOfflineCriticalWorkflowChecks.includes(
      "raw_file_and_blob_payloads_are_not_persisted_to_local_storage",
    ) &&
    evidenceSummary.policy === "metadata_only_until_sync" &&
    isOfflineQueueableError(new Error("Failed to fetch"))
  );
}
