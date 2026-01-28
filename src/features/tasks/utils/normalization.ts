/**
 * Utility functions for normalizing task status and priority
 */

import { normalizeTaskStatus } from "@/hooks/useTasks";
import type { KnownTaskStatus, KnownTaskPriority } from "../types/filters";
import { KNOWN_STATUSES, KNOWN_PRIORITIES } from "../types/filters";

/**
 * Normalize task status to known status or "other"
 */
export function normalizeStatus(
  status: string | null | undefined,
): KnownTaskStatus | "other" {
  const normalized = normalizeTaskStatus(status);
  if (normalized && KNOWN_STATUSES.includes(normalized as KnownTaskStatus)) {
    return normalized as KnownTaskStatus;
  }
  return "other";
}

/**
 * Normalize task priority to known priority or "other"
 */
export function normalizePriority(
  priority: string | null | undefined,
): KnownTaskPriority | "other" {
  if (KNOWN_PRIORITIES.includes((priority ?? "") as KnownTaskPriority)) {
    return priority as KnownTaskPriority;
  }
  return "other";
}
