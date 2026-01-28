/* @vitest-environment jsdom */

import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useTaskFilters } from "@/features/tasks/hooks";

describe("useTaskFilters", () => {
  it("initializes with default values", () => {
    const { result } = renderHook(() => useTaskFilters());

    expect(result.current.statusFilter).toBe("all");
    expect(result.current.priorityFilter).toBe("all");
    expect(result.current.searchTerm).toBe("");
    expect(result.current.filtersActive).toBe(false);
  });

  it("marks filters as active when any value changes", () => {
    const { result } = renderHook(() => useTaskFilters());

    act(() => {
      result.current.setStatusFilter("in_progress");
    });
    expect(result.current.filtersActive).toBe(true);

    act(() => {
      result.current.resetFilters();
    });
    expect(result.current.filtersActive).toBe(false);
  });

  it("resets all filters to defaults", () => {
    const { result } = renderHook(() => useTaskFilters());

    act(() => {
      result.current.setPriorityFilter("high");
      result.current.setSearchTerm("design");
    });

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.priorityFilter).toBe("all");
    expect(result.current.searchTerm).toBe("");
  });
});
