/**
 * Shared query utilities for company-scoped queries
 *
 * Phase 7: Code Duplication - Provides reusable query patterns to reduce duplication
 *
 * Common patterns:
 * - Company-scoped queries (`.eq('company_id', companyId)`)
 * - User-scoped queries (`.eq('user_id', userId)`)
 * - Date-range queries (`.gte()`, `.lte()`)
 */

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useProfile } from "../useProfile";
import { useAuth } from "../useAuth";
import { supabase } from "@/integrations/supabase/client";
type SupabaseQueryBuilder = any;

interface UseCompanyScopedQueryOptions<TData> {
  queryKey: readonly unknown[];
  table: string;
  select?: string;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  companyId?: string | null;
  additionalFilters?: (
    query: SupabaseQueryBuilder,
  ) => SupabaseQueryBuilder;
  orderBy?: { column: string; ascending?: boolean };
}

const DEFAULT_STALE_TIME = 5 * 60 * 1000; // 5 minutes
const DEFAULT_GC_TIME = 10 * 60 * 1000; // 10 minutes

/**
 * useCompanyScopedQuery - Hook for company-scoped Supabase queries
 *
 * Automatically adds `.eq('company_id', companyId)` filter and provides
 * consistent caching defaults. Reduces code duplication across hooks.
 *
 * @example
 * ```typescript
 * const { data, isLoading } = useCompanyScopedQuery<Employee>({
 *   queryKey: ['employees'],
 *   table: 'profiles',
 *   select: '*',
 *   additionalFilters: (q) => q.eq('employment_status', 'active'),
 * });
 * ```
 */
export function useCompanyScopedQuery<TData>({
  queryKey,
  table,
  select = "*",
  enabled = true,
  staleTime = DEFAULT_STALE_TIME,
  gcTime = DEFAULT_GC_TIME,
  companyId: companyIdOverride,
  additionalFilters,
  orderBy,
}: UseCompanyScopedQueryOptions<TData>) {
  const { profile } = useProfile();
  const companyId =
    companyIdOverride ?? profile?.companyId ?? profile?.company_id ?? null;

  return useQuery<TData[]>({
    queryKey: [...queryKey, companyId],
    enabled: enabled && Boolean(companyId),
    staleTime,
    gcTime,
    queryFn: async () => {
      if (!companyId) {
        throw new Error("Company ID is required");
      }

      let query = supabase
        .from(table)
        .select(select)
        .eq("company_id", companyId);

      if (additionalFilters) {
        query = additionalFilters(query);
      }

      if (orderBy) {
        query = query.order(orderBy.column, {
          ascending: orderBy.ascending ?? true,
        });
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data ?? []) as TData[];
    },
  });
}

/**
 * useUserScopedQuery - Hook for user-scoped Supabase queries
 *
 * Automatically adds user filter (`.eq('user_id', userId)` or `.eq('created_by', userId)`).
 *
 * @example
 * ```typescript
 * const { data, isLoading } = useUserScopedQuery<TimeEntry>({
 *   queryKey: ['time-entries'],
 *   table: 'time_entries',
 *   userIdField: 'user_id',
 * });
 * ```
 */
export function useUserScopedQuery<TData>({
  queryKey,
  table,
  select = "*",
  userIdField = "user_id",
  enabled = true,
  staleTime = DEFAULT_STALE_TIME,
  gcTime = DEFAULT_GC_TIME,
  userId: userIdOverride,
  additionalFilters,
  orderBy,
}: {
  queryKey: readonly unknown[];
  table: string;
  select?: string;
  userIdField?: "user_id" | "created_by" | "sender_id" | "requester_id";
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  userId?: string | null;
  additionalFilters?: (
    query: SupabaseQueryBuilder,
  ) => SupabaseQueryBuilder;
  orderBy?: { column: string; ascending?: boolean };
}) {
  // Phase 7: Use useAuth hook properly
  const { user } = useAuth();
  const userId = userIdOverride ?? user?.id ?? null;

  return useQuery<TData[]>({
    queryKey: [...queryKey, userId],
    enabled: enabled && Boolean(userId),
    staleTime,
    gcTime,
    queryFn: async () => {
      if (!userId) {
        throw new Error("User ID is required");
      }

      let query = supabase.from(table).select(select).eq(userIdField, userId);

      if (additionalFilters) {
        query = additionalFilters(query);
      }

      if (orderBy) {
        query = query.order(orderBy.column, {
          ascending: orderBy.ascending ?? true,
        });
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data ?? []) as TData[];
    },
  });
}
