/**
 * Utility functions for task priority
 */

/**
 * Get color class for priority
 */
export function getPriorityColor(priority: string | null | undefined): string {
  switch (priority) {
    case "urgent":
      return "bg-red-500";
    case "high":
      return "bg-orange-500";
    case "medium":
      return "bg-yellow-500";
    case "low":
      return "bg-green-500";
    default:
      return "bg-gray-400";
  }
}
