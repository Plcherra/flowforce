import assert from "node:assert/strict";
import { generateDraftSchedulePlan } from "./copilotSchedulerPlan";
import type {
  CoverageTemplatePlan,
  SchedulerEmployee,
} from "./copilotSchedulerTypes";
import type { StaffAvailabilityRow } from "@/features/availability/utils/availabilityUtils";

const COMPANY_ID = "company-1";
const WEEK_START = new Date("2026-07-06T00:00:00.000Z");
const WEEK_END = new Date("2026-07-13T00:00:00.000Z");

function makeEmployee(
  profileId: string,
  displayName: string,
): SchedulerEmployee {
  return {
    id: profileId,
    companyId: COMPANY_ID,
    profileId,
    displayName,
    role: "staff",
    secondaryRoles: [],
    homeStore: "Main",
    weeklyMaxHours: 40,
    availability: {},
    metadata: {},
  };
}

function tuesdayTemplate(): CoverageTemplatePlan {
  return {
    id: "template-tuesday",
    companyId: COMPANY_ID,
    name: "Tuesday coverage",
    role: "staff",
    location: "Main",
    dayOfWeek: 2,
    startTime: "09:00",
    endTime: "13:00",
    requiredCount: 1,
    priority: 1,
    flexMinutes: 0,
  };
}

function tuesdayAvailability(userId: string): StaffAvailabilityRow {
  return {
    id: `avail-${userId}`,
    user_id: userId,
    company_id: COMPANY_ID,
    day_of_week: 1,
    start_time: "06:00",
    end_time: "21:00",
    week_start_date: "2026-07-06",
    is_preferred: true,
  };
}

export function runCopilotSchedulerPlanTests() {
  const availableEmployee = makeEmployee("staff-available", "Available Staff");
  const unavailableEmployee = makeEmployee("staff-off", "Off Day Staff");

  const assignedPlan = generateDraftSchedulePlan({
    employees: [availableEmployee, unavailableEmployee],
    templates: [tuesdayTemplate()],
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    forecastMap: new Map(),
    staffAvailability: [tuesdayAvailability("staff-available")],
    timeOff: [],
    unavailability: [],
  });

  assert.equal(assignedPlan.draftShifts.length, 1);
  assert.equal(assignedPlan.draftShifts[0]?.employeeId, "staff-available");
  assert.notEqual(assignedPlan.draftShifts[0]?.employeeId, "staff-off");

  const gapPlan = generateDraftSchedulePlan({
    employees: [unavailableEmployee],
    templates: [tuesdayTemplate()],
    weekStart: WEEK_START,
    weekEnd: WEEK_END,
    forecastMap: new Map(),
    staffAvailability: [],
    timeOff: [],
    unavailability: [],
  });

  assert.equal(
    gapPlan.draftShifts.filter((shift) => shift.employeeId !== null).length,
    0,
  );
  assert.ok(gapPlan.coverageGaps.length >= 1);
  assert.equal(gapPlan.coverageGaps[0]?.assignedCount, 0);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  runCopilotSchedulerPlanTests();
  console.log("copilotSchedulerPlan tests passed");
}
