import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLeaderboardFilters } from "./useLeaderboardFilters";
import type {
  LeaderboardAnalytics,
  LeaderboardEntry,
  LeaderboardPeriod,
} from "../types";

const analytics: LeaderboardAnalytics = {
  participantCount: 2,
  averageXp: 250,
  updatedAt: "2025-01-05T00:00:00Z",
  xpBySource: { tasks: 200, goals: 150, recognitions: 100, training: 50 },
  badgeTierDistribution: {
    Bronze: 1,
    Silver: 0,
    Gold: 1,
    Platinum: 0,
  },
  topDepartment: {
    id: "dept-1",
    name: "Operations",
    totalXp: 300,
    participantCount: 1,
  },
};

const buildEntry = (
  overrides: Partial<LeaderboardEntry> = {},
): LeaderboardEntry => ({
  employeeId: "emp-1",
  fullName: "Sample Person",
  email: "sample@example.com",
  avatarUrl: null,
  role: "manager",
  period: "monthly",
  periodStart: "2025-01-01",
  department: { id: "dept-1", name: "Operations" },
  positionName: "Leader",
  xp: { tasks: 100, goals: 80, recognitions: 50, training: 20, total: 250 },
  badgeTier: "Gold",
  badges: [],
  achievements: [],
  insights: [],
  challenges: [],
  taskCount: 0,
  goalCount: 0,
  recognitionCount: 0,
  trainingCount: 0,
  reliability: 95,
  updatedAt: "2025-01-05T00:00:00Z",
  rank: 1,
  ...overrides,
});

const entries: LeaderboardEntry[] = [
  buildEntry(),
  buildEntry({
    employeeId: "emp-2",
    role: "associate",
    department: { id: "dept-2", name: "Marketing" },
    xp: { tasks: 80, goals: 40, recognitions: 30, training: 10, total: 160 },
    badgeTier: "Bronze",
    rank: 2,
  }),
];

const departments = [
  { id: "dept-1", name: "Operations", count: 1 },
  { id: "dept-2", name: "Marketing", count: 1 },
];

const roles = [
  { role: "manager", count: 1 },
  { role: "associate", count: 1 },
];

describe("useLeaderboardFilters", () => {
  it("filters entries by department and role selections", () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const onPeriodChange = vi.fn();

    const { result } = renderHook(() =>
      useLeaderboardFilters({
        period: "monthly",
        onPeriodChange,
        refresh,
        entries,
        analytics,
        departments,
        roles,
        lastUpdated: "2025-01-05T00:00:00Z",
      }),
    );

    expect(result.current.filteredEntries).toHaveLength(2);

    act(() => {
      result.current.handleDepartmentChange("dept-1");
    });
    expect(result.current.filteredEntries).toHaveLength(1);

    act(() => {
      result.current.handleRoleChange("associate");
    });
    expect(result.current.filteredEntries).toHaveLength(0);
  });

  it("announces current filter status", () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useLeaderboardFilters({
        period: "monthly",
        onPeriodChange: vi.fn(),
        refresh,
        entries,
        analytics,
        departments,
        roles,
        lastUpdated: "2025-01-05T00:00:00Z",
      }),
    );

    expect(result.current.filterStatusMessage).toContain(
      "showing 2 of 2 participants",
    );
  });

  it("invokes refresh when manual refresh handler runs", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useLeaderboardFilters({
        period: "monthly",
        onPeriodChange: vi.fn(),
        refresh,
        entries,
        analytics,
        departments,
        roles,
        lastUpdated: "2025-01-05T00:00:00Z",
      }),
    );

    await act(async () => {
      result.current.handleManualRefresh();
      await Promise.resolve();
    });

    expect(refresh).toHaveBeenCalledWith({ forceSync: true });
  });

  it("notifies period changes via callback", () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const onPeriodChange = vi.fn();

    const { result } = renderHook(() =>
      useLeaderboardFilters({
        period: "monthly",
        onPeriodChange,
        refresh,
        entries,
        analytics,
        departments,
        roles,
        lastUpdated: "2025-01-05T00:00:00Z",
      }),
    );

    act(() => {
      result.current.handlePeriodChange("weekly");
    });

    expect(onPeriodChange).toHaveBeenCalledWith("weekly" as LeaderboardPeriod);
  });
});
