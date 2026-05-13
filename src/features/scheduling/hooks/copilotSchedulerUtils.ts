import type { CopilotActionPayload } from "@/server/copilot/CopilotDTO";
import type {
  CoverageGap,
  CoverageTemplatePlan,
  SchedulerEmployee,
  SwapSuggestion,
} from "@/features/scheduling/hooks/copilotSchedulerTypes";

const clampConfidence = (value: number) =>
  Math.min(0.95, Math.max(0.15, value));

export const buildCoverageGapActions = (
  companyId: string,
  actorUserId: string,
  timeframe: { start: string; end: string },
  gaps: CoverageGap[],
): CopilotActionPayload[] =>
  gaps.map((gap) => ({
    companyId,
    actorUserId,
    source: "scheduler",
    dedupeKey: `coverage::${gap.templateId}:${gap.scheduleDate}`,
    actionType: "coverage.gap",
    status: "queued",
    payload: {
      templateId: gap.templateId,
      scheduleDate: gap.scheduleDate,
      location: gap.location,
      role: gap.role,
      missingCount: gap.missingCount,
    },
    evaluation: {
      reason: gap.reason,
      missing: gap.missingCount,
    },
    metadata: {
      priority: Math.min(5, 2 + gap.missingCount),
      location: gap.location,
      requiredRoles: ["manager", "scheduler"],
    },
    notes: [gap.reason],
    confidence: clampConfidence(1 - gap.missingCount * 0.1),
    impacts: [
      {
        metric: "coverage_gaps",
        delta: -gap.missingCount,
        confidence: 0.45,
      },
    ],
    queuedAt: timeframe.start,
  }));

export const buildSwapActions = (
  companyId: string,
  actorUserId: string,
  timeframe: { start: string; end: string },
  swaps: SwapSuggestion[],
): CopilotActionPayload[] =>
  swaps.map((swap) => ({
    companyId,
    actorUserId,
    source: "scheduler",
    dedupeKey: `swap::${swap.id}`,
    actionType: "schedule.swap_suggested",
    status: "queued",
    payload: {
      templateId: swap.templateId,
      scheduleDate: swap.scheduleDate,
      fromEmployeeId: swap.fromEmployeeId,
      toEmployeeId: swap.toEmployeeId,
      fromLocation: swap.fromLocation,
      toLocation: swap.toLocation,
    },
    evaluation: {
      reason: swap.reason,
    },
    metadata: {
      priority: 5,
      requiredRoles: ["manager", "scheduler"],
    },
    notes: [swap.reason],
    confidence: 0.55,
    queuedAt: timeframe.start,
  }));

const normaliseAvailability = (raw: unknown) => {
  if (!raw || typeof raw !== "object")
    return {} as SchedulerEmployee["availability"];
  const entries = raw as Record<string, { start: string; end: string }[]>;
  const map: SchedulerEmployee["availability"] = {};
  for (const [key, windows] of Object.entries(entries)) {
    const normalisedKey = key.toLowerCase().slice(0, 3);
    map[normalisedKey] = Array.isArray(windows)
      ? windows
          .filter(
            (window): window is { start: string; end: string } =>
              typeof window?.start === "string" &&
              typeof window?.end === "string",
          )
          .map((window) => ({ start: window.start, end: window.end }))
      : [];
  }
  return map;
};

export const mapEmployeeRow = (row: any): SchedulerEmployee => ({
  id: row.id,
  companyId: row.company_id,
  profileId: row.profile_id,
  displayName: row.display_name ?? row.metadata?.display_name ?? null,
  role: row.role,
  secondaryRoles: Array.isArray(row.secondary_roles) ? row.secondary_roles : [],
  homeStore: row.home_store,
  weeklyMaxHours:
    typeof row.weekly_max_hours === "number" ? row.weekly_max_hours : 38,
  availability: normaliseAvailability(row.availability),
  metadata:
    typeof row.metadata === "object" && row.metadata !== null
      ? row.metadata
      : {},
});

export const mapCoverageTemplateRow = (row: any): CoverageTemplatePlan => ({
  id: row.id,
  companyId: row.company_id,
  name: row.name,
  role: row.role,
  location: row.location ?? "Store 1",
  dayOfWeek: Number(row.day_of_week) || 0,
  startTime: row.start_time,
  endTime: row.end_time,
  requiredCount: Number(row.required_count) || 0,
  forecastMultiplier:
    typeof row.forecast_multiplier === "number"
      ? row.forecast_multiplier
      : null,
  metadata: typeof row.metadata === "object" ? row.metadata : null,
  priority: Number(row.priority) || 5,
  flexMinutes: Number(row.flex_minutes) || 0,
});
