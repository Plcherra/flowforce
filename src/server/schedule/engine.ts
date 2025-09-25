// src/server/schedule/engine.ts
// Greedy-first scheduling engine that respects Co-Pilot policy decisions.
// Generates assignments for a set of shift slots using available employees.

import { PolicyEngine } from '@/server/copilot/policy-engine';
import type { Area } from '@/server/copilot/rules-loader';
import type { Decision } from '@/server/copilot/decision';

// ---- Types ----
export type ISODate = string; // e.g., '2025-09-08'
export type TimeHHMM = string; // '07:00'

export interface ShiftSlot {
  id: string;
  date: ISODate;
  locationId: string;
  area: Area; // 'FOH' | 'BOH'
  roleId?: string; // optional role identifier
  start: TimeHHMM;
  end: TimeHHMM;
  isCloser?: boolean;
  requiresQualificationIds?: string[]; // e.g., ['foh_barista']
  traineeOk?: boolean; // can a trainee occupy this slot
}

export interface EmployeeAvailability {
  weekday: number; // 0-6 (Sun=0)
  ranges: { start: TimeHHMM; end: TimeHHMM }[];
  canOpen?: boolean;
  canClose?: boolean;
}

export interface EmployeeProfile {
  id: string;
  name: string;
  locationIds: string[]; // where they can work
  qualificationIds: string[]; // e.g., ['foh_barista', 'foh_runner']
  isTrainee?: boolean;
  availability: EmployeeAvailability[];
  maxHoursWeek?: number; // optional cap
}

export interface AssignedShift {
  slotId: string;
  employeeId: string;
  date: ISODate;
  locationId: string;
  area: Area;
  roleId?: string;
  start: TimeHHMM;
  end: TimeHHMM;
  isCloser?: boolean;
}

export interface EngineWarning {
  slotId: string;
  reasons: string[];
  fixes?: { label: string; payload?: any }[];
}

export interface GenerateScheduleInput {
  slots: ShiftSlot[];
  employees: EmployeeProfile[];
  // Pre-existing assignments (for partial weeks / manual locks)
  preassigned?: AssignedShift[];
}

export interface GenerateScheduleResult {
  assignments: AssignedShift[];
  warnings: EngineWarning[];
  summary: {
    totalSlots: number;
    assigned: number;
    unassigned: number;
  };
}

// ---- Helpers ----
function toWeekday(dateISO: ISODate): number {
  return new Date(dateISO).getDay(); // 0-6
}

function timeLTE(a: TimeHHMM, b: TimeHHMM): boolean {
  return a <= b; // string compare is fine for HH:MM format
}

function overlaps(aStart: TimeHHMM, aEnd: TimeHHMM, bStart: TimeHHMM, bEnd: TimeHHMM): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function isAvailableOn(employee: EmployeeProfile, date: ISODate, start: TimeHHMM, end: TimeHHMM): boolean {
  const wd = toWeekday(date);
  const day = employee.availability.find((d) => d.weekday === wd);
  if (!day) return false;
  return day.ranges.some((r) => timeLTE(r.start, start) && timeLTE(end, r.end));
}

function hasQualifications(employee: EmployeeProfile, required?: string[]): boolean {
  if (!required || required.length === 0) return true;
  return required.every((q) => employee.qualificationIds.includes(q));
}

function withinWeeklyCap(employee: EmployeeProfile, currentAssigned: AssignedShift[], addHours: number): boolean {
  if (!employee.maxHoursWeek) return true;
  const hours = currentAssigned
    .filter((a) => a.employeeId === employee.id)
    .reduce((acc, a) => acc + diffHours(a.start, a.end), 0);
  return hours + addHours <= employee.maxHoursWeek;
}

function diffHours(start: TimeHHMM, end: TimeHHMM): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return (eh + em / 60) - (sh + sm / 60);
}

function buildDayAreaCounts(assignments: AssignedShift[], date: ISODate): Record<Area, number> {
  const counts: Record<Area, number> = { FOH: 0, BOH: 0 } as Record<Area, number>;
  assignments.forEach((a) => {
    if (a.date === date) counts[a.area] = (counts[a.area] ?? 0) + 1;
  });
  return counts;
}

