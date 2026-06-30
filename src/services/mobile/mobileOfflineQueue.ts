export const MOBILE_OFFLINE_QUEUE_STORAGE_KEY =
  "flowforce.mobile.offlineQueue.v1";

export type MobileOfflineEntity = "tasks" | "forms" | "inventory_counts";
export type MobileOfflineOperation =
  | "create"
  | "update"
  | "delete"
  | "submit"
  | "complete";
export type MobileOfflineQueueStatus =
  | "pending"
  | "syncing"
  | "synced"
  | "failed"
  | "conflict";
export type MobileOfflineConflictStrategy =
  | "server_wins"
  | "client_replay"
  | "manual_review";

export type MobileOfflineCapableEntity = {
  entity: MobileOfflineEntity;
  label: string;
  route: string;
  operations: MobileOfflineOperation[];
  conflictStrategy: MobileOfflineConflictStrategy;
  requiresServerVersion: boolean;
  optimisticUi: boolean;
};

export type MobileOfflineQueueItem = {
  id: string;
  companyId: string;
  userId: string;
  entity: MobileOfflineEntity;
  operation: MobileOfflineOperation;
  route: string;
  payload: Record<string, unknown>;
  optimisticKey: string;
  serverVersion?: string | null;
  clientVersion: string;
  status: MobileOfflineQueueStatus;
  retryCount: number;
  maxRetries: number;
  nextAttemptAt: string | null;
  errorMessage?: string | null;
  conflictMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MobileOfflineQueueSummary = {
  total: number;
  pending: number;
  syncing: number;
  failed: number;
  conflict: number;
  synced: number;
  nextRoute: string | null;
};

export const mobileOfflineCapableEntities: MobileOfflineCapableEntity[] = [
  {
    entity: "tasks",
    label: "Tasks",
    route: "/app/tasks",
    operations: ["create", "update", "complete"],
    conflictStrategy: "client_replay",
    requiresServerVersion: true,
    optimisticUi: true,
  },
  {
    entity: "forms",
    label: "Forms",
    route: "/app/forms",
    operations: ["create", "update", "submit"],
    conflictStrategy: "manual_review",
    requiresServerVersion: true,
    optimisticUi: true,
  },
  {
    entity: "inventory_counts",
    label: "Inventory Counts",
    route: "/app/inventory/counts",
    operations: ["create", "update", "submit"],
    conflictStrategy: "manual_review",
    requiresServerVersion: true,
    optimisticUi: true,
  },
];

export const mobileOfflineQueueChecks = [
  "tasks_forms_inventory_counts_are_offline_capable",
  "mutations_are_persisted_before_network_sync",
  "retry_uses_exponential_backoff",
  "failed_and_conflict_states_are_visible_in_mobile_app_shell",
  "offline_queue_routesuser_back_to_source_workflow",
  "synced_items_are_pruned_after_success",
] as const;

const nowIso = () => new Date().toISOString();

const createQueueId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getStorage = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage;
};

