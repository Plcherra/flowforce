/* @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TaskActivityFeed } from '../TaskActivityFeed';

const { supabaseMock, channelMock, fetchCompanyIdForUserMock, fetchTaskActivitiesForCompanyMock } = vi.hoisted(
  () => {
    const channel = {
      on: vi.fn(),
      subscribe: vi.fn(),
    };

    return {
      supabaseMock: {
        channel: vi.fn(() => channel),
        removeChannel: vi.fn(),
      },
      channelMock: channel,
      fetchCompanyIdForUserMock: vi.fn(),
      fetchTaskActivitiesForCompanyMock: vi.fn(),
    };
  }
);

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

vi.mock('@/repositories/companyRepository', () => ({
  fetchCompanyIdForUser: fetchCompanyIdForUserMock,
}));

vi.mock('@/repositories/taskActivitiesRepository', () => ({
  fetchTaskActivitiesForCompany: fetchTaskActivitiesForCompanyMock,
}));

const companyId = 'company-123';

describe('TaskActivityFeed', () => {
  const renderWithClient = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return render(
      <QueryClientProvider client={queryClient}>
        <TaskActivityFeed />
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    supabaseMock.channel.mockClear();
    supabaseMock.removeChannel.mockReset();
    channelMock.on.mockReset();
    channelMock.on.mockReturnValue(channelMock as any);
    channelMock.subscribe.mockReturnValue({});
    fetchCompanyIdForUserMock.mockReset();
    fetchTaskActivitiesForCompanyMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('requests scoped activity data and subscribes to permitted tasks only', async () => {
    fetchCompanyIdForUserMock.mockResolvedValue(companyId);
    fetchTaskActivitiesForCompanyMock.mockResolvedValue([
      {
        id: 'activity-1',
        action_type: 'task_created',
        created_at: new Date('2024-01-01T00:00:00.000Z').toISOString(),
        description: 'Task created',
        metadata: null,
        task_id: 'task-allowed',
        user_id: 'actor-1',
        company_id: companyId,
        actor: {
          first_name: 'Jane',
          last_name: 'Operator',
        },
      },
    ]);

    renderWithClient();

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    expect(fetchCompanyIdForUserMock).toHaveBeenCalled();
    expect(fetchTaskActivitiesForCompanyMock).toHaveBeenCalledWith(companyId);

    expect(channelMock.on).toHaveBeenCalledTimes(1);
    const [, params] = channelMock.on.mock.calls[0];
    expect(params).toMatchObject({
      filter: `company_id=eq.${companyId}`,
      table: 'task_activities',
      event: 'INSERT',
    });
  });
});
