/* @vitest-environment jsdom */

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTasks, type TaskWithRelations } from '@/hooks/useTasks';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    from: vi.fn(),
  },
}));

let profileBuilder: Builder;
let tasksBuilder: Builder;

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseMock,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-123' } }),
}));

type Builder = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  single?: ReturnType<typeof vi.fn>;
  order?: ReturnType<typeof vi.fn>;
};

const companyId = 'company-123';

const createProfileBuilder = (response: { data: { company_id: string } | null; error: unknown }) => {
  const builder: Builder = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };

  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.single!.mockResolvedValue(response);

  return builder;
};

const createTasksBuilder = (response: TaskWithRelations[]) => {
  const builder: Builder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  };

  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.order!.mockResolvedValue({ data: response, error: null });

  return builder;
};

const makeTask = (overrides: Partial<TaskWithRelations> & { id: string }): TaskWithRelations => {
  const base: TaskWithRelations = {
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
    assigned_profile: overrides.assigned_profile ?? null,
    created_profile: overrides.created_profile ?? null,
    department: overrides.department ?? null,
    goal: overrides.goal ?? null,
  };

  return base;
};

describe('useTasks', () => {
  beforeEach(() => {
    supabaseMock.from.mockReset();

    profileBuilder = createProfileBuilder({
      data: { company_id: companyId },
      error: null,
    });

    tasksBuilder = createTasksBuilder([
      makeTask({
        id: 'task-company',
        created_profile: { first_name: 'Tenant', last_name: 'Owner', company_id: companyId },
      }),
      makeTask({
        id: 'task-foreign',
        created_profile: { first_name: 'Other', last_name: 'Tenant', company_id: 'other-company' },
      }),
    ]);

    supabaseMock.from.mockImplementation((table: string) => {
      if (table === 'profiles') return profileBuilder;
      if (table === 'tasks') return tasksBuilder;
      throw new Error(`Unexpected table: ${table}`);
    });
  });

  it('filters tasks to the active company', async () => {
    const { result } = renderHook(() => useTasks());

    await waitFor(() => expect(result.current.tasks).toHaveLength(1));
    expect(result.current.tasks[0].id).toBe('task-company');

    expect(tasksBuilder.eq).toHaveBeenCalledWith('profiles!tasks_created_by_fkey.company_id', companyId);
  });
});
