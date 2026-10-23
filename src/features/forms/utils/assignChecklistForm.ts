import {
  readChecklistAddress,
  withChecklistAddress,
  type ChecklistAddress,
} from "./checklistForms";

export function withoutChecklistAddress(settings: unknown): Record<string, unknown> {
  const base =
    settings && typeof settings === "object" && !Array.isArray(settings)
      ? { ...(settings as Record<string, unknown>) }
      : {};
  delete base.checklist;
  return base;
}

export function assignChecklistAddress<T extends { id: string; settings?: unknown }>(
  forms: readonly T[],
  formId: string | null,
  address: ChecklistAddress,
): { id: string; settings: Record<string, unknown> }[] {
  const changes: { id: string; settings: Record<string, unknown> }[] = [];
  for (const form of forms) {
    const current = readChecklistAddress(form.settings);
    const sameSlot = current?.area === address.area && current.slot === address.slot;
    if (formId && form.id === formId) {
      changes.push({
        id: form.id,
        settings: withChecklistAddress(form.settings, address),
      });
      continue;
    }
    if (sameSlot) {
      changes.push({ id: form.id, settings: withoutChecklistAddress(form.settings) });
    }
  }
  return changes;
}
