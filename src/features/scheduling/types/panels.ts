/**
 * Slide-over panel definitions for secondary scheduling workflows.
 * The main Schedule view stays on-page; panels open contextually.
 */

import type { LucideIcon } from "lucide-react";
import { ArrowRightLeft, Calendar, Clock, Settings, Users } from "lucide-react";

export type SchedulingPanelId =
  | "staff"
  | "availability"
  | "workflow"
  | "timeoff"
  | "swaps";

export interface SchedulingPanel {
  id: SchedulingPanelId;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const SCHEDULING_PANELS: SchedulingPanel[] = [
  {
    id: "staff",
    label: "Staff Management",
    icon: Users,
    description: "Shift swaps, assignments, and time-off requests",
  },
  {
    id: "availability",
    label: "Availability",
    icon: Clock,
    description: "Personal and team availability",
  },
  {
    id: "timeoff",
    label: "Time Off",
    icon: Calendar,
    description: "Request time off or review team requests",
  },
  {
    id: "swaps",
    label: "Shift Swaps",
    icon: ArrowRightLeft,
    description: "Shift swap requests and approvals",
  },
  {
    id: "workflow",
    label: "Automation",
    icon: Settings,
    description: "Automated workflows and reminders",
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
