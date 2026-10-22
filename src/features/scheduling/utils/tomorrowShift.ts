export interface ShiftMatch {
  id: string;
  location: string | null;
  role: string | null;
  positionId: string | null;
  templateId: string | null;
  start: string;
  assigneeIds: string[];
  title: string | null;
}

function normalized(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isClosingShift(shift: {
  title?: string | null;
  role?: string | null;
}): boolean {
  const text = `${shift.title ?? ""} ${shift.role ?? ""}`;
  return /\bclose\b/i.test(text) || /\bclosing\b/i.test(text);
}

function sameShift(current: ShiftMatch, other: ShiftMatch): boolean {
  const currentTemplate = normalized(current.templateId);
  const otherTemplate = normalized(other.templateId);
  if (currentTemplate && otherTemplate) {
    return currentTemplate === otherTemplate;
  }

  const currentPlace = normalized(current.location);
  const otherPlace = normalized(other.location);
  if (!currentPlace || currentPlace !== otherPlace) return false;

  const currentPosition = normalized(current.positionId);
  const otherPosition = normalized(other.positionId);
  if (currentPosition && otherPosition) {
    return currentPosition === otherPosition;
  }

  const currentRole = normalized(current.role);
  const otherRole = normalized(other.role);
  return Boolean(currentRole && currentRole === otherRole);
}

export function tomorrowShiftAssignee(input: {
  current: ShiftMatch;
  shifts: ShiftMatch[];
  today?: Date;
}): string | null {
  if (!isClosingShift(input.current)) return null;

  const today = input.today ?? new Date(input.current.start);
  if (Number.isNaN(today.getTime())) return null;
  const tomorrow = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  );
  const tomorrowKey = localDateKey(tomorrow);

  const matches = input.shifts
    .filter((shift) => shift.id !== input.current.id)
    .filter((shift) => sameShift(input.current, shift))
    .filter((shift) => {
      const start = new Date(shift.start);
      return !Number.isNaN(start.getTime()) && localDateKey(start) === tomorrowKey;
    })
    .filter((shift) => shift.assigneeIds.some((id) => id.trim() !== ""))
    .sort(
      (left, right) =>
        new Date(left.start).getTime() - new Date(right.start).getTime(),
    );

  return matches[0]?.assigneeIds.find((id) => id.trim() !== "")?.trim() ?? null;
}
