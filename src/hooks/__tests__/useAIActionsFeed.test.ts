import { act, renderHook } from '@testing-library/react';
import { describe, expect, beforeEach, afterEach, it, vi } from 'vitest';

import { useAIActionsFeed } from '@/hooks/useAIActionsFeed';

const useTasksMock = vi.fn();
const useGoalsMock = vi.fn();
const useRemindersMock = vi.fn();
const useTaskNotificationsMock = vi.fn();
const useProfileMock = vi.fn();
const useSchedulingConsolidatedMock = vi.fn();
const useExpensesMock = vi.fn();

vi.mock('@/hooks/useTasks', () => ({
  useTasks: () => useTasksMock(),
}));

vi.mock('@/hooks/useGoals', () => ({
  useGoals: () => useGoalsMock(),
}));

vi.mock('@/hooks/useReminders', () => ({
  useReminders: () => useRemindersMock(),
}));

vi.mock('@/features/tasks', () => ({
  useTaskNotifications: () => useTaskNotificationsMock(),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => useProfileMock(),
}));

vi.mock('@/hooks/scheduling/useSchedulingConsolidated', () => ({
  useSchedulingConsolidated: (params: unknown) => useSchedulingConsolidatedMock(params),
}));

vi.mock('@/hooks/useExpenses', () => ({
  useExpenses: () => useExpensesMock(),
}));

const defaultProfileValue = {
  profile: {
    userId: 'user-1',
    companyId: 'company-1',
  },
  loading: false,
  error: null,
  refreshProfile: vi.fn(),
  refetchProfile: vi.fn(),
};

const createSchedulingResult = (overrides: Record<string, unknown> = {}) => ({
  shifts: [],
  assignments: [],
  timeOffRequests: [],
  unavailability: [],
  vendorEvents: [],
  teamMembers: [],
  loading: false,
  error: null,
  refetchAll: vi.fn().mockResolvedValue(undefined),
  assign: vi.fn(),
  unassign: vi.fn(),
  upsertShift: vi.fn(),
  upsertVendorEvent: vi.fn(),
  isUsingFallbackData: false,
  ...overrides,
});

const createExpensesResult = (overrides: Record<string, unknown> = {}) => ({
  data: [],
  isLoading: false,
  refetch: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

const baseTasksResult = {
  tasks: [],
  loading: false,
  createTask: vi.fn(),
  refetchTasks: vi.fn().mockResolvedValue(undefined),
};

const baseGoalsResult = {
  goals: [],
  loading: false,
  calculateGoalProgress: vi.fn().mockReturnValue(0),
  refetchGoals: vi.fn().mockResolvedValue(undefined),
};

const baseRemindersResult = {
  reminders: [],
  loading: false,
  markAsCompleted: vi.fn(),
  snoozeReminder: vi.fn(),
  refetchReminders: vi.fn().mockResolvedValue(undefined),
};

const baseNotificationsResult = {
  notifications: [],
  unreadCount: 0,
  loading: false,
  markAllAsRead: vi.fn(),
  refetchNotifications: vi.fn().mockResolvedValue(undefined),
};

describe('useAIActionsFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProfileMock.mockReturnValue(defaultProfileValue);
    useTasksMock.mockReturnValue(baseTasksResult);
    useGoalsMock.mockReturnValue(baseGoalsResult);
    useRemindersMock.mockReturnValue(baseRemindersResult);
    useTaskNotificationsMock.mockReturnValue(baseNotificationsResult);
    useSchedulingConsolidatedMock.mockReturnValue(createSchedulingResult());
    useExpensesMock.mockReturnValue(createExpensesResult());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('skips scheduling and expenses refresh when no company context is available', async () => {
    const schedulingRefetch = vi.fn().mockResolvedValue(undefined);
    const expensesRefetch = vi.fn().mockResolvedValue(undefined);

    useProfileMock.mockReturnValue({
      ...defaultProfileValue,
      profile: {
        userId: 'user-1',
        companyId: null,
      },
    });

    useTasksMock.mockReturnValue({
      ...baseTasksResult,
      tasks: [
        {
          id: 'task-1',
          title: 'Follow up',
          due_date: new Date().toISOString(),
          status: 'open',
        },
      ],
    });

    useSchedulingConsolidatedMock.mockReturnValue(
      createSchedulingResult({
        refetchAll: schedulingRefetch,
        shifts: [
          {
            id: 'shift-1',
            start_time: new Date().toISOString(),
            assignments: [],
            required_headcount: 2,
          },
        ],
      }),
    );

    useExpensesMock.mockReturnValue(
      createExpensesResult({
        refetch: expensesRefetch,
        data: [
          {
            id: 'expense-1',
            amount: 500,
            expense_date: new Date().toISOString(),
            category: 'Travel',
          },
        ],
      }),
    );

    const { result } = renderHook(() => useAIActionsFeed());

    expect(useSchedulingConsolidatedMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(result.current.items).toEqual([]);

    await act(async () => {
      await result.current.refresh();
    });

    expect(schedulingRefetch).not.toHaveBeenCalled();
    expect(expensesRefetch).not.toHaveBeenCalled();
  });

  it('enables scheduling and expenses refresh when company context exists', async () => {
    const schedulingRefetch = vi.fn().mockResolvedValue(undefined);
    const expensesRefetch = vi.fn().mockResolvedValue(undefined);

    useSchedulingConsolidatedMock.mockReturnValue(
      createSchedulingResult({ refetchAll: schedulingRefetch }),
    );

    useExpensesMock.mockReturnValue(
      createExpensesResult({
        refetch: expensesRefetch,
      }),
    );

    const { result } = renderHook(() => useAIActionsFeed());

    expect(useSchedulingConsolidatedMock).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );

    await act(async () => {
      await result.current.refresh();
    });

    expect(schedulingRefetch).toHaveBeenCalled();
    expect(expensesRefetch).toHaveBeenCalled();
  });
});
