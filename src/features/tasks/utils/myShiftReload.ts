export function myShiftTasksKey(
  tasks: readonly { id?: string | null }[],
): string {
  return tasks
    .map((task) => task.id ?? "")
    .filter((id) => id.length > 0)
    .sort()
    .join("\n");
}
