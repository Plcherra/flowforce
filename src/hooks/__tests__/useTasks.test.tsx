/* @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useTasks,
  TASK_STATUS_TRANSITIONS,
  type TaskWithRelations,
} from "@/hooks/useTasks";

const {
  fetchCompanyIdForUserMock,
  fetchTasksByCompanyMock,
  insertTaskMock,
  updateTaskRowMock,
  deleteTaskRowMock,
  fetchTaskCommentsMock,
  insertTaskCommentMock,
  fetchTaskTimelineMock,
  syncGoalProgressMock,
} = vi.hoisted(() => ({
  fetchCompanyIdForUserMock: vi.fn(),
  fetchTasksByCompanyMock: vi.fn(),
  insertTaskMock: vi.fn(),
  updateTaskRowMock: vi.fn(),
  deleteTaskRowMock: vi.fn(),
  fetchTaskCommentsMock: vi.fn(),
  insertTaskCommentMock: vi.fn(),
  fetchTaskTimelineMock: vi.fn(),
  syncGoalProgressMock: vi.fn(),
}));

vi.mock("@/repositories/companyRepository", () => ({
  fetchCompanyIdForUser: fetchCompanyIdForUserMock,
}));

vi.mock("@/repositories/tasksRepository", async () => {
  const actual = await vi.importActual<
    typeof import("@/repositories/tasksRepository")
  >("@/repositories/tasksRepository");
  return {
    ...actual,
    fetchTasksByCompany: fetchTasksByCompanyMock,
    insertTask: insertTaskMock,
    updateTaskRow: updateTaskRowMock,
    deleteTaskRow: deleteTaskRowMock,
    fetchTaskComments: fetchTaskCommentsMock,
    insertTaskComment: insertTaskCommentMock,
  };
});

vi.mock("@/repositories/taskActivitiesRepository", () => ({
  fetchTaskTimeline: fetchTaskTimelineMock,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-123" } }),
}));

vi.mock("@/services/goals/goalProgressService", () => ({
  syncGoalProgress: syncGoalProgressMock,
}));

const companyId = "company-123";

const makeTask = (
  overrides: Partial<TaskWithRelations> & { id: string },
): TaskWithRelations => ({
  id: overrides.id,
  title: overrides.title ?? "Task",
  description: overrides.description ?? null,
  status: overrides.status ?? "todo",
  priority: overrides.priority ?? "medium",
  assigned_to: overrides.assigned_to ?? null,
  created_by: overrides.created_by ?? "user-123",
  department_id: overrides.department_id ?? null,
  due_date: overrides.due_date ?? null,
  estimated_hours: overrides.estimated_hours ?? null,
  actual_hours: overrides.actual_hours ?? null,
  tags: overrides.tags ?? null,
  attachments: overrides.attachments ?? null,
  parent_task_id: overrides.parent_task_id ?? null,
  workflow_id: overrides.workflow_id ?? null,
  created_at:
    overrides.created_at ?? new Date("2024-01-01T00:00:00.000Z").toISOString(),
  updated_at:
    overrides.updated_at ?? new Date("2024-01-01T00:00:00.000Z").toISOString(),
  completed_at: overrides.completed_at ?? null,
  goal_id: overrides.goal_id ?? null,
  origin_document_id: overrides.origin_document_id ?? null,
  origin_event_id: overrides.origin_event_id ?? null,
  links: overrides.links ?? [],
  source: overrides.source ?? "manual",
  company_id: overrides.company_id ?? companyId,
  assigned_profile: overrides.assigned_profile ?? null,
  created_profile: overrides.created_profile ?? null,
  department: overrides.department ?? null,
  goal: overrides.goal ?? null,
});

describe("useTasks", () => {
  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  beforeEach(() => {
    fetchCompanyIdForUserMock.mockReset();
    fetchTasksByCompanyMock.mockReset();
    insertTaskMock.mockReset();
    updateTaskRowMock.mockReset();
    deleteTaskRowMock.mockReset();
    fetchTaskCommentsMock.mockReset();
    insertTaskCommentMock.mockReset();
    fetchTaskTimelineMock.mockReset();
    syncGoalProgressMock.mockReset();
  });

  it("retains tasks even when related profile joins are null", async () => {
    const tasksData: TaskWithRelations[] = [
      makeTask({
        id: "task-without-profile",
        created_profile: null,
        assigned_profile: null,
      }),
      makeTask({
        id: "task-with-profile",
        created_profile: {
          first_name: "Tenant",
          last_name: "Owner",
          company_id: companyId,
        },
      }),
    ];

    fetchCompanyIdForUserMock.mockResolvedValue(companyId);
    fetchTasksByCompanyMock.mockResolvedValue(tasksData);

    const { result } = renderHook(() => useTasks(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.tasks).toHaveLength(2));
    expect(fetchCompanyIdForUserMock).toHaveBeenCalled();
    expect(fetchTasksByCompanyMock).toHaveBeenCalledWith(companyId);
  });

  it("defines the expected workflow transitions", () => {
    expect(TASK_STATUS_TRANSITIONS.todo).toEqual(
      expect.arrayContaining(["in_progress", "cancelled"]),
    );
    expect(TASK_STATUS_TRANSITIONS.in_progress).toEqual(
      expect.arrayContaining(["review", "blocked", "cancelled", "todo"]),
    );
    expect(TASK_STATUS_TRANSITIONS.review).toEqual(
      expect.arrayContaining(["done", "todo", "cancelled"]),
    );
    expect(TASK_STATUS_TRANSITIONS.blocked).toEqual(
      expect.arrayContaining(["in_progress", "cancelled"]),
    );
    expect(TASK_STATUS_TRANSITIONS.cancelled).toContain("todo");
  });
});
