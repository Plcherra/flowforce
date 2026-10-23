import type { ChecklistArea } from "./checklistForms";

export type AreaShift = {
  area: ChecklistArea;
  slot: "opening" | "daily" | "closing";
  personId: string;
  startsAt: string;
};

export function nextOpeningShift(
  shifts: readonly AreaShift[],
  area: ChecklistArea,
  after: string,
): AreaShift | null {
  const next = shifts
    .filter(
      (shift) =>
        shift.area === area &&
        shift.slot === "opening" &&
        shift.startsAt > after &&
        shift.personId.trim().length > 0,
    )
    .sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  return next[0] ?? null;
}

export function carryClosingNotes(input: {
  area: ChecklistArea;
  notes: readonly string[];
  shifts: readonly AreaShift[];
  closingEndsAt: string;
}): { personId: string | null; notes: string[] } {
  const notes = input.notes.map((note) => note.trim()).filter((note) => note.length > 0);
  if (notes.length === 0) return { personId: null, notes: [] };
  const next = nextOpeningShift(input.shifts, input.area, input.closingEndsAt);
  return { personId: next?.personId ?? null, notes };
}
