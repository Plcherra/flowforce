/* @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { useTaskNotifications } from '@/hooks/useTaskNotifications';

const {
  supabaseMock,
  channelMock,
  fetchNotificationsForUserMock,
  fetchTasksDueSoonMock,
  fetchOverdueTasksMock,
  findRecentNotificationMock,
  createTaskNotificationMock,
} = vi.hoisted(() => {
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
    fetchNotificationsForUserMock: vi.fn(),
    fetchTasksDueSoonMock: vi.fn(),
    fetchOverdueTasksMock: vi.fn(),
    findRecentNotificationMock: vi.fn(),
    createTaskNotificationMock: vi.fn(),
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

vi.mock('@/repositories/taskNotificationsRepository', () => ({
  fetchNotificationsForUser: fetchNotificationsForUserMock,
  fetchTasksDueSoon: fetchTasksDueSoonMock,
  fetchOverdueTasks: fetchOverdueTasksMock,
  findRecentNotification: findRecentNotificationMock,
  createTaskNotification: createTaskNotificationMock,
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
  deleteNotification: vi.fn(),
}));

describe('useTaskNotifications', () => {
  const renderHookWithClient = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return renderHook(() => useTaskNotifications(), {
      wrapper: ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
    });
  };

  beforeEach(() => {
    supabaseMock.channel.mockClear();
    supabaseMock.removeChannel.mockReset();
    channelMock.on.mockReset();
    channelMock.on.mockReturnValue(channelMock as any);
    channelMock.subscribe.mockReturnValue({});
    fetchNotificationsForUserMock.mockResolvedValue([]);
    fetchTasksDueSoonMock.mockResolvedValue([]);
    fetchOverdueTasksMock.mockResolvedValue([]);
    findRecentNotificationMock.mockResolvedValue(null);
    createTaskNotificationMock.mockResolvedValue({
      id: 'notification-1',
      user_id: 'user-123',
      task_id: 'task-1',
      type: 'task_due_soon',
      title: 'Task Due Soon',
      message: 'Task is due soon',
      metadata: null,
      read_at: null,
      created_at: new Date().toISOString(),
    });
  });

  it('runs the due-task sweep immediately on mount', async () => {
    renderHookWithClient();

    await waitFor(() => {
      expect(fetchTasksDueSoonMock).toHaveBeenCalled();
      expect(fetchOverdueTasksMock).toHaveBeenCalled();
    });
  });
});
