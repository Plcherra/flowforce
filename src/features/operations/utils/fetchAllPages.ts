type PageError = { message: string };

type PageResponse = {
  data: unknown;
  error: PageError | null;
};

export type PagedRows = {
  data: unknown[];
  error: PageError | null;
};

const DEFAULT_PAGE_SIZE = 1000;
const DEFAULT_MAX_ROWS = 100_000;

/**
 * Loads every matching row. A full page is not treated as the complete result.
 * Crossing the row ceiling returns an error with no rows, so a cap is never
 * presented as a finished company metric.
 */
export async function fetchAllPages(
  loadPage: (from: number, to: number) => PromiseLike<PageResponse>,
  options?: { pageSize?: number; maxRows?: number },
): Promise<PagedRows> {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const maxRows = options?.maxRows ?? DEFAULT_MAX_ROWS;
  if (pageSize < 1 || maxRows < 1) {
    return { data: [], error: { message: "Invalid page size" } };
  }

  const rows: unknown[] = [];
  let from = 0;

  while (rows.length < maxRows) {
    const { data, error } = await loadPage(from, from + pageSize - 1);
    if (error) return { data: [], error };
    const page = Array.isArray(data) ? data : [];
    if (page.length === 0) return { data: rows, error: null };
    rows.push(...page);
    if (page.length < pageSize) return { data: rows, error: null };
    from += pageSize;
  }

  return {
    data: [],
    error: { message: "Operations hub query exceeded the row limit" },
  };
}
