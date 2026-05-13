import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryState = {
  eqCalls: Array<{ column: string; value: unknown }>;
  orderCalls: Array<{ column: string; direction?: unknown }>;
};

type TableData = Record<string, any[]>;

vi.mock("@/integrations/supabase/client", () => {
  const tableData: TableData = {};
  const tableStates = new Map<string, QueryState>();

  const resolveColumn = (row: any, column: string): unknown => {
    return column.split(".").reduce<unknown>((value, key) => {
      if (value == null) return undefined;
      if (typeof value !== "object") return undefined;
      return (value as Record<string, unknown>)[key];
    }, row);
  };

  const getFilteredRows = (table: string, state: QueryState): any[] => {
    const rows = tableData[table] ?? [];
    if (state.eqCalls.length === 0) {
      return rows;
    }
    return rows.filter((row) =>
      state.eqCalls.every(
        ({ column, value }) => resolveColumn(row, column) === value,
      ),
    );
  };

  const createBuilder = (table: string) => {
    const state: QueryState = {
      eqCalls: [],
      orderCalls: [],
    };
    tableStates.set(table, state);

    const builder: any = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        state.eqCalls.push({ column, value });
        return builder;
      },
      order: (column: string, direction?: unknown) => {
        state.orderCalls.push({ column, direction });
        return builder;
      },
      limit: () => builder,
      single: () => builder,
      maybeSingle: () => builder,
      then: (
        onFulfilled: (value: any) => any,
        onRejected?: (reason: any) => any,
      ) => {
        const filteredRows = getFilteredRows(table, state);
        const result = { data: filteredRows, error: null };
        return Promise.resolve(result).then(onFulfilled, onRejected);
      },
    };

    return builder;
  };

  const supabase = {
    from: (table: string) => createBuilder(table),
    __setTableRows(table: string, rows: any[]) {
      tableData[table] = rows;
    },
    __getTableState(table: string): QueryState | undefined {
      return tableStates.get(table);
    },
    __reset() {
      tableStates.clear();
      Object.keys(tableData).forEach((key) => delete tableData[key]);
    },
  };

  return {
    __esModule: true,
    supabase,
  };
});

import { supabase } from "@/integrations/supabase/client";
import {
  fetchCourseMetrics,
  fetchEnrollments,
  fetchLearningCatalog,
} from "../learningService";

type SupabaseMock = typeof supabase & {
  __setTableRows: (table: string, rows: any[]) => void;
  __getTableState: (table: string) => QueryState | undefined;
  __reset: () => void;
};

const supabaseMock = supabase as SupabaseMock;

const defaultTimestamps = {
  created: "2025-01-01T00:00:00.000Z",
  updated: "2025-01-02T00:00:00.000Z",
  moduleCreated: "2025-01-03T00:00:00.000Z",
};

