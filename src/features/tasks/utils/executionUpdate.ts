export function executionContentPatch(
  current: { title?: string | null; description?: string | null },
  next: { title: string; description: string },
): { title?: string; description?: string | null } {
  const patch: { title?: string; description?: string | null } = {};
  const title = next.title.trim();
  const description = next.description.trim() || null;
  const currentTitle = (current.title ?? "").trim();
  const currentDescription = (current.description ?? "").trim() || null;
  if (title !== currentTitle) patch.title = title;
  if (description !== currentDescription) patch.description = description;
  return patch;
}
