export type ScheduleLaborRequirements = Record<string, unknown> | null;

export type ScheduleLaborInput = {
  id?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  break_minutes?: number | null;
  required_headcount?: number | null;
  hourly_rate?: number | null;
  user_id?: string | null;
  requirements?: ScheduleLaborRequirements;
};

export type ScheduleLaborCost = {
  netShiftHours: number;
  plannedHeadcount: number;
  plannedLaborHours: number;
  hourlyRate: number | null;
  hourlyRateSource: "schedule" | "requirements" | "missing";
  plannedLaborCost: number | null;
  missingCostBasis: boolean;
};

const RATE_REQUIREMENT_KEYS = [
  "hourly_rate",
  "estimated_hourly_rate",
  "labor_rate",
  "estimated_labor_rate",
  "pay_rate",
] as const;

function toPositiveNumber(value: unknown): number | null {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : NaN;

  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function getRequirementRate(
  requirements: ScheduleLaborRequirements,
): number | null {
  if (!requirements) return null;

  for (const key of RATE_REQUIREMENT_KEYS) {
    const value = toPositiveNumber(requirements[key]);
    if (value !== null) return value;
  }

  return null;
}

export function calculateNetShiftHours(row: ScheduleLaborInput): number {
  if (!row.start_time || !row.end_time) return 0;

  const start = new Date(row.start_time);
  const end = new Date(row.end_time);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

  const grossHours = Math.max((end.getTime() - start.getTime()) / 3_600_000, 0);
  const breakHours = Math.max(Number(row.break_minutes ?? 0), 0) / 60;
  return Math.max(grossHours - breakHours, 0);
}

export function calculateScheduleLaborCost(
  row: ScheduleLaborInput,
): ScheduleLaborCost {
  const netShiftHours = calculateNetShiftHours(row);
  const explicitHeadcount = toPositiveNumber(row.required_headcount);
  const plannedHeadcount = Math.max(explicitHeadcount ?? (row.user_id ? 1 : 1), 1);
  const plannedLaborHours = netShiftHours * plannedHeadcount;
  const scheduleRate = toPositiveNumber(row.hourly_rate);
  const requirementRate = getRequirementRate(row.requirements);
  const hourlyRate = scheduleRate ?? requirementRate;
  const hourlyRateSource = scheduleRate
    ? "schedule"
    : requirementRate
      ? "requirements"
      : "missing";

  return {
    netShiftHours,
    plannedHeadcount,
    plannedLaborHours,
    hourlyRate,
    hourlyRateSource,
    plannedLaborCost:
      hourlyRate && plannedLaborHours > 0 ? plannedLaborHours * hourlyRate : null,
    missingCostBasis: !hourlyRate,
  };
}
