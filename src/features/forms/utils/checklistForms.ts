export const CHECKLIST_AREAS = ["cashier", "supervisor"] as const;
export const CHECKLIST_SLOTS = ["opening", "daily", "closing"] as const;

export type ChecklistArea = (typeof CHECKLIST_AREAS)[number];
export type ChecklistSlot = (typeof CHECKLIST_SLOTS)[number];

export type ChecklistAddress = {
  area: ChecklistArea;
  slot: ChecklistSlot;
};

const CHECKLIST_KEY = "checklist";

export function checklistAddresses(): ChecklistAddress[] {
  return CHECKLIST_AREAS.flatMap((area) =>
    CHECKLIST_SLOTS.map((slot) => ({ area, slot })),
  );
}

export function readChecklistAddress(settings: unknown): ChecklistAddress | null {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return null;
  }
  const checklist = (settings as Record<string, unknown>)[CHECKLIST_KEY];
  if (!checklist || typeof checklist !== "object" || Array.isArray(checklist)) {
    return null;
  }
  const record = checklist as Record<string, unknown>;
  const area = record.area;
  const slot = record.slot;
  if (!isArea(area) || !isSlot(slot)) return null;
  return { area, slot };
}

export function withChecklistAddress(
  settings: unknown,
  address: ChecklistAddress,
): Record<string, unknown> {
  const base =
    settings && typeof settings === "object" && !Array.isArray(settings)
      ? { ...(settings as Record<string, unknown>) }
      : {};
  base[CHECKLIST_KEY] = { area: address.area, slot: address.slot };
  return base;
}

export function findChecklistForm<T extends { settings?: unknown }>(
  forms: readonly T[],
  area: ChecklistArea,
  slot: ChecklistSlot,
): T | null {
  return (
    forms.find((form) => {
      const address = readChecklistAddress(form.settings);
      return address?.area === area && address.slot === slot;
    }) ?? null
  );
}

function isArea(value: unknown): value is ChecklistArea {
  return CHECKLIST_AREAS.includes(value as ChecklistArea);
}

function isSlot(value: unknown): value is ChecklistSlot {
  return CHECKLIST_SLOTS.includes(value as ChecklistSlot);
}
