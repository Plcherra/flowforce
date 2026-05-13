import { addDays } from "date-fns";
import {
  buildDedupeKey,
  cloneHoursByStore,
  combineDateAndTime,
  employeeMatchesRole,
  getShiftHours,
  hasCapacity,
  isEmployeeAvailable,
  isSupervisorRole,
  recordSupervisorAssignment,
  rotateSupervisors,
  type EmployeeState,
  type SupervisorLedger,
} from "@/features/scheduling/hooks/copilotSchedulerMath";
import type {
  CoverageGap,
  CoverageTemplatePlan,
  DraftShift,
  GeneratePlanInput,
  GeneratePlanOutput,
  ScheduleSummary,
  SchedulerEmployee,
  SwapSuggestion,
} from "@/features/scheduling/hooks/copilotSchedulerTypes";

const initialiseEmployees = (
  employees: SchedulerEmployee[],
  existingHours?: Map<string, number>,
  existingHoursByStore?: Map<string, Record<string, number>>,
) => {
  const map = new Map<string, EmployeeState>();
  const summary: ScheduleSummary = {
    totalHours: 0,
    hoursByEmployee: {},
    hoursByStore: {},
  };

  employees.forEach((employee) => {
    const baselineHours = existingHours?.get(employee.id) ?? 0;
    const baselineStoreHours = cloneHoursByStore(
      existingHoursByStore?.get(employee.id),
    );
    map.set(employee.id, {
      employee,
      hours: baselineHours,
      hoursByStore: baselineStoreHours,
    });
    summary.hoursByEmployee[employee.id] = baselineHours;
    summary.hoursByStore[employee.id] = cloneHoursByStore(baselineStoreHours);
  });

  return { map, summary };
};

const sortTemplates = (templates: CoverageTemplatePlan[]) =>
  [...templates].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.startTime.localeCompare(b.startTime);
  });

