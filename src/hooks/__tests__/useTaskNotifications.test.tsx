/* @vitest-environment jsdom */

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';

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

const createNotificationsBuilder = () => {
  const builder: any = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };

  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.limit.mockResolvedValue({ data: [], error: null });

  return builder;
};

const createTasksDueBuilder = () => {
  const builder: any = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
    lte: vi.fn(),
    lt: vi.fn(),
    neq: vi.fn(),
    _neqCalls: 0,
  };

  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.gte.mockReturnValue(builder);
  builder.lte.mockReturnValue(builder);
  builder.lt.mockReturnValue(builder);
  builder.neq.mockImplementation(() => {
    builder._neqCalls += 1;
    if (builder._neqCalls >= 3) {
      return Promise.resolve({ data: [], error: null });
    }
    return builder;
  });

  return builder;
};

describe('useTaskNotifications', () => {
  beforeEach(() => {
    supabaseMock.from.mockReset();
    supabaseMock.channel.mockClear();
    channelMock.on.mockReset();
    channelMock.on.mockReturnValue(channelMock as any);
    channelMock.subscribe.mockReturnValue({});
  });

  afterEach(() => {});

  it('runs the due-task sweep immediately on mount', async () => {
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'task_notifications') {
        return createNotificationsBuilder();
      }

      if (table === 'tasks') {
        return createTasksDueBuilder();
      }

      throw new Error(`Unexpected table query: ${table}`);
    });

    renderHook(() => useTaskNotifications());

    await waitFor(() => {
      const taskCalls = supabaseMock.from.mock.calls.filter(([table]) => table === 'tasks');
      expect(taskCalls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
