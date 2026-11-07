export type InviteDepartmentDecision =
  | { ok: true; departmentId: string | null }
  | { ok: false; code: "department_required" | "department_forbidden" };

export function inviteDepartmentRejected(
  decision: InviteDepartmentDecision,
): decision is Extract<InviteDepartmentDecision, { ok: false }> {
  return decision.ok === false;
}

export function resolveInviteDepartmentId(params: {
  requestedId: string | null;
  departmentIds: string[];
}): InviteDepartmentDecision {
  const ids = params.departmentIds.filter((id) => id.trim().length > 0);
  const requested = params.requestedId?.trim() || null;
  if (ids.length === 0) {
    if (requested) return { ok: false, code: "department_forbidden" };
    return { ok: true, departmentId: null };
  }
  if (ids.length === 1 && !requested) {
    return { ok: true, departmentId: ids[0] };
  }
  if (!requested) return { ok: false, code: "department_required" };
  if (!ids.includes(requested)) return { ok: false, code: "department_forbidden" };
  return { ok: true, departmentId: requested };
}

export function readHireDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}