export function generateDraftSchedulePlan({
  employees,
  templates,
  weekStart,
  weekEnd,
  forecastMap,
  existingHours,
  existingHoursByStore,
}: GeneratePlanInput): GeneratePlanOutput {
  const { map: employeeStateMap, summary } = initialiseEmployees(
    employees,
    existingHours,
    existingHoursByStore,
  );
  const supervisorLedger = new Map<string, SupervisorLedger>();
  const draftShifts: DraftShift[] = [];
  const coverageGaps: CoverageGap[] = [];
  const swapSuggestions: SwapSuggestion[] = [];

  for (const template of sortTemplates(templates)) {
    const startDay = weekStart.getDay();
    const offset = (template.dayOfWeek - startDay + 7) % 7;
    const scheduleDate = addDays(weekStart, offset);
    if (scheduleDate > weekEnd) continue;

    const startDate = combineDateAndTime(scheduleDate, template.startTime);
    const endDate = combineDateAndTime(scheduleDate, template.endTime);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()))
      continue;

    const shiftHours = getShiftHours(startDate, endDate);
    if (shiftHours <= 0) continue;

    const forecast = forecastMap.get(template.id);
    let requiredSlots = forecast?.requiredCount ?? template.requiredCount;
    if (requiredSlots <= 0 && template.requiredCount > 0)
      requiredSlots = template.requiredCount;
    requiredSlots = Math.max(0, requiredSlots);

    const usedIds = new Set<string>();
    let assignedCount = 0;

    while (assignedCount < requiredSlots) {
      const eligible = Array.from(employeeStateMap.values()).filter((state) => {
        if (usedIds.has(state.employee.id)) return false;
        if (!employeeMatchesRole(state.employee, template.role)) return false;
        if (!hasCapacity(state, template.location, shiftHours)) return false;
        if (
          !isEmployeeAvailable(state.employee, scheduleDate, startDate, endDate)
        )
          return false;
        return true;
      });

      if (eligible.length === 0) break;

      const ordered = isSupervisorRole(template.role)
        ? rotateSupervisors(eligible, template.location, supervisorLedger)
        : [...eligible].sort((a, b) => {
            const storePenaltyA =
              a.employee.homeStore && a.employee.homeStore !== template.location
                ? 2
                : 0;
            const storePenaltyB =
              b.employee.homeStore && b.employee.homeStore !== template.location
                ? 2
                : 0;
            return (
              a.hours +
              (a.hoursByStore[template.location] ?? 0) * 0.75 +
              storePenaltyA -
              (b.hours +
                (b.hoursByStore[template.location] ?? 0) * 0.75 +
                storePenaltyB)
            );
          });

      const chosen = ordered[0];
      if (!chosen) break;

      usedIds.add(chosen.employee.id);
      chosen.hours += shiftHours;
      chosen.hoursByStore[template.location] =
        (chosen.hoursByStore[template.location] ?? 0) + shiftHours;
      employeeStateMap.set(chosen.employee.id, chosen);

      summary.totalHours += shiftHours;
      summary.hoursByEmployee[chosen.employee.id] = chosen.hours;
      summary.hoursByStore[chosen.employee.id] = cloneHoursByStore(
        chosen.hoursByStore,
      );

      if (isSupervisorRole(template.role))
        recordSupervisorAssignment(
          supervisorLedger,
          chosen.employee.id,
          template.location,
        );

      const scheduleDateIso = scheduleDate.toISOString().split("T")[0] ?? "";
      draftShifts.push({
        dedupeKey: buildDedupeKey(
          template.id,
          scheduleDateIso,
          chosen.employee.id,
          assignedCount,
        ),
        templateId: template.id,
        scheduleDate: scheduleDateIso,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        location: template.location,
        role: template.role,
        employeeId: chosen.employee.id,
        employeeName: chosen.employee.displayName ?? null,
        hours: shiftHours,
        status: "draft",
      });

      assignedCount += 1;
    }

    const scheduleDateIso = scheduleDate.toISOString().split("T")[0] ?? "";
    if (assignedCount < requiredSlots) {
      const missing = requiredSlots - assignedCount;
      coverageGaps.push({
        templateId: template.id,
        scheduleDate: scheduleDateIso,
        role: template.role,
        location: template.location,
        requiredCount: requiredSlots,
        assignedCount,
        missingCount: missing,
        reason: `Missing ${missing} ${template.role} shift${missing > 1 ? "s" : ""} at ${template.location}`,
      });

      const donor = draftShifts
        .slice()
        .reverse()
        .find(
          (shift) =>
            shift.role === template.role &&
            shift.location !== template.location &&
            shift.employeeId !== null,
        );

      const crossStoreCandidate = Array.from(employeeStateMap.values()).find(
        (state) => {
          if (!employeeMatchesRole(state.employee, template.role)) return false;
          if (
            state.employee.homeStore &&
            state.employee.homeStore === template.location
          )
            return false;
          if (
            !isEmployeeAvailable(
              state.employee,
              scheduleDate,
              startDate,
              endDate,
            )
          )
            return false;
          return state.employee.id !== donor?.employeeId;
        },
      );

      if (donor && crossStoreCandidate) {
        swapSuggestions.push({
          id: `swap::${template.id}::${scheduleDateIso}::${donor.employeeId}:${crossStoreCandidate.employee.id}`,
          templateId: template.id,
          scheduleDate: scheduleDateIso,
          role: template.role,
          fromEmployeeId: donor.employeeId!,
          toEmployeeId: crossStoreCandidate.employee.id,
          fromLocation: donor.location,
          toLocation: template.location,
          reason: `Swap ${crossStoreCandidate.employee.displayName ?? "employee"} from ${donor.location} to ${
            template.location
          } to close coverage gap.`,
        });
      }
    }
  }

  return { draftShifts, coverageGaps, swapSuggestions, summary };
}

export const computeExistingHours = (
  shifts: Array<{
    employee_id: string | null;
    start_time: string;
    end_time: string;
    location?: string | null;
  }>,
) => {
  const totals = new Map<string, number>();
  const perStore = new Map<string, Record<string, number>>();

  shifts.forEach((shift) => {
    if (!shift.employee_id) return;
    const start = new Date(shift.start_time);
    const end = new Date(shift.end_time);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
    const hours = getShiftHours(start, end);
    totals.set(shift.employee_id, (totals.get(shift.employee_id) ?? 0) + hours);

    const location = shift.location ?? "Store 1";
    const storeMap = perStore.get(shift.employee_id) ?? {};
    storeMap[location] = (storeMap[location] ?? 0) + hours;
    perStore.set(shift.employee_id, storeMap);
  });

  return { totals, perStore };
};
