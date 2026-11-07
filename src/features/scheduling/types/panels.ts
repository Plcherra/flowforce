/**
 * Slide-over panel definitions for secondary scheduling workflows.
 * The main Schedule view stays on-page; panels open contextually.
 */

import type { LucideIcon } from "lucide-react";
import { ArrowRightLeft, Calendar, Clock, ScrollText, Settings, Users } from "lucide-react";

export type SchedulingPanelId =
  | "staff"
  | "availability"
  | "workflow"
  | "timeoff"
  | "swaps"
  | "company-policies";

export interface SchedulingPanel {
  id: SchedulingPanelId;
  labelKey: string;
  icon: LucideIcon;
  descriptionKey: string;
}

export const SCHEDULING_PANELS: SchedulingPanel[] = [
  {
    id: "staff",
    labelKey: "schedule.panelTeamRequests",
    icon: Users,
    descriptionKey: "schedule.panelTeamRequestsDescription",
  },
  {
    id: "availability",
    labelKey: "schedule.panelAvailability",
    icon: Clock,
    descriptionKey: "schedule.panelAvailabilityDescription",
  },
  {
    id: "timeoff",
    labelKey: "schedule.panelTimeOff",
    icon: Calendar,
    descriptionKey: "schedule.panelTimeOffDescription",
  },
  {
    id: "swaps",
    labelKey: "schedule.panelShiftSwaps",
    icon: ArrowRightLeft,
    descriptionKey: "schedule.panelShiftSwapsDescription",
  },
  {
    id: "workflow",
    labelKey: "schedule.panelReminders",
    icon: Settings,
    descriptionKey: "schedule.panelRemindersDescription",
  },
  {
    id: "company-policies",
    labelKey: "schedule.companyPolicies",
    icon: ScrollText,
    descriptionKey: "schedule.companyPoliciesDescription",
  },
];

/** Legacy `?tab=` values mapped to panel ids (analytics tab removed). */
export const LEGACY_TAB_TO_PANEL: Record<string, SchedulingPanelId | null> = {
  staff: "staff",
  availability: "availability",
  workflow: "workflow",
  timeoff: "timeoff",
  swaps: "swaps",
  schedule: null,
  analytics: null,
};

export function isSchedulingPanelId(value: string): value is SchedulingPanelId {
  return SCHEDULING_PANELS.some((panel) => panel.id === value);
}
