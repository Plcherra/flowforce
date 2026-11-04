function taskReloadToken(task: {
  id?: string | null;
  status?: string | null;
  title?: string | null;
  description?: string | null;
  assigned_to?: string | null;
  links?: unknown;
}): string {
  const id = task.id ?? "";
  if (!id) return "";
  const links = task.links == null ? "" : JSON.stringify(task.links);
  return [
    id,
    task.status ?? "",
    task.title ?? "",
    task.description ?? "",
    task.assigned_to ?? "",
    links,
  ].join("\u001f");
}

/** Changes when a field the shift board renders changes, not only when the id set changes. */
export function myShiftTasksKey(
  tasks: readonly {
    id?: string | null;
    status?: string | null;
    title?: string | null;
    description?: string | null;
    assigned_to?: string | null;
    links?: unknown;
  }[],
): string {
  return tasks
    .map((task) => taskReloadToken(task))
    .filter((token) => token.length > 0)
    .sort()
    .join("\n");
}
