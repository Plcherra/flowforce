import type { ScheduleRulebook } from "@/types/scheduleRulebook";

// Seed rulebook that captures the core checklist for building a weekly schedule.
// This is intentionally verbose so that the guardrail engine can reason about
// prerequisites, required evidence, and the automation hooks we will plug in later.
export const DEFAULT_SCHEDULE_RULEBOOK: ScheduleRulebook = {
  id: "restaurant-weekly-schedule-v1",
  name: "Restaurant Weekly Scheduling Playbook",
  description:
    "Step-by-step guardrails for producing and publishing a compliant weekly schedule across all locations.",
  version: "1.0.0",
  lastUpdated: new Date().toISOString(),
  ownerRole: "operations_manager",
  steps: [
    {
      id: "collect-staffing-signals",
      title: "Collect staffing signals",
      purpose:
        "Ensure upstream changes (time off, new hires, terminations, labor targets) are captured before planning shifts.",
      mode: "assisted",
      allowedRoles: ["operations_manager", "schedule_admin"],
      completionCriteria: [
        {
          id: "pto-reviewed",
          label: "Reviewed PTO requests for the coverage window",
          description:
            "Every pending PTO request is approved/denied and tagged with coverage notes.",
          evidenceType: "approval",
          approverRole: "people_ops",
          dataSource: "pto.requests.pending",
        },
        {
          id: "labor-budget-loaded",
          label: "Loaded week-over-week labor budget",
          description:
            "Labor target (hours + cost) for each location is entered for the upcoming week.",
          evidenceType: "numeric",
          targetValue: 1,
          dataSource: "finance.laborTargets",
        },
        {
          id: "roster-updated",
          label: "Roster changes applied",
          description:
            "New hires, role changes, and terminations are reflected in the employee roster.",
          evidenceType: "checkbox",
        },
      ],
      blockers: [
        {
          id: "no-planning-without-signals",
          message:
            "Cannot start drafting the schedule until staffing signals are captured.",
          actions: ["start_schedule_draft"],
        },
      ],
    },
    {
      id: "build-shift-draft",
      title: "Build shift draft",
      purpose:
        "Generate draft shifts that satisfy coverage targets while respecting guardrails.",
      mode: "assisted",
      allowedRoles: ["operations_manager", "schedule_admin"],
      completionCriteria: [
        {
          id: "coverage-targets-met",
          label: "Coverage targets satisfied",
          description:
            "Draft shifts cover each location/service period within ±5% of labor targets.",
          evidenceType: "numeric",
          targetValue: 0.95,
          dataSource: "scheduling.coverageScore",
        },
        {
          id: "skill-mix-validated",
          label: "Skill mix validated",
          description:
            "Each shift has required certifications/roles assigned (kitchen lead, FOH closer, etc.).",
          evidenceType: "checkbox",
        },
        {
          id: "compliance-check-passed",
          label: "Compliance check passed",
          description:
            "Labor compliance (breaks, minors, max hours) verified with zero blocking violations.",
          evidenceType: "external",
          dataSource: "compliance.scheduleAudit",
        },
      ],
      blockers: [
        {
          id: "no-publish-without-draft",
          message:
            "Publishing is disabled while the draft coverage score is below target.",
          actions: ["publish_schedule"],
        },
      ],
      followUps: [
        {
          id: "notify-gm-review",
          description:
            "Notify General Manager that the draft is ready for review.",
          automationKey: "notifications.sendDraftReady",
          notifyRoles: ["general_manager"],
        },
      ],
    },
    {
      id: "gm-review-approval",
      title: "GM review and approval",
      purpose: "Secure general manager sign-off before publishing to the team.",
      mode: "manual",
      allowedRoles: ["general_manager"],
      completionCriteria: [
        {
          id: "gm-approval",
          label: "General manager approval recorded",
          description:
            "GM approves the schedule in the system and adds any operational notes.",
          evidenceType: "approval",
          approverRole: "general_manager",
        },
        {
          id: "swap-requests-addressed",
          label: "Last-minute conflicts resolved",
          description:
            "Any conflicts identified during review are resolved or deferred with mitigation plan.",
          evidenceType: "checkbox",
        },
      ],
      blockers: [
        {
          id: "no-publish-without-approval",
          message:
            "Schedule cannot be published until the GM approval step is complete.",
          actions: ["publish_schedule", "notify_team"],
        },
      ],
    },
    {
      id: "publish-and-acknowledge",
      title: "Publish and capture acknowledgements",
      purpose:
        "Release the schedule to the team and ensure all employees confirm receipt before the effective date.",
      mode: "automated",
      allowedRoles: ["operations_manager", "schedule_admin"],
      completionCriteria: [
        {
          id: "schedule-published",
          label: "Schedule published to employees",
          description:
            "System fired publish action and notifications were sent.",
          evidenceType: "external",
          dataSource: "scheduling.publishAudit",
        },
        {
          id: "ack-rate",
          label: "Employee acknowledgement rate ≥ 95%",
          description:
            "Employees confirmed they saw their assignments or manager documented contact attempts.",
          evidenceType: "numeric",
          targetValue: 0.95,
          dataSource: "scheduling.acknowledgements",
        },
      ],
      followUps: [
        {
          id: "week-launch-handoff",
          description:
            "Send handoff summary to shift leads and post schedule snapshot to the Ops channel.",
          automationKey: "notifications.sendLaunchSummary",
          notifyRoles: ["shift_lead", "general_manager"],
        },
      ],
    },
  ],
  constraints: [
    {
      id: "overtime-approval",
      label: "Overtime requires approval",
      description:
        "Any action that puts an employee into overtime must be approved by People Ops first.",
      scope: "action",
      actions: ["assign_shift", "approve_swap"],
      validatorKey: "overtime.guard",
      severity: "blocking",
    },
    {
      id: "minor-hours-limit",
      label: "Minor hour limits",
      description:
        "Employees marked as minors cannot exceed 20 hours or work past 9 PM.",
      scope: "global",
      validatorKey: "labor.minorLimits",
      severity: "warning",
    },
  ],
};

export const scheduleRulebooks: ScheduleRulebook[] = [
  DEFAULT_SCHEDULE_RULEBOOK,
];
