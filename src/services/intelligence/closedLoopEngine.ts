import dayjs from "dayjs";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/public-types";
import { ENABLE_AI_INSIGHTS } from "@/lib/config";
import {
  ScheduleGuardrailEngine,
  type GuardrailResult,
} from "@/features/scheduling/services/guardrail/scheduleGuardrailEngine";
import { evaluateEmployee, type CopilotDecision } from "@/copilot/rulesEngine";
import { logger } from "@/utils/logger";

type EventRow = Tables<"events">;
type TaskRow = Tables<"tasks">;
type TimeOffRow = Tables<"time_off_requests">;
type ShiftSwapRow = Tables<"shift_swaps">;
type ScheduleRow = Tables<"schedules">;
type AssignmentRow = Tables<"schedule_assignments">;
type IdeaCycleRow = Tables<"idea_cycles">;
type ProfileRow = Tables<"profiles">;

export type ClosedLoopSignalSeverity = NonNullable<EventRow["severity"]>;

export interface ClosedLoopSignal {
  id: string;
  type: EventRow["event_type"] | "document";
  severity: ClosedLoopSignalSeverity;
  occurredAt: string | null;
  summary: string;
  tags: string[];
}

export interface ClosedLoopApproval {
  id: string;
  title: string;
  status: TaskRow["status"];
  priority: TaskRow["priority"];
  dueDate?: string | null;
  source: TaskRow["source"];
  originSignalType?: EventRow["event_type"];
  originSignalSeverity?: EventRow["severity"];
  requiresHumanApproval: boolean;
  createdAt: string | null;
}

export interface ClosedLoopDataHealth {
  key: string;
  status: "ok" | "warning" | "missing";
  message?: string;
}

export interface ClosedLoopMetrics {
  pendingPto: number;
  pendingShiftSwaps: number;
  publishedShare: number | null;
  coverageScore: number | null;
  acknowledgmentRate: number | null;
  laborTargetConfidence: number | null;
  rosterUpdates: number;
  complianceIncidents: number;
  skillMixAlerts: number;
  gmApprovalsPending: number;
  autopilotTasksPending: number;
  unresolvedCriticalEvents: number;
  completedTasks: number;
  resolvedEvents: number;
}

export interface ClosedLoopEvidenceSnapshot {
  completedCriteria: Record<string, boolean | number | string>;
  pendingApprovals: Record<string, boolean>;
  metrics: ClosedLoopMetrics;
}

export interface ClosedLoopLearningReport {
  ideaCycles: IdeaCycleRow[];
  summary: string;
  acknowledgmentRate: number | null;
  completedTasks: number;
  resolvedEvents: number;
}

export interface ClosedLoopInterpretation {
  summary: string;
  themes: string[];
  aiSource?: string;
  generatedAt: string | null;
  riskScore: number;
  employeeDecisions: CopilotDecision[];
}

export interface ClosedLoopApprovals {
  pending: ClosedLoopApproval[];
  readyToAutomate: ClosedLoopApproval[];
  awaitingHuman: ClosedLoopApproval[];
  summary: string;
}

export interface ClosedLoopDetection {
  signals: ClosedLoopSignal[];
  severityBreakdown: Record<ClosedLoopSignalSeverity, number>;
  score: number;
  summary: string;
  dataHealth: ClosedLoopDataHealth[];
}

export interface ClosedLoopExecution {
  guardrail: GuardrailResult;
  evidence: ClosedLoopEvidenceSnapshot;
}

export interface ClosedLoopState {
  generatedAt: string;
  metadata: {
    companyId: string;
    range: { start: string; end: string };
    signalWindowDays: number;
  };
  detection: ClosedLoopDetection;
  interpretation: ClosedLoopInterpretation;
  approvals: ClosedLoopApprovals;
  execution: ClosedLoopExecution;
  learning: ClosedLoopLearningReport;
}

export interface BuildClosedLoopStateParams {
  userId?: string;
  companyId?: string;
  rangeDays?: number;
  includeAiSummary?: boolean;
  aiType?: "dashboard" | "scheduler" | "expenses" | "reports";
  signalLimit?: number;
}

