import assert from "node:assert/strict";
import { buildScheduleReadinessSummary } from "./scheduleReadiness";
import type { ShiftWithAssignments } from "@/features/scheduling/hooks/useSchedulingConsolidated";
import type { StaffAvailabilityRow } from "@/features/availability/utils/availabilityUtils";

const USER = "staff-1";

function shiftOnTuesday(): ShiftWithAssignments {
  return {
    id: "shift-readiness-1",
    title: "Readiness test shift",
    role: "staff",
    start_time: "2026-07-07T14:00:00.000Z",
    end_time: "2026-07-07T18:00:00.000Z",
    required_headcount: 1,
    is_published: false,
    assignments: [{ user_id: USER, status: "assigned" }],
  } as ShiftWithAssignments;
}

export function runScheduleReadinessTests() {
  const blockingSummary = buildScheduleReadinessSummary({
    shifts: [shiftOnTuesday()],
    timeOff: [],
    unavailability: [],
    staffAvailability: [
      {
        id: 'other-user-pref',
        user_id: 'other-user',
        company_id: 'company-1',
        day_of_week: 0,
        start_time: '06:00',
        end_time: '21:00',
        week_start_date: '2026-07-06',
        is_preferred: true,
      },
    ],
  });

  assert.ok(blockingSummary.conflictCount >= 1);
  const blockingConflict = blockingSummary.conflicts.find(
    (conflict) => conflict.type === "availability",
  );
  assert.ok(blockingConflict);
  assert.equal(blockingConflict?.severity, "blocking");

  const availability: StaffAvailabilityRow[] = [
    {
      id: "pref-tue",
      user_id: USER,
      company_id: "company-1",
      day_of_week: 1,
      start_time: "06:00",
      end_time: "21:00",
      week_start_date: "2026-07-06",
      is_preferred: true,
    },
  ];

  const warningSummary = buildScheduleReadinessSummary({
    shifts: [shiftOnTuesday()],
    timeOff: [
      {
        id: "pto-pending",
        user_id: USER,
        start_date: "2026-07-07",
        end_date: "2026-07-07",
        status: "pending",
      },
    ],
    unavailability: [],
    staffAvailability: availability,
  });

  const warningConflict = warningSummary.conflicts.find(
    (conflict) => conflict.type === "availability",
  );
  assert.ok(warningConflict);
  assert.equal(warningConflict?.severity, "warning");
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  runScheduleReadinessTests();
  console.log("scheduleReadiness tests passed");
}
