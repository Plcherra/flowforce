/**
 * Type utilities for React Query to handle common type issues
 */

/**
 * Type guard to ensure data is an array
 * Useful for React Query results that might be NoInfer<TQueryFnData>
 */
export function asArray<T>(data: T | T[] | undefined | null): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data === undefined || data === null) {
    return [];
  }
  return [data];
}

/**
 * Type guard to ensure data is defined (not null/undefined)
 */
export function asDefined<T>(data: T | null | undefined): T {
  if (data === null || data === undefined) {
    throw new Error('Expected data to be defined but got null/undefined');
  }
  return data;
}

/**
 * Safely extract data from React Query result
 * Returns empty array if data is undefined/null/not an array
 */
export function queryData<T>(data: T | T[] | undefined | null): T[] {
  return asArray(data);
}

/**
 * Type guard to check if value is an array
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * Safely access array methods on potentially undefined/null data
 */
export function safeArrayMap<T, R>(
  data: T[] | undefined | null,
  mapper: (item: T, index: number) => R
): R[] {
  return Array.isArray(data) ? data.map(mapper) : [];
}

export function safeArrayFilter<T>(
  data: T[] | undefined | null,
  predicate: (item: T, index: number) => boolean
): T[] {
  return Array.isArray(data) ? data.filter(predicate) : [];
}

export function safeArrayReduce<T, R>(
  data: T[] | undefined | null,
  reducer: (acc: R, item: T, index: number) => R,
  initialValue: R
): R {
  return Array.isArray(data) ? data.reduce(reducer, initialValue) : initialValue;
}

/**
 * Get length of array safely
 */
export function safeArrayLength<T>(data: T[] | undefined | null): number {
  return Array.isArray(data) ? data.length : 0;
}
