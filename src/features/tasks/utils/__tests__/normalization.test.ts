import { describe, it, expect } from "vitest";
import { normalizeStatus, normalizePriority } from "../normalization";

describe("normalizeStatus", () => {
  it("should normalize known statuses correctly", () => {
    expect(normalizeStatus("pending")).toBe("pending");
    expect(normalizeStatus("in_progress")).toBe("in_progress");
    expect(normalizeStatus("completed")).toBe("completed");
    expect(normalizeStatus("cancelled")).toBe("cancelled");
  });

  it("should handle null/undefined gracefully", () => {
    expect(normalizeStatus(null)).toBe("other");
    expect(normalizeStatus(undefined)).toBe("other");
  });

  it("should return 'other' for unknown statuses", () => {
    expect(normalizeStatus("unknown_status")).toBe("other");
  });
});

describe("normalizePriority", () => {
  it("should normalize known priorities correctly", () => {
    expect(normalizePriority("low")).toBe("low");
    expect(normalizePriority("medium")).toBe("medium");
    expect(normalizePriority("high")).toBe("high");
    expect(normalizePriority("urgent")).toBe("urgent");
  });

  it("should return 'other' for unknown priorities", () => {
    expect(normalizePriority("unknown")).toBe("other");
    expect(normalizePriority(null)).toBe("other");
    expect(normalizePriority(undefined)).toBe("other");
  });
});
