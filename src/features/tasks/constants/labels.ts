/**
 * Task status and priority labels
 */

import { labelFor } from "@/hooks/useTasks";
import type { KnownTaskStatus, KnownTaskPriority } from "../types/filters";

export const STATUS_LABELS: Record<KnownTaskStatus, string> = {
  todo: labelFor("todo"),
  in_progress: labelFor("in_progress"),
  review: labelFor("review"),
  blocked: labelFor("blocked"),
  completed: labelFor("completed"),
  done: labelFor("done"),
  cancelled: labelFor("cancelled"),
};

export const PRIORITY_LABELS: Record<KnownTaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
};
