/* @vitest-environment jsdom */

import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTasks, TASK_STATUS_TRANSITIONS, type TaskWithRelations } from '@/hooks/useTasks';

const { supabaseMock, syncGoalProgressMock } = vi.hoisted(() => ({
  supabaseMock: {
    from: vi.fn(),
  },
  syncGoalProgressMock: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

vi.mock('@/services/goals/goalProgressService', () => ({
  syncGoalProgress: syncGoalProgressMock,
}));

const companyId = 'company-123';

type ProfileBuilder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
};

const createProfileBuilder = () => {
  const builder: ProfileBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };

  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.single.mockResolvedValue({ data: { company_id: companyId }, error: null });

  return builder;
};

let tasksData: TaskWithRelations[] = [];

const createTasksBuilder = () => {
  const builder: any = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    update: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
    _pendingUpdate: null as Partial<TaskWithRelations> | null,
  };

  builder.select.mockReturnValue(builder);

  builder.eq.mockImplementation((column: string, value: unknown) => {
    if (column === 'company_id') {
      return builder;
    }

    if (column === 'id' && builder._pendingUpdate) {
      const pending = builder._pendingUpdate;
      builder._pendingUpdate = null;

      return {
        select: () => ({
          single: () => {
            const index = tasksData.findIndex((task) => task.id === value);
            if (index !== -1) {
              tasksData[index] = { ...tasksData[index], ...pending };
              return Promise.resolve({ data: { ...tasksData[index] }, error: null });
            }
            return Promise.resolve({ data: null, error: null });
          },
        }),
      };
    }

    return builder;
  });

  builder.order.mockImplementation(async () => ({ data: tasksData, error: null }));

  builder.update.mockImplementation((payload: Partial<TaskWithRelations>) => {
    builder._pendingUpdate = payload;
    return {
      eq: (column: string, value: string) => builder.eq(column, value),
    };
  });

  builder.insert.mockReturnValue({
    select: () => ({
      single: () => Promise.resolve({ data: {}, error: null }),
    }),
  });

  builder.delete.mockReturnValue({
    eq: () => ({ error: null }),
  });

  return builder;
};

const makeTask = (overrides: Partial<TaskWithRelations> & { id: string }): TaskWithRelations => ({
  id: overrides.id,
  title: overrides.title ?? 'Task',
  description: overrides.description ?? null,
  status: overrides.status ?? 'todo',
  priority: overrides.priority ?? 'medium',
  assigned_to: overrides.assigned_to ?? null,
  created_by: overrides.created_by ?? 'user-123',
  department_id: overrides.department_id ?? null,
  due_date: overrides.due_date ?? null,
  estimated_hours: overrides.estimated_hours ?? null,
  actual_hours: overrides.actual_hours ?? null,
  tags: overrides.tags ?? null,
  attachments: overrides.attachments ?? null,
  parent_task_id: overrides.parent_task_id ?? null,
  workflow_id: overrides.workflow_id ?? null,
  created_at: overrides.created_at ?? new Date('2024-01-01T00:00:00.000Z').toISOString(),
  updated_at: overrides.updated_at ?? new Date('2024-01-01T00:00:00.000Z').toISOString(),
  completed_at: overrides.completed_at ?? null,
  goal_id: overrides.goal_id ?? null,
  origin_document_id: overrides.origin_document_id ?? null,
  origin_event_id: overrides.origin_event_id ?? null,
  links: overrides.links ?? [],
  source: overrides.source ?? 'manual',
  company_id: overrides.company_id ?? companyId,
  assigned_profile: overrides.assigned_profile ?? null,
  created_profile: overrides.created_profile ?? null,
  department: overrides.department ?? null,
  goal: overrides.goal ?? null,
});

describe('useTasks', () => {
  beforeEach(() => {
    syncGoalProgressMock.mockReset();
    supabaseMock.from.mockReset();
    tasksData = [];
  });

  it('retains tasks even when related profile joins are null', async () => {
    tasksData = [
      makeTask({ id: 'task-without-profile', created_profile: null, assigned_profile: null }),
      makeTask({
        id: 'task-with-profile',
        created_profile: { first_name: 'Tenant', last_name: 'Owner', company_id: companyId },
      }),
    ];

    const profileBuilder = createProfileBuilder();
    const tasksBuilder = createTasksBuilder();

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'profiles') return profileBuilder;
      if (table === 'tasks') return tasksBuilder;
      throw new Error(`Unexpected table lookup: ${table}`);
    });

    const { result } = renderHook(() => useTasks());

    await waitFor(() => expect(result.current.tasks).toHaveLength(2));
    expect(tasksBuilder.eq).toHaveBeenCalledWith('company_id', companyId);
  });

  it('defines the expected workflow transitions', () => {
    expect(TASK_STATUS_TRANSITIONS.todo).toEqual(expect.arrayContaining(['in_progress', 'cancelled']));
    expect(TASK_STATUS_TRANSITIONS.in_progress).toEqual(
      expect.arrayContaining(['review', 'blocked', 'cancelled', 'todo'])
    );
    expect(TASK_STATUS_TRANSITIONS.review).toEqual(expect.arrayContaining(['done', 'todo', 'cancelled']));
    expect(TASK_STATUS_TRANSITIONS.blocked).toEqual(expect.arrayContaining(['in_progress', 'cancelled']));
    expect(TASK_STATUS_TRANSITIONS.cancelled).toContain('todo');
  });
});
