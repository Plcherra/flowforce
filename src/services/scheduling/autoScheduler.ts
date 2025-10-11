import { addDays, differenceInHours, differenceInMinutes, format, formatISO, isBefore, startOfWeek } from 'date-fns';
import type { Tables } from '@/integrations/supabase/public-types';
import { supabase } from '@/integrations/supabase/client';
import { generateSchedule, type ShiftSlot, type EmployeeProfile, type AssignedShift, type GenerateScheduleResult } from '@/server/schedule/engine';
import { PolicyEngine } from '@/server/copilot/policy-engine';
import { getLocationRuleSet, listLocationRuleSets, type LocationRuleSet, type CopilotEmployeeSeed, type CoverageSlotTemplate } from '@/data/scheduling/locationRuleSets';
import type { Area } from '@/server/copilot/rules-loader';

export type DraftWarningSeverity = 'hard' | 'soft';

export interface CopilotDraftWarning {
  slotId?: string;
  employeeId?: string;
  message: string;
  severity: DraftWarningSeverity;
  code: string;
  fixes?: { label: string; payload?: Record<string, unknown> }[];
}

export interface AutoScheduleSummary {
  totalSlots: number;
  assigned: number;
  unassigned: number;
  coverageByDay: Record<string, { required: number; assigned: number; ratio: number }>;
  coverageByArea: Record<Area, { required: number; assigned: number; ratio: number }>;
  warningCounts: { hard: number; soft: number };
}

export interface AutoScheduleParams {
  locationId: string;
  weekStart: Date | string;
  overwriteExisting?: boolean;
}

export interface AutoScheduleResult {
  runId: string;
  locationId: string;
  locationName: string;
  weekStart: string;
  summary: AutoScheduleSummary;
  warnings: CopilotDraftWarning[];
  schedulesCreated: string[];
}

type ScheduleInsert = Tables<'schedules'>['Insert'];
type ScheduleAssignmentInsert = Tables<'schedule_assignments'>['Insert'];
type ScheduleMinimalRow = Pick<Tables<'schedules'>['Row'], 'id' | 'requirements' | 'start_time'>;

export interface CopilotScheduleMetadata {
  runId: string;
  generatedAt: string;
  locationId: string;
  locationName: string;
  weekStart: string;
  slotId: string;
  slotRole: string;
  slotArea: Area;
  slotTags: string[];
  warnings: CopilotDraftWarning[];
  summary: AutoScheduleSummary;
  status: string;
}

export interface CopilotRequirementsPayload {
  copilot?: Partial<CopilotScheduleMetadata>;
}

interface SlotMeta {
  slot: ShiftSlot;
  template: CoverageSlotTemplate;
}

function normaliseWeekStart(value: Date | string, timezoneHint = 'America/New_York'): Date {
  const base = value instanceof Date ? value : new Date(value);
  const normalised = startOfWeek(base, { weekStartsOn: 1 });
  normalised.setHours(0, 0, 0, 0);
  return normalised;
}

function weekdayToOffset(weekday: string): number {
  switch (weekday) {
    case 'Mon':
      return 0;
    case 'Tue':
      return 1;
    case 'Wed':
      return 2;
    case 'Thu':
      return 3;
    case 'Fri':
      return 4;
    case 'Sat':
      return 5;
    case 'Sun':
      return 6;
    default:
      return 0;
  }
}