const seedLearningData = () => {
  supabaseMock.__setTableRows("learning_courses", [
    {
      id: "course-1",
      slug: "intro-safety",
      title: "Intro to Safety",
      description: "Safety basics",
      category: "Compliance",
      company_id: "company-1",
      level_requirement: 1,
      xp_reward: 100,
      estimated_hours: 4,
      delivery_mode: "self_paced",
      target_roles: ["associate"],
      featured: false,
      certification_code: null,
      created_by: "profile-1",
      created_at: defaultTimestamps.created,
      updated_at: defaultTimestamps.updated,
    },
    {
      id: "course-2",
      slug: "advanced-safety",
      title: "Advanced Safety",
      description: "Safety leadership",
      category: "Compliance",
      company_id: "company-1",
      level_requirement: 2,
      xp_reward: 150,
      estimated_hours: 6,
      delivery_mode: "self_paced",
      target_roles: ["manager"],
      featured: true,
      certification_code: "safety-gold",
      created_by: "profile-2",
      created_at: defaultTimestamps.created,
      updated_at: defaultTimestamps.updated,
    },
    {
      id: "course-3",
      slug: "other-firm-course",
      title: "Other Firm Course",
      description: "For other tenants",
      category: "Compliance",
      company_id: "company-2",
      level_requirement: 1,
      xp_reward: 50,
      estimated_hours: 2,
      delivery_mode: "self_paced",
      target_roles: ["associate"],
      featured: false,
      certification_code: null,
      created_by: "profile-99",
      created_at: defaultTimestamps.created,
      updated_at: defaultTimestamps.updated,
    },
  ]);

  supabaseMock.__setTableRows("learning_modules", [
    {
      id: "module-1",
      course_id: "course-1",
      company_id: "company-1",
      title: "Safety Orientation",
      description: "Orientation module",
      content: "Content A",
      order_index: 1,
      estimated_minutes: 60,
      xp_award: 25,
      created_at: defaultTimestamps.moduleCreated,
    },
    {
      id: "module-2",
      course_id: "course-2",
      company_id: "company-1",
      title: "Leadership Safety",
      description: "Leadership content",
      content: "Content B",
      order_index: 1,
      estimated_minutes: 90,
      xp_award: 35,
      created_at: defaultTimestamps.moduleCreated,
    },
    {
      id: "module-3",
      course_id: "course-3",
      company_id: "company-2",
      title: "External Module",
      description: "Other tenant content",
      content: "Content C",
      order_index: 1,
      estimated_minutes: 45,
      xp_award: 15,
      created_at: defaultTimestamps.moduleCreated,
    },
  ]);

  supabaseMock.__setTableRows("learning_course_metrics", [
    {
      course_id: "course-1",
      title: "Intro to Safety",
      category: "Compliance",
      company_id: "company-1",
      xp_reward: 100,
      estimated_hours: 4,
      active_learners: 12,
      completions: 4,
      avg_progress: 75,
      total_hours_completed: 30,
      total_xp_awarded: 400,
    },
    {
      course_id: "course-3",
      title: "Other Firm Course",
      category: "Compliance",
      company_id: "company-2",
      xp_reward: 50,
      estimated_hours: 2,
      active_learners: 8,
      completions: 2,
      avg_progress: 60,
      total_hours_completed: 10,
      total_xp_awarded: 100,
    },
  ]);

  supabaseMock.__setTableRows("learning_enrollments", [
    {
      id: "enrollment-1",
      course_id: "course-1",
      employee_id: "employee-1",
      company_id: "company-1",
      status: "in_progress",
      progress_percent: 50,
      hours_completed: 2,
      current_module: 1,
      level: 1,
      started_at: defaultTimestamps.created,
      completed_at: null,
      last_activity_at: defaultTimestamps.updated,
      created_at: defaultTimestamps.created,
      updated_at: defaultTimestamps.updated,
    },
    {
      id: "enrollment-2",
      course_id: "course-3",
      employee_id: "employee-1",
      company_id: "company-2",
      status: "completed",
      progress_percent: 100,
      hours_completed: 2,
      current_module: 1,
      level: 1,
      started_at: defaultTimestamps.created,
      completed_at: defaultTimestamps.updated,
      last_activity_at: defaultTimestamps.updated,
      created_at: defaultTimestamps.created,
      updated_at: defaultTimestamps.updated,
    },
  ]);
};

describe("learningService tenant isolation", () => {
  beforeEach(() => {
    supabaseMock.__reset();
    seedLearningData();
  });

  it("restricts fetchLearningCatalog to the active company", async () => {
    const catalog = await fetchLearningCatalog("company-1");

    expect(catalog).toHaveLength(2);
    expect(catalog.map((course) => course.id)).toEqual([
      "course-1",
      "course-2",
    ]);
    expect(
      catalog.every((course) =>
        course.modules.every((module) => module.courseId === course.id),
      ),
    ).toBe(true);
    expect(catalog.find((course) => course.id === "course-3")).toBeUndefined();

    const courseState = supabaseMock.__getTableState("learning_courses");
    const moduleState = supabaseMock.__getTableState("learning_modules");
    const metricsState = supabaseMock.__getTableState(
      "learning_course_metrics",
    );

    expect(courseState?.eqCalls).toContainEqual({
      column: "company_id",
      value: "company-1",
    });
    expect(moduleState?.eqCalls).toContainEqual({
      column: "company_id",
      value: "company-1",
    });
    expect(metricsState?.eqCalls).toContainEqual({
      column: "company_id",
      value: "company-1",
    });
  });

  it("returns only metrics for the requested company", async () => {
    const metrics = await fetchCourseMetrics("company-1");

    expect(metrics).toHaveLength(1);
    expect(metrics[0]?.courseId).toBe("course-1");

    const metricsState = supabaseMock.__getTableState(
      "learning_course_metrics",
    );
    expect(metricsState?.eqCalls).toEqual([
      { column: "company_id", value: "company-1" },
    ]);
  });

  it("scopes fetchEnrollments to the active company", async () => {
    const enrollments = await fetchEnrollments("employee-1", "company-1");

    expect(enrollments).toHaveLength(1);
    expect(enrollments[0]?.id).toBe("enrollment-1");
    const enrollmentState = supabaseMock.__getTableState(
      "learning_enrollments",
    );
    expect(enrollmentState?.eqCalls).toEqual([
      { column: "employee_id", value: "employee-1" },
      { column: "company_id", value: "company-1" },
    ]);
  });

  it("throws when fetchLearningCatalog is invoked without a company id", async () => {
    await expect(fetchLearningCatalog("")).rejects.toThrow(
      /Company context is required/i,
    );
  });

  it("throws when fetchEnrollments is invoked without a company id", async () => {
    await expect(fetchEnrollments("employee-1", "")).rejects.toThrow(
      /Company context is required/i,
    );
  });
});
