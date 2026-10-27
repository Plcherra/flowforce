export type ScheduleQueryStatus = "pending" | "error" | "success";

/**
 * A failed schedule load is read-only.
 * Cached rows stay on screen. A first load with no rows stays empty.
 * Sample people and shifts are never filled in.
 */
export function scheduleQueryFailureMode(hasCachedData: boolean): {
  readOnly: boolean;
  clearBoard: boolean;
} {
  return {
    readOnly: true,
    clearBoard: !hasCachedData,
  };
}

/**
 * The board stays read-only only while the latest fetch for this range failed.
 * A later success clears the lock even when React Query keeps the same row object.
 */
export function scheduleBoardIsReadOnly(input: {
  status: ScheduleQueryStatus;
  hasRange: boolean;
}): boolean {
  return input.hasRange && input.status === "error";
}

/**
 * Recovery follows a completed successful fetch, not a new data reference.
 * `dataUpdatedAt` changes on every success, including when the rows did not change.
 */
export function scheduleQueryRecovered(input: {
  status: ScheduleQueryStatus;
  hasData: boolean;
  dataUpdatedAt: number;
}): boolean {
  return input.status === "success" && input.hasData && input.dataUpdatedAt > 0;
}