/**
 * Resolve the active company id for the provided user.
 */
async function resolveCompanyId(userId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      logger.warn("[closedLoop] Failed to resolve company id", {
        error,
        tags: ["warning"],
      });
      return null;
    }

    return data?.company_id ?? null;
  } catch (error) {
    logger.warn("[closedLoop] Unexpected error resolving company id", {
      error,
      tags: ["warning"],
    });
    return null;
  }
}

async function fetchOrDefault<T>(
  promise: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
  fallback: T,
  debugLabel: string,
): Promise<T> {
  try {
    const { data, error } = await promise;
    if (error) {
      logger.warn(`[closedLoop] ${debugLabel} query failed`, {
        context: { debugLabel },
        error,
        tags: ["warning"],
      });
      return fallback;
    }
    return data ?? fallback;
  } catch (error) {
    logger.warn(`[closedLoop] ${debugLabel} query threw`, {
      context: { debugLabel },
      error,
      tags: ["warning"],
    });
    return fallback;
  }
}

function buildSignalSummary(signals: ClosedLoopSignal[]): string {
  if (signals.length === 0) {
    return "No new operational signals detected in the selected window.";
  }

  const severityCounts = signals.reduce(
    (acc, signal) => {
      acc[signal.severity] = (acc[signal.severity] ?? 0) + 1;
      return acc;
    },
    {} as Record<ClosedLoopSignalSeverity, number>,
  );

  const high = severityCounts.high ?? 0;
  const medium = severityCounts.medium ?? 0;
  const low = severityCounts.low ?? 0;

  return `Signals: ${high} critical, ${medium} medium, ${low} low priority in the last cycle.`;
}

function scoreSignals(signals: ClosedLoopSignal[]): number {
  return Number(
    signals
      .reduce((acc, signal) => {
        if (signal.severity === "high") return acc + 3;
        if (signal.severity === "medium") return acc + 1.5;
        return acc + 0.5;
      }, 0)
      .toFixed(2),
  );
}

function extractThemes(signals: ClosedLoopSignal[]): string[] {
  const frequencies = new Map<string, number>();
  const register = (text: string) => {
    const words = text.toLowerCase().match(/[a-z]{4,}/g);
    if (!words) return;
    for (const word of words) {
      frequencies.set(word, (frequencies.get(word) ?? 0) + 1);
    }
  };

  signals.forEach((signal) => {
    register(signal.summary);
    signal.tags?.forEach((tag) => register(tag));
  });

  return Array.from(frequencies.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);
}

export function computeGuardrailEvidence(
  metrics: ClosedLoopMetrics,
): ClosedLoopEvidenceSnapshot {
  const completed: Record<string, boolean | number | string> = {};
  const approvals: Record<string, boolean> = {};

  completed["pto-reviewed"] = metrics.pendingPto === 0;
  approvals["pto-reviewed"] = metrics.pendingPto === 0;

  if (metrics.laborTargetConfidence != null) {
    completed["labor-budget-loaded"] = metrics.laborTargetConfidence;
  }

  completed["roster-updated"] = metrics.rosterUpdates > 0;

  if (metrics.coverageScore != null) {
    completed["coverage-targets-met"] = metrics.coverageScore;
  }

  completed["skill-mix-validated"] = metrics.skillMixAlerts === 0;
  completed["compliance-check-passed"] = metrics.complianceIncidents === 0;

  approvals["gm-approval"] = metrics.gmApprovalsPending === 0;
  completed["gm-approval"] = metrics.gmApprovalsPending === 0;

  completed["swap-requests-addressed"] = metrics.pendingShiftSwaps === 0;

  if (metrics.publishedShare != null) {
    completed["schedule-published"] =
      metrics.publishedShare >= 1 ? 1 : metrics.publishedShare;
  }

  if (metrics.acknowledgmentRate != null) {
    completed["ack-rate"] = metrics.acknowledgmentRate;
  }

  return {
    completedCriteria: completed,
    pendingApprovals: approvals,
    metrics,
  };
}

