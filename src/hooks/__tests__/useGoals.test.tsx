/* @vitest-environment jsdom */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useGoals } from '../useGoals';

type GoalRow = {
  id: string;
  title: string;
  status: string;
  company_id: string | null;
  owner_id: string | null;
  created_by: string;
  progress: number | null;
};

const responses = vi.hoisted(() => ({
  goals: [] as GoalRow[],
  owners: [] as Array<{ id: string; first_name: string; last_name: string; avatar_url: string | null; company_id: string | null }>,
}));

const supabaseMock = vi.hoisted(() => {
  const createGoalsBuilder = () => {
    const builder: any = {};
    builder.select = vi.fn(() => builder);
    builder.eq = vi.fn(() => builder);
    builder.order = vi.fn(() => Promise.resolve({ data: responses.goals, error: null }));
    return builder;
  };

  const createProfilesBuilder = () => {
    const builder: any = {};
    builder.select = vi.fn(() => builder);
    builder.in = vi.fn(() => builder);
    builder.eq = vi.fn(() => Promise.resolve({ data: responses.owners, error: null }));
    return builder;
  };

  const builders: Record<string, any> = {};

  return {
    builders,
    from: vi.fn((table: string) => {
      if (table === 'goals') {
        const builder = createGoalsBuilder();
        builders.goals = builder;
        return builder;
      }
      if (table === 'profiles') {
        const builder = createProfilesBuilder();
        builders.profiles = builder;
        return builder;
      }
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: supabaseMock.from,
  },
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    profile: {
      companyId: 'company-123',
      userId: 'user-1',
      role: 'manager',
    },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return { wrapper, queryClient };
};

describe('useGoals', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    responses.goals = [
      {
        id: 'goal-valid',
        title: 'Tenant Goal',
        status: 'active',
        company_id: 'company-123',
        owner_id: 'user-1',
        created_by: 'user-1',
        progress: 50,
      },
      {
        id: 'goal-foreign',
        title: 'Foreign Goal',
        status: 'draft',
        company_id: 'other-company',
        owner_id: 'user-9',
        created_by: 'user-9',
        progress: 0,
      },
    ];

    responses.owners = [
      {
        id: 'user-1',
        first_name: 'Alex',
        last_name: 'Smith',
        avatar_url: null,
        company_id: 'company-123',
      },
      {
        id: 'user-9',
        first_name: 'Casey',
        last_name: 'Lee',
        avatar_url: null,
        company_id: 'other-company',
      },
    ];

    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    supabaseMock.from.mockClear();
  });

  it('filters out goals from other companies', async () => {
    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useGoals(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.goals).toHaveLength(1);
    expect(result.current.goals[0].id).toBe('goal-valid');
    expect(warnSpy).toHaveBeenCalledWith(
      '[useGoals] Filtered out goals from other companies',
      JSON.stringify({ removed: 1, companyId: 'company-123' }),
    );

    expect(supabaseMock.from).toHaveBeenCalledWith('goals');
    expect(supabaseMock.builders.goals.eq).toHaveBeenCalledWith('company_id', 'company-123');
    expect(supabaseMock.from).toHaveBeenCalledWith('profiles');
    expect(supabaseMock.builders.profiles.eq).toHaveBeenCalledWith('company_id', 'company-123');

    queryClient.clear();
  });

  it('returns an empty list when there are no goals for the company', async () => {
    responses.goals = [];
    responses.owners = [];

    const { wrapper, queryClient } = createWrapper();
    const { result } = renderHook(() => useGoals(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.goals).toHaveLength(0);
    expect(warnSpy).not.toHaveBeenCalled();

    queryClient.clear();
  });
});
