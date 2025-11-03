import { renderHook } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import { useGoals } from '@/hooks/useGoals';

const {
  useQueryMock,
  useMutationMock,
  invalidateQueriesMock,
} = vi.hoisted(() => ({
  useQueryMock: vi.fn(),
  useMutationMock: vi.fn(),
  invalidateQueriesMock: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: useQueryMock,
  useMutation: useMutationMock,
  useQueryClient: () => ({
    invalidateQueries: invalidateQueriesMock,
  }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: {
      companyId: 'company-1',
      userId: 'user-1',
      firstName: 'Taylor',
      lastName: 'Rivera',
    },
  }),
}));

describe('useGoals', () => {
  beforeEach(() => {
    const defaultMutation = {
      mutateAsync: vi.fn(),
      isPending: false,
    };

    useQueryMock.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    });

    useMutationMock.mockReturnValue(defaultMutation);
  });

  it('returns default stats when no goals are present', () => {
    const { result } = renderHook(() => useGoals());

    expect(result.current.stats).toEqual({
      total: 0,
      active: 0,
      completed: 0,
      drafts: 0,
      averageProgress: 0,
    });
  });

  it('derives progress using calculateGoalProgress helper', () => {
    const { result } = renderHook(() => useGoals());
    const mockGoal = {
      id: 'g-1',
      company_id: 'company-1',
      created_by: 'user-1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      title: 'Launch onboarding wizard',
      description: null,
      status: 'active',
      progress: 42,
      priority: 'high',
      reward_type: null,
      reward_details: null,
      target_completion_date: null,
      completed_at: null,
    } as const;

    expect(result.current.calculateGoalProgress(mockGoal)).toBe(42);
  });
});
