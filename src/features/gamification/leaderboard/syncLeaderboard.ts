import dayjs, { type Dayjs } from "dayjs";
import { supabase } from "@/integrations/supabase/client";
import { evaluateEmployee } from "@/copilot/rulesEngine";
import type { Employee } from "@/hooks/useEmployees";
import type { RecognitionDetails } from "@/types/recognition";
import { logger } from "@/utils/logger";
import {
  BASE_TRAINING_XP,
  GOAL_COMPLETION_XP,
  RECOGNITION_XP,
  TASK_PRIORITY_XP,
  buildAchievements,
  buildInsights,
  emptyMetrics,
  getBadgeTier,
  shouldSyncLeaderboard,
  toBreakdown,
} from "./calculations";
import type {
  LeaderboardChallenge,
  LeaderboardPeriod,
  LeaderboardSyncMetrics,
  LeaderboardSyncRow,
} from "./types";

type PeriodRange = {
  start: Dayjs | null;
  end: Dayjs | null;
};

const PERIOD_ORDER: LeaderboardPeriod[] = ["weekly", "monthly", "all_time"];

const periodConfig: Record<LeaderboardPeriod, (now: Dayjs) => PeriodRange> = {
  weekly: (now) => ({
    start: now.startOf("week"),
    end: now.endOf("week"),
  }),
  monthly: (now) => ({
    start: now.startOf("month"),
    end: now.endOf("month"),
  }),
  all_time: () => ({
    start: null,
    end: null,
  }),
};

function withinRange(
  dateISO: string | null | undefined,
  range: PeriodRange,
  inclusiveEnd = true,
): boolean {
  if (!dateISO) return false;
  const value = dayjs(dateISO);
  if (!value.isValid()) return false;
  const { start, end } = range;
  if (start && value.isBefore(start, "minute")) return false;
  if (end) {
    if (inclusiveEnd) {
      if (value.isAfter(end, "minute")) return false;
    } else if (!value.isBefore(end, "minute")) {
      return false;
    }
  }
  return true;
}

function ensureMetrics(
  map: Map<string, LeaderboardSyncMetrics>,
  employeeId: string,
): LeaderboardSyncMetrics {
  if (!map.has(employeeId)) {
    map.set(employeeId, emptyMetrics());
  }
  return map.get(employeeId)!;
}

function parseRecognitionDetails(raw: unknown): RecognitionDetails | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as RecognitionDetails;
    } catch (error) {
      logger.warn("[leaderboard] unable to parse recognition details string", {
        error,
        tags: ["warning"],
      });
      return null;
    }
  }
  if (typeof raw === "object") {
    return raw as RecognitionDetails;
  }
  return null;
}