function buildDateWithTime(day: Date, time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(day);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function seedToProfile(seed: CopilotEmployeeSeed): EmployeeProfile {
  return {
    id: seed.id,
    name: seed.name,
    locationIds: seed.locationIds,
    qualificationIds: seed.qualificationIds,
    isTrainee: seed.isTrainee ?? false,
    availability: seed.availability.map((entry) => ({
      weekday: entry.weekday,
      ranges: entry.ranges.map((range) => ({ start: range.start, end: range.end })),
      canOpen: entry.canOpen,
      canClose: entry.canClose,
    })),
    maxHoursWeek: seed.maxHoursWeek,
  };
}

function buildShiftSlots(ruleset: LocationRuleSet, weekStart: Date): { slots: ShiftSlot[]; meta: Map<string, SlotMeta> } {
  const slots: ShiftSlot[] = [];
  const meta = new Map<string, SlotMeta>();

  Object.entries(ruleset.coverageTemplates).forEach(([weekday, templates]) => {
    const offset = weekdayToOffset(weekday);
    const day = addDays(weekStart, offset);
    const date = format(day, 'yyyy-MM-dd');

    templates.forEach((template, templateIndex) => {
      for (let i = 0; i < template.headcount; i += 1) {
        const slotId = `${ruleset.id}-${date}-${template.roleId}-${templateIndex}-${i}`;
        const slot: ShiftSlot = {
          id: slotId,
          date,
          locationId: ruleset.id,
          area: template.area,
          roleId: template.roleId,
          start: template.start,
          end: template.end,
          isCloser: template.isCloser ?? false,
          requiresQualificationIds: [template.roleId],
          traineeOk: !template.isCloser,
        };
        slots.push(slot);
        meta.set(slotId, { slot, template });
      }
    });
  });

  return { slots, meta };
}

function aggregateCoverage(slots: ShiftSlot[], assignments: AssignedShift[]): {
  coverageByDay: AutoScheduleSummary['coverageByDay'];
  coverageByArea: AutoScheduleSummary['coverageByArea'];
} {
  const coverageByDay: AutoScheduleSummary['coverageByDay'] = {};
  const coverageByArea: AutoScheduleSummary['coverageByArea'] = { FOH: { required: 0, assigned: 0, ratio: 0 }, BOH: { required: 0, assigned: 0, ratio: 0 } };

  const assignedBySlot = new Map(assignments.map((assignment) => [assignment.slotId, assignment]));

  slots.forEach((slot) => {
    const dayKey = `${slot.date}-${slot.area}`;
    const dayRecord = coverageByDay[dayKey] ?? { required: 0, assigned: 0, ratio: 0 };
    dayRecord.required += 1;
    coverageByDay[dayKey] = dayRecord;

    coverageByArea[slot.area] = coverageByArea[slot.area] ?? { required: 0, assigned: 0, ratio: 0 };
    coverageByArea[slot.area].required += 1;

    if (assignedBySlot.has(slot.id)) {
      dayRecord.assigned += 1;
      coverageByArea[slot.area].assigned += 1;
    }
  });

  Object.values(coverageByDay).forEach((record) => {
    record.ratio = record.required > 0 ? Number((record.assigned / record.required).toFixed(2)) : 1;
  });

  Object.values(coverageByArea).forEach((record) => {
    record.ratio = record.required > 0 ? Number((record.assigned / record.required).toFixed(2)) : 1;
  });

  return { coverageByDay, coverageByArea };
}

function evaluateCompliance(
  ruleset: LocationRuleSet,
  assignments: AssignedShift[],
  meta: Map<string, SlotMeta>,
  employees: EmployeeProfile[],
): CopilotDraftWarning[] {
  const warnings: CopilotDraftWarning[] = [];
  const compliance = ruleset.compliance;
  const employeeMap = new Map(employees.map((employee) => [employee.id, employee]));

  const assignmentsByEmployee = new Map<string, AssignedShift[]>();
  assignments.forEach((assignment) => {
    assignmentsByEmployee.set(assignment.employeeId, [...(assignmentsByEmployee.get(assignment.employeeId) ?? []), assignment]);
  });

  assignmentsByEmployee.forEach((employeeAssignments, employeeId) => {
    const employee = employeeMap.get(employeeId);
    if (!employee) return;

    const sorted = [...employeeAssignments].sort((a, b) => {
      const aStart = buildDateWithTime(new Date(a.date), a.start);
      const bStart = buildDateWithTime(new Date(b.date), b.start);
      return isBefore(aStart, bStart) ? -1 : 1;
    });

    const totalHours = sorted.reduce((total, assignment) => total + differenceInHours(buildDateWithTime(new Date(assignment.date), assignment.end), buildDateWithTime(new Date(assignment.date), assignment.start)), 0);
    const allowance = employee.maxHoursWeek ?? compliance.maxHoursPerWeek;
    if (totalHours > allowance) {
      warnings.push({
        employeeId,
        severity: 'soft',
        code: 'max_hours_exceeded',
        message: `${employee.name} scheduled for ${totalHours}h (max ${allowance}h).`,
        fixes: [{ label: 'Reduce hours', payload: { employeeId } }],
      });
    }

    for (let i = 0; i < sorted.length - 1; i += 1) {
      const current = sorted[i];
      const next = sorted[i + 1];
      const currentEnd = buildDateWithTime(new Date(current.date), current.end);
      const nextStart = buildDateWithTime(new Date(next.date), next.start);
      const rest = differenceInMinutes(nextStart, currentEnd) / 60;
      if (rest < compliance.minRestHours) {
        warnings.push({
          employeeId,
          slotId: next.slotId,
          severity: 'hard',
          code: 'rest_violation',
          message: `${employee.name} has ${rest.toFixed(1)}h rest before next shift (needs ${compliance.minRestHours}h).`,
          fixes: [{ label: 'Move next shift', payload: { employeeId, slotId: next.slotId } }],
        });
      }
    }

    const assignedDays = sorted.map((assignment) => buildDateWithTime(new Date(assignment.date), assignment.start).getDay());
    let currentStreak = 1;
    let maxStreak = 1;
    for (let i = 1; i < assignedDays.length; i += 1) {
      if ((assignedDays[i - 1] + 1) % 7 === assignedDays[i]) {
        currentStreak += 1;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    if (maxStreak > compliance.maxConsecutiveDays) {
      warnings.push({
        employeeId,
        severity: 'soft',
        code: 'consecutive_days',
        message: `${employee.name} is booked ${maxStreak} consecutive days (limit ${compliance.maxConsecutiveDays}).`,
      });
    }
  });

  assignments.forEach((assignment) => {
    const employee = employeeMap.get(assignment.employeeId);
    if (!employee) return;
    const template = meta.get(assignment.slotId)?.template;
    if (!template) return;
    if (template.isCloser && !employee.availability.some((entry) => entry.canClose)) {
      warnings.push({
        employeeId: assignment.employeeId,
        slotId: assignment.slotId,
        severity: 'hard',
        code: 'closer_capability',
        message: `${employee.name} is scheduled as a closer but is not marked as able to close.`,
      });
    }
  });

  return warnings;
}

function convertEngineWarnings(engineResult: GenerateScheduleResult): CopilotDraftWarning[] {
  return engineResult.warnings.map((warning) => ({
    slotId: warning.slotId,
    severity: 'hard',
    code: 'coverage_gap',
    message: warning.reasons.join('; '),
    fixes: warning.fixes,
  }));
}

async function deletePreviousDrafts(
  ruleset: LocationRuleSet,
  weekStartIso: string,
  weekEndIso: string,
): Promise<void> {
  const { data: existing, error } = await supabase
    .from('schedules')
    .select('id, requirements')
    .eq('location', ruleset.name)
    .eq('is_published', false)
    .gte('start_time', weekStartIso)
    .lt('start_time', weekEndIso);

  if (error) {
    throw error;
  }

  const draftIds = ((existing as ScheduleMinimalRow[] | null) ?? [])
    .filter((row) => {
      const requirements = row.requirements as CopilotRequirementsPayload | null;
      const copilot = requirements?.copilot;
      return copilot?.locationId === ruleset.id && copilot?.weekStart === weekStartIso;
    })
    .map((row) => row.id);

  if (draftIds.length === 0) {
    return;
  }

  const { error: deleteAssignmentsError } = await supabase
    .from('schedule_assignments')
    .delete()
    .in('schedule_id', draftIds);

  if (deleteAssignmentsError) {
    throw deleteAssignmentsError;
  }

  const { error: deleteSchedulesError } = await supabase
    .from('schedules')
    .delete()
    .in('id', draftIds);

  if (deleteSchedulesError) {
    throw deleteSchedulesError;
  }
}

function buildSummary(slots: ShiftSlot[], assignments: AssignedShift[], warnings: CopilotDraftWarning[]): AutoScheduleSummary {
  const { coverageByDay, coverageByArea } = aggregateCoverage(slots, assignments);

  const warningCounts = warnings.reduce(
    (acc, warning) => ({
      hard: acc.hard + (warning.severity === 'hard' ? 1 : 0),
      soft: acc.soft + (warning.severity === 'soft' ? 1 : 0),
    }),
    { hard: 0, soft: 0 },
  );

  return {
    totalSlots: slots.length,
    assigned: assignments.length,
    unassigned: slots.length - assignments.length,
    coverageByDay,
    coverageByArea,
    warningCounts,
  };
}

export async function runCopilotAutoSchedule(
  userId: string,
  companyId: string,
  params: AutoScheduleParams,
): Promise<AutoScheduleResult> {
  const ruleset = getLocationRuleSet(params.locationId);
  if (!ruleset) {
    throw new Error(`No rule set configured for ${params.locationId}`);
  }

  const weekStart = normaliseWeekStart(params.weekStart, ruleset.timezone);
  const weekStartIso = formatISO(weekStart, { representation: 'complete' });
  const weekEndIso = formatISO(addDays(weekStart, 7), { representation: 'complete' });
  const runId = crypto.randomUUID();

  if (!companyId) {
    throw new Error('User must belong to a company to run the copilot');
  }

  if (params.overwriteExisting !== false) {
    await deletePreviousDrafts(ruleset, weekStartIso, weekEndIso);
  }

  const { slots, meta } = buildShiftSlots(ruleset, weekStart);
  const employees = ruleset.employeeSeeds.map(seedToProfile).filter((employee) => employee.locationIds.includes(ruleset.id));

  const policyEngine = new PolicyEngine();
  const engineResult = await generateSchedule(policyEngine, { slots, employees });

  const complianceWarnings = evaluateCompliance(ruleset, engineResult.assignments, meta, employees);
  const engineWarnings = convertEngineWarnings(engineResult);
  const warnings = [...engineWarnings, ...complianceWarnings];
  const summary = buildSummary(slots, engineResult.assignments, warnings);

  const slotWarningsMap = new Map<string, CopilotDraftWarning[]>();
  warnings.forEach((warning) => {
    if (!warning.slotId) return;
    const list = slotWarningsMap.get(warning.slotId) ?? [];
    list.push(warning);
    slotWarningsMap.set(warning.slotId, list);
  });

  const assignmentsBySlot = new Map(engineResult.assignments.map((assignment) => [assignment.slotId, assignment]));

  const schedulePayloads: ScheduleInsert[] = slots.map((slot) => {
    const slotMeta = meta.get(slot.id);
    const warningsForSlot = slotWarningsMap.get(slot.id) ?? [];
    const day = new Date(slot.date);
    const start = buildDateWithTime(day, slot.start);
    const end = buildDateWithTime(day, slot.end);

    const copilotPayload: CopilotScheduleMetadata = {
      runId,
      generatedAt: new Date().toISOString(),
      locationId: ruleset.id,
      locationName: ruleset.name,
      weekStart: weekStartIso,
      slotId: slot.id,
      slotRole: slotMeta?.template.roleName ?? slot.roleId ?? 'Shift',
      slotArea: slot.area,
      slotTags: slotMeta?.template.tags ?? [],
      warnings: warningsForSlot,
      summary,
      status: 'draft',
    };

    return {
      title: slotMeta?.template.roleName ?? `Shift (${slot.area})`,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      location: ruleset.name,
      role: slotMeta?.template.roleId ?? slot.roleId ?? 'shift',
      required_headcount: 1,
      notes: `Copilot draft ${runId}`,
      status: 'draft',
      is_published: false,
      company_id: companyId,
      created_by: userId,
      timezone: ruleset.timezone,
      requirements: { copilot: copilotPayload },
    } as ScheduleInsert;
  });

  const { data: insertedSchedules, error: insertError } = await supabase
    .from('schedules')
    .insert(schedulePayloads)
    .select('id, requirements, start_time');

  if (insertError) {
    throw insertError;
  }

  const assignmentRows: ScheduleAssignmentInsert[] = [];
  ((insertedSchedules as ScheduleMinimalRow[] | null) ?? []).forEach((row) => {
    const requirements = row.requirements as CopilotRequirementsPayload | null;
    const slotId = requirements?.copilot?.slotId;
    if (!slotId) return;
    const assignment = assignmentsBySlot.get(slotId);
    if (!assignment) return;
    assignmentRows.push({
      schedule_id: row.id,
      user_id: assignment.employeeId,
      status: 'draft',
      assigned_by: userId,
      assigned_at: new Date().toISOString(),
    });
  });

  if (assignmentRows.length > 0) {
    const { error: assignmentInsertError } = await supabase
      .from('schedule_assignments')
      .insert(assignmentRows);
    if (assignmentInsertError) {
      throw assignmentInsertError;
    }
  }

  return {
    runId,
    locationId: ruleset.id,
    locationName: ruleset.name,
    weekStart: weekStartIso,
    summary,
    warnings,
    schedulesCreated: ((insertedSchedules as ScheduleMinimalRow[] | null) ?? []).map((row) => row.id),
  };
}

export function describeAvailableRuleSets() {
  return listLocationRuleSets().map((ruleset) => ({
    id: ruleset.id,
    name: ruleset.name,
    timezone: ruleset.timezone,
    weeklyCoverageTemplate: Object.keys(ruleset.coverageTemplates).length,
    employeeCount: ruleset.employeeSeeds.length,
  }));
}
