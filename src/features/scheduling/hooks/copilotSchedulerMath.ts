import { differenceInMinutes } from "date-fns";
import type { SchedulerEmployee } from "@/features/scheduling/hooks/copilotSchedulerTypes";

export const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
export const MAX_STORE_WEEKLY_HOURS = 38;

export interface EmployeeState {
  employee: SchedulerEmployee;
  hours: number;
  hoursByStore: Record<string, number>;
}

export interface SupervisorLedger {
  assignmentsByStore: Record<string, number>;
  totalAssignments: number;
}

export const isSupervisorRole = (role: string) =>
  role.toLowerCase().includes("supervisor");

export const timeStringToMinutes = (value: string) => {
  const [hourStr = "0", minuteStr = "0"] = value.split(":");
  const hour = Number.parseInt(hourStr, 10);
  const minute = Number.parseInt(minuteStr, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return 0;
  return hour * 60 + minute;
};

export const combineDateAndTime = (date: Date, time: string) => {
  const result = new Date(date);
  const [hourStr, minuteStr = "0"] = time.split(":");
  const hour = Number.parseInt(hourStr, 10);
  const minute = Number.parseInt(minuteStr, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    result.setHours(0, 0, 0, 0);
    return result;
  }
  result.setHours(hour, minute, 0, 0);
  return result;
};

export const employeeMatchesRole = (
  employee: SchedulerEmployee,
  role: string,
) => {
  const normalized = role.toLowerCase();
  if (employee.role.toLowerCase() === normalized) return true;
  return employee.secondaryRoles.some(
    (secondary) => secondary.toLowerCase() === normalized,
  );
};

export const cloneHoursByStore = (source?: Record<string, number>) => {
  const clone: Record<string, number> = {};
  if (!source) return clone;
  for (const [store, hours] of Object.entries(source)) {
    clone[store] = hours;
  }
  return clone;
};

export const getShiftHours = (start: Date, end: Date) => {
  let minutes = differenceInMinutes(end, start);
  if (minutes <= 0) {
    const adjusted = new Date(end);
    adjusted.setDate(adjusted.getDate() + 1);
    minutes = differenceInMinutes(adjusted, start);
  }
  return Math.max(0, minutes) / 60;
};

export const isEmployeeAvailable = (
  employee: SchedulerEmployee,
  scheduleDate: Date,
  start: Date,
  end: Date,
) => {
  const dayKey = DAY_KEYS[scheduleDate.getDay()];
  const windows = employee.availability?.[dayKey] ?? [];
  if (windows.length === 0) return true;

  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();

  return windows.some((window) => {
    const windowStart = timeStringToMinutes(window.start);
    const windowEnd = timeStringToMinutes(window.end);
    return startMinutes >= windowStart && endMinutes <= windowEnd;
  });
};

export const hasCapacity = (
  state: EmployeeState,
  store: string,
  shiftHours: number,
) => {
  if (state.hours + shiftHours > state.employee.weeklyMaxHours) return false;
  const currentStoreHours = state.hoursByStore[store] ?? 0;
  return currentStoreHours + shiftHours <= MAX_STORE_WEEKLY_HOURS;
};

export const buildDedupeKey = (
  templateId: string,
  scheduleDate: string,
  employeeId: string | null,
  slot: number,
) => `${templateId}:${scheduleDate}:${employeeId ?? "open"}:${slot}`;

const supervisorScore = (
  state: EmployeeState,
  store: string,
  ledger: Map<string, SupervisorLedger>,
) => {
  const entry = ledger.get(state.employee.id) ?? {
    assignmentsByStore: {},
    totalAssignments: 0,
  };
  const storeLoad = entry.assignmentsByStore[store] ?? 0;
  const otherLoad = entry.totalAssignments - storeLoad;
  const locationPenalty =
    state.employee.homeStore && state.employee.homeStore !== store ? 0.75 : 0;
  return storeLoad * 2 + otherLoad + state.hours * 0.1 + locationPenalty;
};

const standardScore = (state: EmployeeState, store: string) => {
  const storeHours = state.hoursByStore[store] ?? 0;
  const storePenalty =
    state.employee.homeStore && state.employee.homeStore !== store ? 2 : 0;
  return state.hours + storeHours * 0.75 + storePenalty;
};

export function rotateSupervisors(
  candidates: EmployeeState[],
  store: string,
  ledger: Map<string, SupervisorLedger>,
): EmployeeState[] {
  return [...candidates].sort(
    (a, b) =>
      supervisorScore(a, store, ledger) - supervisorScore(b, store, ledger),
  );
}

export const recordSupervisorAssignment = (
  ledger: Map<string, SupervisorLedger>,
  employeeId: string,
  store: string,
) => {
  const entry = ledger.get(employeeId) ?? {
    assignmentsByStore: {},
    totalAssignments: 0,
  };
  entry.assignmentsByStore[store] = (entry.assignmentsByStore[store] ?? 0) + 1;
  entry.totalAssignments += 1;
  ledger.set(employeeId, entry);
};
