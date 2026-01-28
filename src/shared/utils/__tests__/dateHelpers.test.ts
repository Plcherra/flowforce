import { describe, it, expect } from "vitest";
import { safeDate, formatDate, formatDateTime, isSameDay } from "../dateHelpers";

describe("dateHelpers", () => {
  describe("safeDate", () => {
    it("should parse valid date strings", () => {
      const date = safeDate("2024-01-15");
      expect(date).toBeInstanceOf(Date);
      expect(date?.getFullYear()).toBe(2024);
    });

    it("should return null for invalid dates", () => {
      expect(safeDate("invalid")).toBeNull();
      expect(safeDate(null)).toBeNull();
      expect(safeDate(undefined)).toBeNull();
    });
  });

  describe("formatDate", () => {
    it("should format valid dates", () => {
      const formatted = formatDate("2024-01-15");
      expect(formatted).not.toBe("—");
      expect(typeof formatted).toBe("string");
    });

    it("should return — for invalid dates", () => {
      expect(formatDate(null)).toBe("—");
      expect(formatDate("invalid")).toBe("—");
    });
  });

  describe("formatDateTime", () => {
    it("should format date-time strings", () => {
      const formatted = formatDateTime("2024-01-15T10:30:00Z");
      expect(formatted).not.toBe("Not set");
      expect(typeof formatted).toBe("string");
    });

    it("should return 'Not set' for invalid dates", () => {
      expect(formatDateTime(null)).toBe("Not set");
      expect(formatDateTime("invalid")).toBe("Not set");
    });
  });

  describe("isSameDay", () => {
    it("should correctly identify same day", () => {
      const date1 = new Date("2024-01-15T10:00:00Z");
      const date2 = new Date("2024-01-15T20:00:00Z");
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it("should correctly identify different days", () => {
      const date1 = new Date("2024-01-15T10:00:00Z");
      const date2 = new Date("2024-01-16T10:00:00Z");
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });
});
