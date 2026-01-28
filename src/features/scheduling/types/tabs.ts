/**
 * Types and constants for scheduling tabs
 */

import type { LucideIcon } from "lucide-react";
import { Calendar, Brain, Users, Settings, Clock } from "lucide-react";

export interface SchedulingTab {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

export const SCHEDULING_TABS: SchedulingTab[] = [
  {
    id: "schedule",
    label: "Schedule",
    icon: Calendar,
    description: "Month, week, and staff grid views",
  },
  {
    id: "analytics",
    label: "AI Insights",
    icon: Brain,
    description: "Performance analytics and recommendations",
  },
  {
    id: "staff",
    label: "Staff Management",
    icon: Users,
    description: "Shift swapping and availability",
  },
  {
    id: "workflow",
    label: "Automation",
    icon: Settings,
    description: "Automated workflows and reminders",
  },
  {
    id: "availability",
    label: "Availability",
    icon: Clock,
    description: "Personal and team availability tools",
  },
];
