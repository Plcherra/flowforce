/**
 * Utility functions for pagination
 */

/**
 * Get paginated items
 */
export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize: number,
): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
  totalRecords: number,
  page: number,
  pageSize: number,
): {
  totalPages: number;
  displayRangeStart: number;
  displayRangeEnd: number;
  hasResults: boolean;
} {
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const hasResults = totalRecords > 0;
  const displayRangeStart = hasResults ? (page - 1) * pageSize + 1 : 0;
  const displayRangeEnd = hasResults
    ? Math.min(page * pageSize, totalRecords)
    : 0;

  return {
    totalPages,
    displayRangeStart,
    displayRangeEnd,
    hasResults,
  };
}

/**
 * Generate pagination sequence (for ellipsis display)
 */
export function generatePaginationSequence(
  page: number,
  totalPages: number,
): Array<number | "start-ellipsis" | "end-ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const sequence: Array<number | "start-ellipsis" | "end-ellipsis"> = [1];

  let start = Math.max(2, page - 1);
  let end = Math.min(totalPages - 1, page + 1);

  if (start > 2) {
    sequence.push("start-ellipsis");
  }

  for (let current = start; current <= end; current += 1) {
    sequence.push(current);
  }

  if (end < totalPages - 1) {
    sequence.push("end-ellipsis");
  }

  sequence.push(totalPages);
  return sequence;
}
