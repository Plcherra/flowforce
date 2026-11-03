/** A company position chosen for a new shift. Access levels are not shift roles. */
export type ShiftPositionChoice = {
  id: string;
  name: string;
};

/**
 * Role stored on a new shift. The text is the company position name.
 * A blank name uses the unassigned-position label from the caller's locale.
 */
export function shiftDraftRole(
  positionName: string | null | undefined,
  unassignedLabel: string,
): string {
  const trimmed = positionName?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : unassignedLabel;
}

/** Fields written when several shifts are created from one position choice. */
export function bulkShiftPositionFields(
  position: ShiftPositionChoice | null | undefined,
  unassignedLabel: string,
): { role: string; position_id: string | null } {
  const id = position?.id?.trim() ?? "";
  const name = position?.name?.trim() ?? "";
  if (!id || !name) {
    return {
      role: shiftDraftRole(null, unassignedLabel),
      position_id: null,
    };
  }
  return {
    role: shiftDraftRole(name, unassignedLabel),
    position_id: id,
  };
}
