import "@tanstack/react-query";
import type { DefaultError, QueryKey } from "@tanstack/query-core";

declare module "@tanstack/react-query" {
  interface UseQueryOptions<
    TQueryFnData = unknown,
    TError = DefaultError,
    TData = TQueryFnData,
    TQueryKey extends QueryKey = QueryKey,
  > {
    onError?: (error: TError) => void;
    suspense?: boolean;
  }
}