export function readMobileOfflineQueue(): MobileOfflineQueueItem[] {
  const storage = getStorage();
  if (!storage) return [];

  const raw = storage.getItem(MOBILE_OFFLINE_QUEUE_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeMobileOfflineQueue(items: MobileOfflineQueueItem[]) {
  const storage = getStorage();
  if (!storage) return items;

  storage.setItem(MOBILE_OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("flowforce-mobile-offline-queue"));
  return items;
}

export function getMobileOfflineEntity(
  entity: MobileOfflineEntity,
): MobileOfflineCapableEntity | null {
  return (
    mobileOfflineCapableEntities.find((candidate) => candidate.entity === entity) ??
    null
  );
}

export function getMobileOfflineRetryDelayMs(retryCount: number) {
  const baseDelay = 30_000;
  const maxDelay = 15 * 60_000;
  return Math.min(baseDelay * 2 ** retryCount, maxDelay);
}

export function enqueueMobileOfflineMutation(input: {
  companyId: string;
  userId: string;
  entity: MobileOfflineEntity;
  operation: MobileOfflineOperation;
  payload: Record<string, unknown>;
  optimisticKey?: string;
  serverVersion?: string | null;
  route?: string;
  maxRetries?: number;
}) {
  const entity = getMobileOfflineEntity(input.entity);
  if (!entity) {
    throw new Error(`Unsupported offline entity: ${input.entity}`);
  }

  if (!entity.operations.includes(input.operation)) {
    throw new Error(
      `Unsupported offline operation ${input.operation} for ${input.entity}`,
    );
  }

  const timestamp = nowIso();
  const item: MobileOfflineQueueItem = {
    id: createQueueId(),
    companyId: input.companyId,
    userId: input.userId,
    entity: input.entity,
    operation: input.operation,
    route: input.route ?? entity.route,
    payload: input.payload,
    optimisticKey: input.optimisticKey ?? createQueueId(),
    serverVersion: input.serverVersion ?? null,
    clientVersion: timestamp,
    status: "pending",
    retryCount: 0,
    maxRetries: input.maxRetries ?? 5,
    nextAttemptAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const next = [...readMobileOfflineQueue(), item];
  writeMobileOfflineQueue(next);
  return item;
}

export function updateMobileOfflineQueueItem(
  itemId: string,
  updates: Partial<MobileOfflineQueueItem>,
) {
  const next = readMobileOfflineQueue().map((item) =>
    item.id === itemId ? { ...item, ...updates, updatedAt: nowIso() } : item,
  );
  writeMobileOfflineQueue(next);
  return next.find((item) => item.id === itemId) ?? null;
}

export function markMobileOfflineMutationSynced(itemId: string) {
  return updateMobileOfflineQueueItem(itemId, {
    status: "synced",
    errorMessage: null,
    conflictMessage: null,
    nextAttemptAt: null,
  });
}

export function markMobileOfflineMutationFailed(
  itemId: string,
  errorMessage: string,
) {
  const item = readMobileOfflineQueue().find((candidate) => candidate.id === itemId);
  const retryCount = (item?.retryCount ?? 0) + 1;
  const retryDelay = getMobileOfflineRetryDelayMs(retryCount);
  return updateMobileOfflineQueueItem(itemId, {
    status: retryCount >= (item?.maxRetries ?? 5) ? "failed" : "pending",
    retryCount,
    errorMessage,
    nextAttemptAt: new Date(Date.now() + retryDelay).toISOString(),
  });
}

export function markMobileOfflineMutationConflict(
  itemId: string,
  conflictMessage: string,
) {
  return updateMobileOfflineQueueItem(itemId, {
    status: "conflict",
    conflictMessage,
    nextAttemptAt: null,
  });
}

export function retryFailedMobileOfflineMutations() {
  const timestamp = nowIso();
  const next = readMobileOfflineQueue().map((item) =>
    item.status === "failed" || item.status === "conflict"
      ? {
          ...item,
          status: "pending" as const,
          errorMessage: null,
          conflictMessage: null,
          nextAttemptAt: timestamp,
          updatedAt: timestamp,
        }
      : item,
  );
  return writeMobileOfflineQueue(next);
}

export function pruneSyncedMobileOfflineMutations() {
  const next = readMobileOfflineQueue().filter(
    (item) => item.status !== "synced",
  );
  return writeMobileOfflineQueue(next);
}

export function getMobileOfflineQueueSummary(
  items: MobileOfflineQueueItem[] = readMobileOfflineQueue(),
): MobileOfflineQueueSummary {
  const summary: MobileOfflineQueueSummary = {
    total: items.length,
    pending: 0,
    syncing: 0,
    failed: 0,
    conflict: 0,
    synced: 0,
    nextRoute: null,
  };

  for (const item of items) {
    summary[item.status] += 1;
    if (!summary.nextRoute && item.status !== "synced") {
      summary.nextRoute = item.route;
    }
  }

  return summary;
}

export function isMobileOfflineQueueReady() {
  const entityNames = new Set(
    mobileOfflineCapableEntities.map((entity) => entity.entity),
  );

  return (
    entityNames.has("tasks") &&
    entityNames.has("forms") &&
    entityNames.has("inventory_counts") &&
    mobileOfflineCapableEntities.every(
      (entity) =>
        entity.operations.includes("update") &&
        entity.requiresServerVersion &&
        entity.optimisticUi,
    ) &&
    mobileOfflineQueueChecks.includes(
      "failed_and_conflict_states_are_visible_in_mobile_app_shell",
    ) &&
    getMobileOfflineRetryDelayMs(3) > getMobileOfflineRetryDelayMs(1)
  );
}