function buildDataHealth(metrics: ClosedLoopMetrics): ClosedLoopDataHealth[] {
  const items: ClosedLoopDataHealth[] = [];

  items.push({
    key: "time_off_requests",
    status: metrics.pendingPto >= 0 ? "ok" : "missing",
    message:
      metrics.pendingPto > 0
        ? `${metrics.pendingPto} PTO requests pending`
        : undefined,
  });

  items.push({
    key: "shift_swaps",
    status: metrics.pendingShiftSwaps >= 0 ? "ok" : "missing",
    message:
      metrics.pendingShiftSwaps > 0
        ? `${metrics.pendingShiftSwaps} swaps waiting`
        : undefined,
  });

  items.push({
    key: "schedule_publish",
    status: metrics.publishedShare != null ? "ok" : "warning",
    message:
      metrics.publishedShare != null && metrics.publishedShare < 1
        ? "Some schedules still in draft."
        : undefined,
  });

  items.push({
    key: "coverage_score",
    status: metrics.coverageScore != null ? "ok" : "warning",
    message:
      metrics.coverageScore != null && metrics.coverageScore < 0.95
        ? "Coverage score below target."
        : undefined,
  });

  items.push({
    key: "ack_rate",
    status: metrics.acknowledgmentRate != null ? "ok" : "warning",
    message:
      metrics.acknowledgmentRate != null && metrics.acknowledgmentRate < 0.95
        ? "Acknowledgement rate under 95%."
        : undefined,
  });

  items.push({
    key: "compliance_incidents",
    status: metrics.complianceIncidents === 0 ? "ok" : "warning",
    message:
      metrics.complianceIncidents > 0
        ? `${metrics.complianceIncidents} compliance issues flagged`
        : undefined,
  });

  return items;
}

function computeRiskScore(
  signals: ClosedLoopSignal[],
  metrics: ClosedLoopMetrics,
): number {
  if (signals.length === 0) {
    return metrics.complianceIncidents > 0 ? 35 : 10;
  }

  const base = scoreSignals(signals);
  const compliancePenalty = metrics.complianceIncidents * 5;
  const unresolvedPenalty = metrics.unresolvedCriticalEvents * 4;

  return Math.min(
    100,
    Math.round(base * 7 + compliancePenalty + unresolvedPenalty),
  );
}

async function fetchEmployeeDecisions(
  employeeIds: string[],
): Promise<CopilotDecision[]> {
  const unique = Array.from(new Set(employeeIds)).slice(0, 3);
  const decisions: CopilotDecision[] = [];

  for (const employeeId of unique) {
    try {
      const decision = await evaluateEmployee(employeeId);
      decisions.push(decision);
    } catch (error) {
      logger.warn("[closedLoop] Unable to evaluate employee context", {
        context: { employeeId },
        error,
        tags: ["warning"],
      });
    }
  }

  return decisions;
}

function buildApprovals(
  tasks: TaskRow[],
  signalsById: Map<string, EventRow>,
): ClosedLoopApprovals {
  const pending: ClosedLoopApproval[] = [];
  const readyToAutomate: ClosedLoopApproval[] = [];
  const awaitingHuman: ClosedLoopApproval[] = [];

  tasks.forEach((task) => {
    const origin = task.origin_event_id
      ? signalsById.get(task.origin_event_id)
      : undefined;
    const requiresHuman = task.status === "review" || task.status === "todo";
    const isAutoSource = task.source !== "manual";

    const approval: ClosedLoopApproval = {
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.due_date,
      source: task.source,
      originSignalSeverity: origin?.severity,
      originSignalType: origin?.event_type,
      requiresHumanApproval: requiresHuman && isAutoSource,
      createdAt: task.created_at,
    };

    const isWaiting = requiresHuman && isAutoSource;
    const isReady = !requiresHuman && isAutoSource;

    if (isWaiting) {
      pending.push(approval);
    } else if (isReady) {
      readyToAutomate.push(approval);
    } else if (requiresHuman) {
      awaitingHuman.push(approval);
    }
  });

  const summary = pending.length
    ? `${pending.length} automation decisions awaiting approval`
    : "No automation approvals pending";

  return {
    pending,
    readyToAutomate,
    awaitingHuman,
    summary,
  };
}

