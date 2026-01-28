import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  allowEdit,
  getLockStateForWeek,
  computeAutoLockThreshold,
  type LockEngineDeps,
} from "@/availability/lockEngine";

const basePrefs = {
  id: "org-1",
  availability_lock_mode: "open" as const,
  auto_lock_day_of_week: 4,
  auto_lock_hour: 17,
};

const makeDeps = (overrides: Partial<LockEngineDeps> = {}): LockEngineDeps => ({
  getOrgPref: overrides.getOrgPref ?? (async () => basePrefs),
  getApprovedExceptions: overrides.getApprovedExceptions ?? (async () => []),
  hasApprovedException: overrides.hasApprovedException ?? (async () => false),
});

describe("availability lock engine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows editing when mode is open", async () => {
    const deps = makeDeps({
      getOrgPref: async () => ({
        ...basePrefs,
        availability_lock_mode: "open" as const,
      }),
    });

    const result = await allowEdit({
      orgId: "org-1",
      employeeId: "emp-1",
      date: "2025-10-06",
      deps,
    });

    expect(result).toBe(true);
  });

  it("denies editing when locked and no exception", async () => {
    const deps = makeDeps({
      getOrgPref: async () => ({
        ...basePrefs,
        availability_lock_mode: "lock" as const,
      }),
    });

    const result = await allowEdit({
      orgId: "org-1",
      employeeId: "emp-1",
      date: "2025-10-06",
      deps,
    });

    expect(result).toBe(false);
  });

  it("allows editing when locked but employee has approved exception", async () => {
    const deps = makeDeps({
      getOrgPref: async () => ({
        ...basePrefs,
        availability_lock_mode: "lock" as const,
      }),
      getApprovedExceptions: async () => [
        {
          employee_id: "emp-1",
          start_date: "2025-10-01",
          end_date: "2025-10-10",
          approved_by: "manager-1",
        },
      ],
      hasApprovedException: async () => true,
    });

    const result = await allowEdit({
      orgId: "org-1",
      employeeId: "emp-1",
      date: "2025-10-06",
      deps,
    });

    expect(result).toBe(true);
  });

  it("handles auto mode before and after threshold", async () => {
    const autoPrefs = {
      ...basePrefs,
      availability_lock_mode: "auto" as const,
      auto_lock_day_of_week: 4,
      auto_lock_hour: 17,
    };

    const deps = makeDeps({
      getOrgPref: async () => autoPrefs,
    });

    const weekStart = "2025-10-20"; // Monday
    const threshold = computeAutoLockThreshold(weekStart, autoPrefs);

    vi.setSystemTime(new Date(threshold.getTime() - 60 * 60 * 1000));
    const before = await getLockStateForWeek({
      orgId: "org-1",
      weekStart,
      deps,
    });
    expect(before).toBe("open");

    vi.setSystemTime(new Date(threshold.getTime() + 60 * 60 * 1000));
    const after = await getLockStateForWeek({
      orgId: "org-1",
      weekStart,
      deps,
    });
    expect(after).toBe("locked");
  });

  it("auto mode allows exceptions after threshold", async () => {
    const autoPrefs = {
      ...basePrefs,
      availability_lock_mode: "auto" as const,
    };

    const deps = makeDeps({
      getOrgPref: async () => autoPrefs,
      getApprovedExceptions: async () => [
        {
          employee_id: "emp-2",
          start_date: "2025-10-19",
          end_date: "2025-10-21",
          approved_by: "manager-1",
        },
      ],
      hasApprovedException: async () => true,
    });

    const weekStart = "2025-10-20";
    const threshold = computeAutoLockThreshold(weekStart, autoPrefs);
    vi.setSystemTime(new Date(threshold.getTime() + 1));

    const state = await getLockStateForWeek({
      orgId: "org-1",
      weekStart,
      deps,
    });
    expect(state).toEqual({
      mode: "open-with-exceptions",
      exceptEmployeeIds: ["emp-2"],
    });

    const canEdit = await allowEdit({
      orgId: "org-1",
      employeeId: "emp-2",
      date: "2025-10-20",
      deps,
    });
    expect(canEdit).toBe(true);
  });
});