function collidesWithExisting(employee: EmployeeProfile, date: ISODate, start: TimeHHMM, end: TimeHHMM, assigned: AssignedShift[]): boolean {
  return assigned.some((a) => a.employeeId === employee.id && a.date === date && overlaps(a.start, a.end, start, end));
}

// ---- Core Greedy Engine ----
export async function generateSchedule(
  engine: PolicyEngine,
  input: GenerateScheduleInput
): Promise<GenerateScheduleResult> {
  const assigned: AssignedShift[] = [...(input.preassigned ?? [])];
  const warnings: EngineWarning[] = [];

  // Heuristic ordering: 
  // 1) closer-required slots first, 2) BOH before FOH (often more constrained), 3) earlier dates first, 4) longer shifts first.
  const slots = [...input.slots].sort((a, b) => {
    if ((b.isCloser ? 1 : 0) - (a.isCloser ? 1 : 0) !== 0) return (b.isCloser ? 1 : 0) - (a.isCloser ? 1 : 0);
    if (a.area !== b.area) return a.area === 'BOH' ? -1 : 1;
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const lenA = diffHours(a.start, a.end);
    const lenB = diffHours(b.start, b.end);
    return lenB - lenA;
  });

  for (const slot of slots) {
    const candidates = input.employees.filter((e) =>
      e.locationIds.includes(slot.locationId) &&
      isAvailableOn(e, slot.date, slot.start, slot.end) &&
      hasQualifications(e, slot.requiresQualificationIds) &&
      (slot.isCloser ? (e.availability.find((d) => d.weekday === toWeekday(slot.date))?.canClose === true) : true) &&
      (slot.traineeOk ? true : !e.isTrainee) &&
      !collidesWithExisting(e, slot.date, slot.start, slot.end, assigned)
    );

    // Score candidates: prefer non-trainees, more qualifications, fewer hours assigned so far
    const scored = candidates
      .map((e) => {
        const hoursSoFar = assigned.filter((a) => a.employeeId === e.id).reduce((acc, a) => acc + diffHours(a.start, a.end), 0);
        const qualScore = (slot.requiresQualificationIds?.filter((q) => e.qualificationIds.includes(q)).length ?? 0) * 10;
        const traineePenalty = e.isTrainee ? -20 : 0;
        const availabilityBonus = 0; // could add open/close bonuses if needed
        const score = qualScore + availabilityBonus + (100 - hoursSoFar) + traineePenalty;
        return { e, score, hoursSoFar };
      })
      .sort((a, b) => b.score - a.score);

    let placed = false;
    for (const { e, hoursSoFar } of scored) {
      const addHours = diffHours(slot.start, slot.end);
      if (!withinWeeklyCap(e, assigned, addHours)) continue;

      // Day/area counts to pass into policy check
      const dayCounts = buildDayAreaCounts(assigned, slot.date);

      const decision: Decision = await engine.canScheduleShift({
        date: slot.date,
        locationId: slot.locationId,
        area: slot.area,
        roleId: slot.roleId,
        employeeId: e.id,
        start: slot.start,
        end: slot.end,
        isCloser: !!slot.isCloser,
        isTrainee: !!e.isTrainee,
        dayShiftsCountByArea: dayCounts,
      } as any);

      if (decision.allow) {
        assigned.push({
          slotId: slot.id,
          employeeId: e.id,
          date: slot.date,
          locationId: slot.locationId,
          area: slot.area,
          roleId: slot.roleId,
          start: slot.start,
          end: slot.end,
          isCloser: slot.isCloser,
        });
        placed = true;
        break;
      }
    }

    if (!placed) {
      warnings.push({ slotId: slot.id, reasons: [
        `No eligible candidate for ${slot.area} ${slot.roleId ?? ''} on ${slot.date} ${slot.start}-${slot.end}`.trim(),
      ] });
    }
  }

  return {
    assignments: assigned,
    warnings,
    summary: {
      totalSlots: input.slots.length,
      assigned: assigned.length,
      unassigned: input.slots.length - assigned.length,
    },
  };
}

export default { generateSchedule };