async function fetchAiSummary(
  include: boolean,
  aiType: BuildClosedLoopStateParams["aiType"],
  context: string,
): Promise<{ summary: string; generatedAt: string | null; source?: string }> {
  if (!include || !ENABLE_AI_INSIGHTS) {
    return {
      summary: "AI summary disabled for this query.",
      generatedAt: null,
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke("ai-insights", {
      body: {
        type: aiType ?? "dashboard",
        context,
      },
    });

    if (error) {
      logger.warn("[closedLoop] AI insights invocation failed", {
        error,
        tags: ["warning"],
      });
      return {
        summary: "Unable to generate AI insights at this time.",
        generatedAt: null,
      };
    }

    return {
      summary: data?.insights ?? "AI insights function returned no content.",
      generatedAt: new Date().toISOString(),
      source: "supabase:function:ai-insights",
    };
  } catch (error) {
    logger.warn("[closedLoop] AI insights invocation errored", {
      error,
      tags: ["warning"],
    });
    return {
      summary: "AI insights temporarily unavailable.",
      generatedAt: null,
    };
  }
}

function buildLearningSummary(
  metrics: ClosedLoopMetrics,
  cycles: IdeaCycleRow[],
): string {
  if (cycles.length === 0) {
    return "No IDEA cycles captured yet. Capture a cycle to benchmark improvements.";
  }

  const latest = cycles[0];
  const base = `Latest ${latest.period} cycle is ${latest.status}.`;

  const acknowledgement =
    metrics.acknowledgmentRate != null
      ? ` Acknowledgement rate ${(metrics.acknowledgmentRate * 100).toFixed(0)}%.`
      : "";

  const resolved =
    metrics.resolvedEvents > 0
      ? ` Resolved ${metrics.resolvedEvents} critical signals.`
      : "";

  return `${base}${acknowledgement}${resolved}`;
}

export async function buildClosedLoopState(
  params: BuildClosedLoopStateParams = {},
): Promise<ClosedLoopState> {
  const rangeDays = params.rangeDays ?? 14;
  const rangeEnd = new Date();
  const rangeStart = dayjs(rangeEnd).subtract(rangeDays, "day").toDate();

  const rangeStartIso = rangeStart.toISOString();
  const rangeEndIso = rangeEnd.toISOString();

  const companyId =
    params.companyId ??
    (params.userId ? await resolveCompanyId(params.userId) : null);

  if (!companyId) {
    throw new Error("Closed AI Loop requires a company context.");
  }

  const eventsPromise = supabase
    .from("events")
    .select(
      "id,event_type,severity,occurred_at,summary,tags,details,company_id",
    )
    .eq("company_id", companyId)
    .gte("occurred_at", rangeStartIso)
    .order("occurred_at", { ascending: false })
    .limit(params.signalLimit ?? 60);

  const tasksPromise = supabase
    .from("tasks")
    .select(
      [
        "id",
        "title",
        "status",
        "priority",
        "due_date",
        "source",
        "origin_event_id",
        "created_at",
        "updated_at",
      ].join(","),
    )
    .eq("company_id", companyId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .limit(80);

  const timeOffPromise = supabase
    .from("time_off_requests")
    .select("id,status,start_date,end_date")
    .eq("company_id", companyId)
    .gte("start_date", rangeStartIso.split("T")[0]);

  const shiftSwapPromise = supabase
    .from("shift_swaps")
    .select("id,status,created_at")
    .eq("company_id", companyId);

  const schedulePromise = supabase
    .from("schedules")
    .select(
      "id,start_time,end_time,is_published,required_headcount,hourly_rate,company_id",
    )
    .eq("company_id", companyId)
    .gte("start_time", rangeStartIso)
    .lt("start_time", rangeEndIso);

  const profilePromise = supabase
    .from("profiles")
    .select("id,updated_at,company_id")
    .eq("company_id", companyId)
    .gte("updated_at", rangeStartIso)
    .limit(100);

  const ideaPromise = supabase
    .from("idea_cycles")
    .select(
      "id,stage,range,created_at,updated_at,insights,actions,assessments,company_id",
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(5);

  const [
    eventRows,
    taskRows,
    timeOffRows,
    shiftSwapRows,
    scheduleRows,
    profileRows,
    ideaCycleRows,
  ] = await Promise.all([
    fetchOrDefault<EventRow[]>(eventsPromise, [], "events"),
    fetchOrDefault<TaskRow[]>(tasksPromise, [], "tasks"),
    fetchOrDefault<TimeOffRow[]>(timeOffPromise, [], "time_off"),
    fetchOrDefault<ShiftSwapRow[]>(shiftSwapPromise, [], "shift_swaps"),
    fetchOrDefault<ScheduleRow[]>(schedulePromise, [], "schedules"),
    fetchOrDefault<ProfileRow[]>(profilePromise, [], "profiles"),
    fetchOrDefault<IdeaCycleRow[]>(ideaPromise, [], "idea_cycles"),
  ]);

  const scheduleIds = scheduleRows
    .map((schedule) => schedule.id)
    .filter(Boolean);

  const assignmentsPromise =
    scheduleIds.length === 0
      ? Promise.resolve<{
          data: AssignmentRow[] | null;
          error: PostgrestError | null;
        }>({ data: [], error: null })
      : supabase
          .from("schedule_assignments")
          .select("id,status,confirmed_at,schedule_id")
          .in("schedule_id", scheduleIds);

  const assignmentRows = await fetchOrDefault<AssignmentRow[]>(
    assignmentsPromise,
    [],
    "schedule_assignments",
  );

  const signals: ClosedLoopSignal[] = eventRows.map((event) => ({
    id: event.id,
    type: event.event_type,
    severity: event.severity,
    occurredAt: event.occurred_at,
    summary: event.summary,
    tags: event.tags ?? [],
  }));

  const signalSummary = buildSignalSummary(signals);
  const detectionScore = scoreSignals(signals);
  const severityBreakdown = signals.reduce(
    (acc, signal) => {
      acc[signal.severity] = (acc[signal.severity] ?? 0) + 1;
      return acc;
    },
    {} as Record<ClosedLoopSignalSeverity, number>,
  );

  const published = scheduleRows.filter(
    (schedule) => schedule.is_published,
  ).length;
  const totalSchedules = scheduleRows.length;
  const publishedShare =
    totalSchedules === 0
      ? null
      : Number((published / totalSchedules).toFixed(2));

  const requiredHeadcount = scheduleRows.reduce(
    (acc, schedule) => acc + (schedule.required_headcount ?? 1),
    0,
  );
  const totalAssignments = assignmentRows.length;
  const coverageScore =
    requiredHeadcount === 0
      ? totalSchedules > 0
        ? Number((totalAssignments / (totalSchedules * 1)).toFixed(2))
        : null
      : Number((totalAssignments / requiredHeadcount).toFixed(2));

  const ackAssignments = assignmentRows.filter(
    (assignment) =>
      assignment.status === "acknowledged" || Boolean(assignment.confirmed_at),
  ).length;
  const acknowledgmentRate =
    scheduleIds.length === 0
      ? null
      : totalAssignments === 0
        ? 0
        : Number((ackAssignments / totalAssignments).toFixed(2));

  const laborTargetsPresent =
    scheduleRows.length === 0
      ? null
      : Number(
          (
            scheduleRows.filter((schedule) => schedule.hourly_rate != null)
              .length / scheduleRows.length
          ).toFixed(2),
        );

  const pendingPto = timeOffRows.filter(
    (row) => row.status === "requested",
  ).length;
  const pendingShiftSwaps = shiftSwapRows.filter(
    (swap) => swap.status === "pending",
  ).length;

  const complianceIncidents = signals.filter(
    (signal) => signal.type === "policy_violation" && signal.severity !== "low",
  ).length;
  const skillMixAlerts = signals.filter(
    (signal) => signal.type === "prep_gap" && signal.severity !== "low",
  ).length;

  const gmApprovalsPending = taskRows.filter(
    (task) =>
      task.status === "review" && task.title.toLowerCase().includes("gm"),
  ).length;
  const autopilotTasksPending = taskRows.filter(
    (task) => task.source !== "manual" && task.status !== "completed",
  ).length;

  const highSeveritySignals = new Map(
    signals
      .filter((signal) => signal.severity === "high")
      .map((signal) => [signal.id, signal]),
  );

  const unresolvedCriticalEvents = Array.from(
    highSeveritySignals.values(),
  ).filter((signal) => {
    return !taskRows.some(
      (task) =>
        task.origin_event_id === signal.id && task.status === "completed",
    );
  }).length;

  const resolvedCritical = Array.from(highSeveritySignals.values()).filter(
    (signal) => {
      return taskRows.some(
        (task) =>
          task.origin_event_id === signal.id && task.status === "completed",
      );
    },
  ).length;

  const completedTasks = taskRows.filter((task) => {
    if (task.status !== "completed") return false;
    const completedAt = task.updated_at ?? task.created_at;
    if (!completedAt) return false;
    const completedTime = dayjs(completedAt).valueOf();
    return completedTime >= rangeStart.getTime() && completedTime <= rangeEnd.getTime();
  }).length;

  const metrics: ClosedLoopMetrics = {
    pendingPto,
    pendingShiftSwaps,
    publishedShare,
    coverageScore,
    acknowledgmentRate,
    laborTargetConfidence: laborTargetsPresent,
    rosterUpdates: profileRows.length,
    complianceIncidents,
    skillMixAlerts,
    gmApprovalsPending,
    autopilotTasksPending,
    unresolvedCriticalEvents,
    completedTasks,
    resolvedEvents: resolvedCritical,
  };

  const evidence = computeGuardrailEvidence(metrics);
  const guardrailEngine = new ScheduleGuardrailEngine(
    "restaurant-weekly-schedule",
  );
  const guardrail = guardrailEngine.evaluate({
    rulebookId: "restaurant-weekly-schedule",
    actorRole: "operations_manager",
    action: "publish_schedule",
    completedCriteria: evidence.completedCriteria,
    pendingApprovals: evidence.pendingApprovals,
  });

  const dataHealth = buildDataHealth(metrics);

  const signalsById = new Map(eventRows.map((event) => [event.id, event]));
  const approvals = buildApprovals(taskRows, signalsById);

  const employeeIds = eventRows
    .map((event) => {
      const employeeId = (event.details as Record<string, unknown> | null)
        ?.employee_id;
      if (typeof employeeId === "string") {
        return employeeId;
      }
      return null;
    })
    .filter((value): value is string => Boolean(value));

  const employeeDecisions = await fetchEmployeeDecisions(employeeIds);

  const aiSummary = await fetchAiSummary(
    params.includeAiSummary ?? true,
    params.aiType,
    "closed-loop",
  );

  const interpretation: ClosedLoopInterpretation = {
    summary: aiSummary.summary,
    themes: extractThemes(signals),
    aiSource: aiSummary.source,
    generatedAt: aiSummary.generatedAt,
    riskScore: computeRiskScore(signals, metrics),
    employeeDecisions,
  };

  const detection: ClosedLoopDetection = {
    signals,
    severityBreakdown,
    score: detectionScore,
    summary: signalSummary,
    dataHealth,
  };

  const learning: ClosedLoopLearningReport = {
    ideaCycles: ideaCycleRows,
    summary: buildLearningSummary(metrics, ideaCycleRows),
    acknowledgmentRate: metrics.acknowledgmentRate,
    completedTasks: metrics.completedTasks,
    resolvedEvents: metrics.resolvedEvents,
  };

  return {
    generatedAt: new Date().toISOString(),
    metadata: {
      companyId,
      range: { start: rangeStartIso, end: rangeEndIso },
      signalWindowDays: rangeDays,
    },
    detection,
    interpretation,
    approvals,
    execution: {
      guardrail,
      evidence,
    },
    learning,
  };
}
