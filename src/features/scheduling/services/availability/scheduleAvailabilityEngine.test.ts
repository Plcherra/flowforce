import assert from "node:assert/strict";
import {
  buildCellAvailabilityMap,
  buildGridCellPresentation,
  evaluateAssignment,
  resolveEmployeeDayWindows,
} from "./scheduleAvailabilityEngine";
import { evaluateShiftAssignment } from "./evaluateShiftAssignment";

const USER = "user-1";

function mondayOfCurrentWeek() {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setHours(12, 0, 0, 0);
  monday.setDate(monday.getDate() + diff);
  return monday;
}

function dayAtOffset(offset: number) {
  const monday = mondayOfCurrentWeek();
  const day = new Date(monday);
  day.setDate(monday.getDate() + offset);
  return day;
}

function isoWeekStart() {
  return mondayOfCurrentWeek().toISOString().slice(0, 10);
}

export function runScheduleAvailabilityEngineTests() {
  const weekStart = isoWeekStart();

  const mondayOff = buildGridCellPresentation(
    resolveEmployeeDayWindows({
      userId: USER,
      day: dayAtOffset(0),
      staffAvailability: [],
      timeOff: [],
      unavailability: [],
    }),
  );
  assert.equal(mondayOff.status, "blocked");
  assert.equal(mondayOff.canAssign, false);

  const tuesdayCell = buildGridCellPresentation(
    resolveEmployeeDayWindows({
      userId: USER,
      day: dayAtOffset(1),
      staffAvailability: [
        {
          id: "pref-1",
          user_id: USER,
          day_of_week: 1,
          start_time: "06:00",
          end_time: "13:30",
          week_start_date: weekStart,
        },
      ],
      timeOff: [],
      unavailability: [],
    }),
  );
  assert.equal(tuesdayCell.status, "partial");
  assert.match(tuesdayCell.hint ?? "", /1:30p/i);

  const wednesdayCell = buildGridCellPresentation(
    resolveEmployeeDayWindows({
      userId: USER,
      day: dayAtOffset(2),
      staffAvailability: [
        {
          id: "pref-2",
          user_id: USER,
          day_of_week: 2,
          start_time: "06:00",
          end_time: "21:00",
          week_start_date: weekStart,
        },
      ],
      timeOff: [
        {
          id: "pto-approved",
          user_id: USER,
          start_date: dayAtOffset(2).toISOString().slice(0, 10),
          end_date: dayAtOffset(2).toISOString().slice(0, 10),
          status: "approved",
        },
      ],
      unavailability: [],
    }),
  );
  assert.equal(wednesdayCell.status, "blocked");

  const thursdayCell = buildGridCellPresentation(
    resolveEmployeeDayWindows({
      userId: USER,
      day: dayAtOffset(3),
      staffAvailability: [
        {
          id: "pref-3",
          user_id: USER,
          day_of_week: 3,
          start_time: "06:00",
          end_time: "21:00",
          week_start_date: weekStart,
        },
      ],
      timeOff: [
        {
          id: "pto-pending",
          user_id: USER,
          start_date: dayAtOffset(3).toISOString().slice(0, 10),
          end_date: dayAtOffset(3).toISOString().slice(0, 10),
          status: "pending",
        },
      ],
      unavailability: [],
    }),
  );
  const thursdayShiftStart = new Date(dayAtOffset(3));
  thursdayShiftStart.setHours(9, 0, 0, 0);
  const thursdayShiftEnd = new Date(dayAtOffset(3));
  thursdayShiftEnd.setHours(17, 0, 0, 0);
  assert.equal(
    evaluateAssignment({
      shiftStart: thursdayShiftStart,
      shiftEnd: thursdayShiftEnd,
      cell: thursdayCell,
    }).severity,
    "warning",
  );

  const friday = dayAtOffset(4);
  const fridayStart = new Date(friday);
  fridayStart.setHours(14, 0, 0, 0);
  const fridayEnd = new Date(friday);
  fridayEnd.setHours(18, 0, 0, 0);
  const fridayCell = buildGridCellPresentation(
    resolveEmployeeDayWindows({
      userId: USER,
      day: friday,
      staffAvailability: [
        {
          id: "pref-4",
          user_id: USER,
          day_of_week: 4,
          start_time: "06:00",
          end_time: "21:00",
          week_start_date: weekStart,
        },
      ],
      timeOff: [],
      unavailability: [
        {
          id: "ua-1",
          user_id: USER,
          start_time: fridayStart.toISOString(),
          end_time: fridayEnd.toISOString(),
        },
      ],
    }),
  );
  const lateShiftStart = new Date(friday);
  lateShiftStart.setHours(15, 0, 0, 0);
  const lateShiftEnd = new Date(friday);
  lateShiftEnd.setHours(21, 0, 0, 0);
  assert.equal(
    evaluateAssignment({
      shiftStart: lateShiftStart,
      shiftEnd: lateShiftEnd,
      cell: fridayCell,
    }).severity,
    "blocking",
  );

  const map = buildCellAvailabilityMap({
    employeeIds: [USER],
    weekDays: [dayAtOffset(1)],
    staffAvailability: [
      {
        id: "pref-map",
        user_id: USER,
        day_of_week: 1,
        start_time: "06:00",
        end_time: "13:30",
        week_start_date: weekStart,
      },
    ],
    timeOff: [],
    unavailability: [],
  });
  assert.ok(map.get(USER)?.get(dayAtOffset(1).toISOString().slice(0, 10)));

  const tuesdayShiftStart = new Date(dayAtOffset(1));
  tuesdayShiftStart.setHours(9, 0, 0, 0);
  const tuesdayShiftEnd = new Date(dayAtOffset(1));
  tuesdayShiftEnd.setHours(12, 0, 0, 0);
  assert.equal(
    evaluateShiftAssignment({
      userId: USER,
      shiftStart: tuesdayShiftStart,
      shiftEnd: tuesdayShiftEnd,
      staffAvailability: [
        {
          id: "pref-wrapper",
          user_id: USER,
          day_of_week: 1,
          start_time: "06:00",
          end_time: "13:30",
          week_start_date: weekStart,
        },
      ],
      timeOff: [],
      unavailability: [],
    }).allowed,
    true,
  );
}
