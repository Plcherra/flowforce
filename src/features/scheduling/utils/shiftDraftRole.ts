/** Role stored on a new shift. A blank position stays the staff default. */
export function shiftDraftRole(positionName: string | null | undefined): string {
  const trimmed = positionName?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : "Staff";
}
