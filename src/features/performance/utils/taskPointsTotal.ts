/** The performance task-points total is the leaderboard task XP. One number. */
export function performanceTaskPoints(
  taskXp: Array<number | null | undefined>,
): number {
  return taskXp.reduce<number>((sum, value) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return sum;
    return sum + value;
  }, 0);
}