async function collectTaskMetrics(employeeIds: string[], range: PeriodRange) {
  if (employeeIds.length === 0)
    return new Map<string, LeaderboardSyncMetrics>();

  let query = supabase
    .from("tasks")
    .select("id, assigned_to, completed_at, priority, estimated_hours")
    .eq("status", "completed")
    .in("assigned_to", employeeIds);

  if (range.start) {
    query = query.gte("completed_at", range.start.toISOString());
  }
  if (range.end) {
    query = query.lte("completed_at", range.end.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  const metrics = new Map<string, LeaderboardSyncMetrics>();
  (data ?? []).forEach((task) => {
    const employeeId = task.assigned_to;
    if (!employeeId) return;
    const entry = ensureMetrics(metrics, employeeId);
    const priorityKey = (task.priority ?? "").toString().toLowerCase();
    const baseXp = TASK_PRIORITY_XP[priorityKey] ?? 60;
    const estimateBonus =
      task.estimated_hours != null
        ? Math.max(0, Math.round(task.estimated_hours * 10))
        : 0;
    entry.xpTasks += baseXp + estimateBonus;
    entry.taskCount += 1;
    if (priorityKey === "high") {
      entry.highPriorityTaskCount += 1;
    }
  });

  return metrics;
}

async function collectGoalMetrics(employeeIds: string[], range: PeriodRange) {
  if (employeeIds.length === 0)
    return new Map<string, LeaderboardSyncMetrics>();

  const { data, error } = await supabase
    .from("goal_participants")
    .select("user_id, goal:goals(status, completed_at)")
    .in("user_id", employeeIds);

  if (error) throw error;

  const metrics = new Map<string, LeaderboardSyncMetrics>();
  (data ?? []).forEach((row) => {
    const goal = row.goal as {
      status?: string | null;
      completed_at?: string | null;
    } | null;
    if (!goal || goal.status !== "completed") return;
    if (!withinRange(goal.completed_at ?? null, range)) return;
    const entry = ensureMetrics(metrics, row.user_id);
    entry.xpGoals += GOAL_COMPLETION_XP;
    entry.goalCount += 1;
  });

  return metrics;
}

async function collectRecognitionMetrics(
  employeeIds: string[],
  range: PeriodRange,
  companyId: string,
) {
  if (employeeIds.length === 0)
    return new Map<string, LeaderboardSyncMetrics>();

  let query = supabase
    .from("recognitions")
    .select("user_id, awarded_at, reward_details, award_rule")
    .eq("company_id", companyId)
    .in("user_id", employeeIds);

  if (range.start) {
    query = query.gte("awarded_at", range.start.toISOString());
  }
  if (range.end) {
    query = query.lte("awarded_at", range.end.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  const metrics = new Map<string, LeaderboardSyncMetrics>();
  (data ?? []).forEach((row: Record<string, unknown>) => {
    const employeeId = row.user_id as string | null;
    if (!employeeId) return;
    const entry = ensureMetrics(metrics, employeeId);
    const details = parseRecognitionDetails(row.reward_details);
    const xpAward = Math.max(details?.xp_awarded ?? RECOGNITION_XP, 0);
    entry.xpRecognitions += xpAward;
    entry.recognitionCount += 1;
    const awardRule =
      details?.metadata && typeof details.metadata.award_rule === "string"
        ? details.metadata.award_rule
        : (row.award_rule as string | null);
    if (awardRule) {
      entry.badgeCodes.add(awardRule);
    }
  });

  return metrics;
}

async function collectTrainingMetrics(
  employeeIds: string[],
  range: PeriodRange,
  companyId: string,
) {
  if (employeeIds.length === 0)
    return new Map<string, LeaderboardSyncMetrics>();

  let query = supabase
    .from("learning_enrollments")
    .select(
      "employee_id, completed_at, course:learning_courses (title, xp_reward)",
    )
    .in("employee_id", employeeIds)
    .eq("company_id", companyId)
    .not("completed_at", "is", null);

  if (range.start) {
    query = query.gte("completed_at", range.start.toISOString());
  }
  if (range.end) {
    query = query.lte("completed_at", range.end.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  const metrics = new Map<string, LeaderboardSyncMetrics>();
  (data ?? []).forEach((row) => {
    const entry = ensureMetrics(metrics, row.employee_id);
    const course = row.course as {
      title?: string | null;
      xp_reward?: number | null;
    } | null;
    const xpReward = Math.max(course?.xp_reward ?? BASE_TRAINING_XP, 0);
    entry.xpTraining += xpReward;
    entry.trainingCount += 1;
    if (course?.title) {
      entry.coursesCompleted.push(course.title);
    }
  });

  return metrics;
}

function mergeMetrics(
  metricMaps: Map<string, LeaderboardSyncMetrics>[],
): Map<string, LeaderboardSyncMetrics> {
  const merged = new Map<string, LeaderboardSyncMetrics>();
  metricMaps.forEach((map) => {
    map.forEach((value, key) => {
      if (!merged.has(key)) {
        merged.set(key, emptyMetrics());
      }
      const target = merged.get(key)!;
      target.xpTasks += value.xpTasks;
      target.xpGoals += value.xpGoals;
      target.xpRecognitions += value.xpRecognitions;
      target.xpTraining += value.xpTraining;
      target.taskCount += value.taskCount;
      target.highPriorityTaskCount += value.highPriorityTaskCount;
      target.goalCount += value.goalCount;
      target.recognitionCount += value.recognitionCount;
      target.trainingCount += value.trainingCount;
      value.badgeCodes.forEach((code) => target.badgeCodes.add(code));
      target.coursesCompleted.push(...value.coursesCompleted);
    });
  });
  return merged;
}

async function evaluateCopilotChallenges(
  rows: LeaderboardSyncRow[],
): Promise<Map<string, LeaderboardChallenge[]>> {
  const challenges = new Map<string, LeaderboardChallenge[]>();
  const topMonthly = rows
    .filter((row) => row.period === "monthly")
    .sort((a, b) => b.xp_total - a.xp_total)
    .slice(0, 3);

  await Promise.all(
    topMonthly.map(async (row) => {
      try {
        const decision = await evaluateEmployee(row.employee_id);
        const rowChallenges: LeaderboardChallenge[] = [];

        if (decision.skillUpdates.length > 0) {
          const skill = decision.skillUpdates[0];
          rowChallenges.push({
            employeeId: row.employee_id,
            focus: "skills",
            title: "Skill momentum detected",
            description: skill.note ?? `Increase XP for ${skill.role}`,
            reward: "Double XP on next skill checkpoint",
            confidence: Math.min(1, Math.abs(skill.deltaXP) / 150),
            period: row.period,
            periodStart: row.period_start,
            suggestedBadge: decision.badges[0]?.badgeCode ?? null,
          });
        }

        if (decision.badges.length > 0) {
          const badge = decision.badges[0];
          rowChallenges.push({
            employeeId: row.employee_id,
            focus: "recognition",
            title: `Badge opportunity: ${badge.badgeCode}`,
            description: badge.reason,
            reward: "Unlock featured badge + 150 XP",
            confidence: badge.confidence,
            period: row.period,
            periodStart: row.period_start,
            suggestedBadge: badge.badgeCode,
          });
        }

        if (decision.promotion) {
          rowChallenges.push({
            employeeId: row.employee_id,
            focus: "promotion",
            title: `Promotion review: ${decision.promotion.role}`,
            description: decision.promotion.rationale,
            reward: "Copilot promotion bonus",
            confidence: decision.promotion.confidence,
            period: row.period,
            periodStart: row.period_start,
          });
        }

        if (rowChallenges.length > 0) {
          challenges.set(row.employee_id, rowChallenges);
        }
      } catch (error) {
        logger.error("[leaderboard] Copilot evaluation failed", {
          error,
          tags: ["error"],
        });
      }
    }),
  );

  return challenges;
}

export interface SyncLeaderboardOptions {
  companyId: string;
  employees: Employee[];
  periods?: LeaderboardPeriod[];
  now?: Dayjs;
}

export async function syncLeaderboard({
  companyId,
  employees,
  periods = PERIOD_ORDER,
  now = dayjs(),
}: SyncLeaderboardOptions): Promise<boolean> {
  if (!companyId || employees.length === 0) {
    return false;
  }

  const employeeIds = employees.map((employee) => employee.id);
  const employeeMap = new Map(
    employees.map((employee) => [employee.id, employee]),
  );
  const rows: LeaderboardSyncRow[] = [];

  await Promise.all(
    periods.map(async (period) => {
      const range = periodConfig[period](now);
      const [tasks, goals, recognition, training] = await Promise.all([
        collectTaskMetrics(employeeIds, range),
        collectGoalMetrics(employeeIds, range),
        collectRecognitionMetrics(employeeIds, range, companyId),
        collectTrainingMetrics(employeeIds, range, companyId),
      ]);

      const merged = mergeMetrics([tasks, goals, recognition, training]);
      merged.forEach((metrics, employeeId) => {
        const employee = employeeMap.get(employeeId);
        if (!employee) return;
        const breakdown = toBreakdown(metrics);
        const totalXp =
          breakdown.tasks +
          breakdown.goals +
          breakdown.recognitions +
          breakdown.training;

        const row: LeaderboardSyncRow = {
          company_id: companyId,
          employee_id: employeeId,
          department_id:
            employee.department_id ?? employee.department?.id ?? null,
          role: employee.role,
          period,
          period_start: range.start ? range.start.format("YYYY-MM-DD") : null,
          period_end: range.end ? range.end.format("YYYY-MM-DD") : null,
          xp_total: totalXp,
          xp_tasks: breakdown.tasks,
          xp_goals: breakdown.goals,
          xp_recognitions: breakdown.recognitions,
          xp_training: breakdown.training,
          badge_tier: getBadgeTier(totalXp),
          badge_codes: Array.from(metrics.badgeCodes),
          achievements: buildAchievements(metrics),
          insights: buildInsights(breakdown, metrics),
          challenges: [],
          last_challenge_triggered: null,
          last_synced_at: now.toISOString(),
        };

        rows.push(row);
      });
    }),
  );

  if (rows.length === 0) {
    return false;
  }

  const challenges = await evaluateCopilotChallenges(rows);
  rows.forEach((row) => {
    const rowChallenges = challenges.get(row.employee_id);
    if (rowChallenges && rowChallenges.length > 0) {
      row.challenges = rowChallenges;
      row.last_challenge_triggered = now.toISOString();
    }
  });

  const { error } = await supabase
    .from("gamification_leaderboard")
    .upsert(rows, { onConflict: "employee_id,period,period_start" });

  if (error) {
    logger.error("[leaderboard] Failed to sync leaderboard", {
      error,
      tags: ["error"],
    });
    throw error;
  }

  return true;
}

export async function ensureLeaderboardSynced(
  companyId: string,
  employees: Employee[],
  period: LeaderboardPeriod,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("gamification_leaderboard")
    .select("last_synced_at")
    .eq("company_id", companyId)
    .eq("period", period)
    .order("last_synced_at", { ascending: false })
    .limit(1);

  if (error) {
    logger.error("[leaderboard] Failed to check sync status", {
      error,
      tags: ["error"],
    });
    return false;
  }

  const lastSyncedAt = data?.[0]?.last_synced_at ?? null;
  if (!shouldSyncLeaderboard(lastSyncedAt, period)) {
    return false;
  }

  await syncLeaderboard({ companyId, employees, periods: PERIOD_ORDER });
  return true;
}
