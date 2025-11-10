/* @vitest-environment jsdom */

import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TaskActivityFeed } from '../TaskActivityFeed';

const { supabaseMock, channelMock } = vi.hoisted(() => {
  const channel = {
    on: vi.fn(),
    subscribe: vi.fn(),
  };

  return {
    supabaseMock: {
      from: vi.fn(),
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    },
    channelMock: channel,
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
};

const companyId = 'company-123';

const createProfileBuilder = () => {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };

  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.single.mockResolvedValue({ data: { company_id: companyId }, error: null });

  return builder;
};

const createActivitiesBuilder = (data: any[]): Builder => {
  const builder: Builder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };

  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.limit.mockResolvedValue({ data, error: null });

  return builder;
};

describe('TaskActivityFeed', () => {
  beforeEach(() => {
    supabaseMock.from.mockReset();
    supabaseMock.channel.mockClear();
    supabaseMock.removeChannel.mockReset();
    channelMock.on.mockReset();
    channelMock.on.mockReturnValue(channelMock as any);
    channelMock.subscribe.mockReturnValue({});
  });

  afterEach(() => {
    cleanup();
  });

  it('requests scoped activity data and subscribes to permitted tasks only', async () => {
    const profileBuilder = createProfileBuilder();
    const activities = [
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
    ];

    const activitiesBuilder = createActivitiesBuilder(activities);

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'profiles') return profileBuilder;
      if (table === 'task_activities') return activitiesBuilder;
      throw new Error(`Unexpected table requested: ${table}`);
    });

    render(<TaskActivityFeed />);

    await waitFor(() => {
      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    expect(activitiesBuilder.eq).toHaveBeenCalledWith('company_id', companyId);

    expect(channelMock.on).toHaveBeenCalledTimes(1);
    const [, params] = channelMock.on.mock.calls[0];
    expect(params).toMatchObject({
      filter: `company_id=eq.${companyId}`,
      table: 'task_activities',
      event: 'INSERT',
    });
  });
});
