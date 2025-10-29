import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import {
  buildClosedLoopState,
  type BuildClosedLoopStateParams,
  type ClosedLoopState,
} from '@/services/intelligence/closedLoopEngine';

export interface UseClosedLoopOptions {
  rangeDays?: number;
  aiType?: BuildClosedLoopStateParams['aiType'];
  enabled?: boolean;
}

export interface UseClosedLoopResult {
  data: ClosedLoopState | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<ClosedLoopState | undefined>;
}

export function useClosedLoopState(options: UseClosedLoopOptions = {}): UseClosedLoopResult {
  const { user } = useAuth();
  const enabled = Boolean(user?.id) && (options.enabled ?? true);

  const queryKey = useMemo(
    () => [
      'closed-loop-state',
      user?.id ?? 'anonymous',
      options.rangeDays ?? 14,
      options.aiType ?? 'dashboard',
    ],
    [user?.id, options.rangeDays, options.aiType],
  );

  const query = useQuery({
    queryKey,
    enabled,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!user?.id) return undefined;
      return buildClosedLoopState({
        userId: user.id,
        rangeDays: options.rangeDays,
        aiType: options.aiType,
      });
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: async () => {
      const result = await query.refetch();
      return result.data;
    },
  };
}

export type { ClosedLoopState } from '@/services/intelligence/closedLoopEngine';

