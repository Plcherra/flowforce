/**
 * Utility functions for task priority
 */

/**
 * Get color class for priority
 */
export function getPriorityColor(priority: string | null | undefined): string {
  switch (priority) {
    case "urgent":
      return "bg-destructive";
    case "high":
      return "bg-warning";
    case "medium":
      return "bg-warning";
    case "low":
      return "bg-success";
    default:
      return "bg-muted";
  }
}
