/**
 * useSupabaseQuery - React Query helper for Supabase queries with automatic company_id filtering
 *
 * Phase 4 Optimization: Provides consistent caching and company_id injection across hooks
 *
 * Features:
 * - Automatic company_id injection from profile context
 * - Consistent staleTime and gcTime defaults
 * - Type-safe query keys
 * - Memoized responses
 */

import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import { useProfile } from "./useProfile";
import { supabase } from "@/integrations/supabase/client";
import type { PostgrestFilterBuilder } from "@supabase/postgrest-js";
import type { SupabaseClient } from "@supabase/supabase-js";

type QueryBuilder<T> = (
  client: SupabaseClient,
  companyId: string | null,
) => PostgrestFilterBuilder<any, any, T[], unknown>;

interface UseSupabaseQueryOptions<TData, TError = Error> {
  queryKey: readonly unknown[];
  queryFn: QueryBuilder<TData>;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  companyId?: string | null; // Optional override
  select?: (data: TData[]) => TData[];
}

const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const DEFAULT_GC_TIME = 10 * 60 * 1000; // 10 minutes

export function useSupabaseQuery<TData, TError = Error>(
  options: UseSupabaseQueryOptions<TData, TError>,
): UseQueryResult<TData[], TError> {
  const { profile } = useProfile();
  const companyId =
    options.companyId ?? profile?.companyId ?? profile?.company_id ?? null;

  return useQuery<TData[], TError>({
    queryKey: [...options.queryKey, companyId],
    enabled: options.enabled !== false && Boolean(companyId),
    queryFn: async () => {
      const queryBuilder = options.queryFn(supabase, companyId);
      const { data, error } = await queryBuilder;

      if (error) {
        throw error;
      }

      const result = (data ?? []) as TData[];
      return options.select ? options.select(result) : result;
    },
    staleTime: options.staleTime ?? DEFAULT_STALE_TIME,
    gcTime: options.gcTime ?? DEFAULT_GC_TIME,
  });
}

/**
 * Example usage:
 *
 * const { data: employees, isLoading } = useSupabaseQuery<Employee>({
 *   queryKey: ['employees'],
 *   queryFn: (client, companyId) =>
 *     client
 *       .from('profiles')
 *       .select('*')
 *       .eq('company_id', companyId)
 *       .eq('employment_status', 'active'),
 * });
 */
