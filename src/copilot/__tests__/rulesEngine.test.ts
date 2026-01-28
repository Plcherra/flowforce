import { describe, it, expect } from "vitest";
import { evaluateEmployeeContext } from "@/copilot/rulesEngine";
import type { EmployeeContext } from "@/copilot/rulesEngine";
import dayjs from "dayjs";

const baseContext: EmployeeContext = {
  profile: {
    id: "emp-1",
    role: "Barista",
  },
  reports: [],
  skills: [],
  performance: [],
  certifications: [],
  awardedBadges: [],
};

describe("Copilot rules engine", () => {
  it("suggests consistency badge with positive performance reports", () => {
    const context: EmployeeContext = {
      ...baseContext,
      reports: [
        {
          id: "r1",
          employeeId: "emp-1",
          date: dayjs().subtract(5, "day").format("YYYY-MM-DD"),
          category: "performance",
          severity: 5,
          notes: null,
          createdBy: "mgr-1",
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "r2",
          employeeId: "emp-1",
          date: dayjs().subtract(10, "day").format("YYYY-MM-DD"),
          category: "performance",
          severity: 4,
          notes: null,
          createdBy: "mgr-1",
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "r3",
          employeeId: "emp-1",
          date: dayjs().subtract(15, "day").format("YYYY-MM-DD"),
          category: "performance",
          severity: 5,
          notes: null,
          createdBy: "mgr-1",
          createdAt: "",
          updatedAt: "",
        },
      ],
    };

    const decision = evaluateEmployeeContext(context, new Date());
    const consistency = decision.badges.find(
      (badge) => badge.badgeCode === "CONSISTENCY_STAR",
    );
    expect(consistency).toBeDefined();
    expect(consistency?.confidence).toBeGreaterThan(0);
  });

  it("flags level up when XP exceeds threshold", () => {
    const context: EmployeeContext = {
      ...baseContext,
      skills: [
        {
          id: "skill-1",
          employeeId: "emp-1",
          role: "Barista",
          level: 2,
          xp: 250,
          lastReview: null,
          createdAt: "",
          updatedAt: "",
        },
      ],
    };

    const decision = evaluateEmployeeContext(context, new Date());
    const levelUp = decision.skillUpdates.find((update) => update.levelUp);
    expect(levelUp).toBeDefined();
    expect(levelUp?.newLevel).toBe(3);
  });
});
