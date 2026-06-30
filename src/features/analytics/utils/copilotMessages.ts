/**
 * Co-Pilot message generation utilities
 */

import type {
  TasksMetrics,
  SchedulingMetrics,
  PerformanceMetrics,
  TileId,
} from "../types/kpi";

interface CopilotMessages {
  tasks: string;
  scheduling: string;
  performance: string;
}

/**
 * Generate Co-Pilot messages for KPI tiles
 */
export function generateCopilotMessages(
  tasksMetrics: TasksMetrics,
  schedulingMetrics: SchedulingMetrics,
  performanceMetrics: PerformanceMetrics,
): CopilotMessages {
  return {
    tasks:
      tasksMetrics.overdue > 0
        ? `Co-Pilot flagged ${tasksMetrics.overdue} overdue task${tasksMetrics.overdue === 1 ? "" : "s"} and is prioritising recovery playbooks for today.`
        : tasksMetrics.dueSoon > 0
          ? `Co-Pilot suggests pre-assigning ${tasksMetrics.dueSoon} task${tasksMetrics.dueSoon === 1 ? "" : "s"} due soon so nothing slips before the weekend.`
          : "Co-Pilot confirms the task queue is cleared. This is a great moment to launch follow-up improvements.",
    scheduling: (() => {
      const coverageAlert = schedulingMetrics.coverage < 80;
      const hoursAlert = schedulingMetrics.hoursUtilization > 110;
      const tasksLagging = schedulingMetrics.tasksBehind;
      if (schedulingMetrics.pendingTimeOff > 4) {
        return `Co-Pilot spotted ${schedulingMetrics.pendingTimeOff} pending time-off requests. Queue a coverage sweep before publishing shifts.`;
      }
      if (coverageAlert) {
        return `Coverage is only ${schedulingMetrics.coverage}%. Reassign a supervisor or tap Copilot to draft backup coverage before publish.`;
      }
      if (hoursAlert) {
        return `Hours utilisation is ${schedulingMetrics.hoursUtilization}% this week. Consider offloading or redistributing longer shifts to avoid burnout.`;
      }
      if (tasksLagging) {
        return `Only ${schedulingMetrics.taskCompletion}% of checklist tasks are closed. Ping the on-duty leads to wrap outstanding items.`;
      }
      return "Coverage, hours, and checklists look healthy. Publish with confidence and keep monitoring new requests.";
    })(),
    performance:
      performanceMetrics.averageCompletionRate < 70
        ? `Co-Pilot suggests a coaching sprint — team completion is averaging ${performanceMetrics.averageCompletionRate}%.`
        : performanceMetrics.topPerformer
          ? `Co-Pilot wants to recognise ${
              `${performanceMetrics.topPerformer.first_name ?? ""} ${performanceMetrics.topPerformer.last_name ?? ""}`.trim() ||
              "your top performer"
            } for leading completion this week.`
          : "Co-Pilot currently has limited performance data. Pull in recent reviews to unlock deeper insights.",
  };
}

/**
 * Generate automation messages for KPI tiles
 */
export function generateAutomationMessages(): Record<TileId, string> {
  return {
    tasks:
      "Co-Pilot will assemble a recovery checklist and push the plan to the AI Actions feed.",
    scheduling:
      "Co-Pilot will balance staffing, apply the latest preferences, and return a publishing-ready draft.",
    performance:
      "Co-Pilot will compile a coaching brief with recognition and follow-up tasks.",
  };
}
