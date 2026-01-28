import { describe, it, expect } from "vitest";

// Simple validation utilities tests
describe("validation utilities", () => {
  describe("email validation", () => {
    it("should validate correct email addresses", () => {
      const validEmails = [
        "test@example.com",
        "user.name@domain.co.uk",
        "user+tag@example.com",
      ];
      validEmails.forEach((email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(regex.test(email)).toBe(true);
      });
    });

    it("should reject invalid email addresses", () => {
      const invalidEmails = [
        "invalid",
        "@example.com",
        "user@",
        "user@domain",
      ];
      invalidEmails.forEach((email) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        expect(regex.test(email)).toBe(false);
      });
    });
  });
});
