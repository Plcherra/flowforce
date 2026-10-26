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
