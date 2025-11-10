import { useMemo } from 'react';

/**
 * Splits a list of IDs into chunks and delegates fetching to the provided async function.
 * Returns a memoized array of results once every chunk resolves.
 */
export function useChunkedSupabaseQuery<T>(
  ids: string[],
  fetcher: (chunk: string[]) => Promise<T[]>,
  chunkSize = 100,
) {
  return useMemo(() => {
    if (!ids.length) return [];

    const uniqueIds = Array.from(new Set(ids));
    const chunks: string[][] = [];
    for (let index = 0; index < uniqueIds.length; index += chunkSize) {
      chunks.push(uniqueIds.slice(index, index + chunkSize));
    }

    return {
      chunks,
      fetchAll: async () => {
        const results = await Promise.all(chunks.map((chunk) => fetcher(chunk)));
        return results.flat();
      },
    };
  }, [ids, fetcher, chunkSize]);
}
