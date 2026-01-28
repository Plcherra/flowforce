import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCommentForm } from "../useCommentForm";

describe("useCommentForm", () => {
  it("stores values via handleChange and clears existing error", () => {
    const { result } = renderHook(() => useCommentForm());

    act(() => {
      result.current.setError("update-1", "Too short");
    });

    act(() => {
      result.current.handleChange("update-1", "Nice job!");
    });

    expect(result.current.values["update-1"]).toBe("Nice job!");
    expect(result.current.errors["update-1"]).toBeUndefined();
  });

  it("clears value and error when clearComment is called", () => {
    const { result } = renderHook(() => useCommentForm());

    act(() => {
      result.current.handleChange("update-2", "Thanks!");
      result.current.setError("update-2", "Oops");
    });

    act(() => {
      result.current.clearComment("update-2");
    });

    expect(result.current.values["update-2"]).toBeUndefined();
    expect(result.current.errors["update-2"]).toBeUndefined();
  });

  it("records error messages via setError", () => {
    const { result } = renderHook(() => useCommentForm());

    act(() => {
      result.current.setError("update-3", "Failed to post");
    });

    expect(result.current.errors["update-3"]).toBe("Failed to post");
  });
});
