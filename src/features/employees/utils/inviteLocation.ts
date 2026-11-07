import type { ProductLevel } from "@/features/roles/constants/productLevels";

const INVITE_ROLES = new Set(["owner", "admin", "company_admin", "manager"]);

export const INVITE_LOCATION_ERROR_KEYS = {
  location_required: "literals.chooseAStore",
  location_forbidden: "literals.thatStoreIsNotOneYouCanAssign",
  invite_forbidden: "literals.youDoNotHavePermissionToInvite",
  location_row: "literals.eachRowNeedsAStoreYouCanAssign",
} as const;

export type InviteLocationErrorCode = keyof typeof INVITE_LOCATION_ERROR_KEYS;

export type InviteLocationRecord = {
  id: string;
  name: string;
  active: boolean;
};

export function actorCanInvite(params: {
  role: string;
  permissions: Record<string, boolean | undefined>;
}): boolean {
  if (params.permissions.manageUsers === false) return false;
  if (params.permissions.manageUsers === true) return true;
  return INVITE_ROLES.has(params.role.trim().toLowerCase());
}

export function locationsAssignableByActor(params: {
  locations: InviteLocationRecord[];
  actorLevel: ProductLevel;
  actorLocationId: string | null;
  canInvite: boolean;
}): InviteLocationRecord[] {
  if (!params.canInvite) return [];
  const active = params.locations.filter(
    (location) => location.active && location.id.trim().length > 0,
  );
  if (params.actorLevel === "owner" || params.actorLevel === "admin") {
    return active;
  }
  if (params.actorLocationId) {
    return active.filter((location) => location.id === params.actorLocationId);
  }
  return active;
}

export type InviteLocationDecision =
  | { ok: true; locationId: string | null }
  | { ok: false; code: "location_required" | "location_forbidden" };

export function inviteLocationRejected(
  decision: InviteLocationDecision,
): decision is Extract<InviteLocationDecision, { ok: false }> {
  return decision.ok === false;
}

export function resolveInviteLocationId(params: {
  requestedId: string | null;
  allowedIds: string[];
  companyHasActiveLocations: boolean;
}): InviteLocationDecision {
  const requested = params.requestedId?.trim() || null;
  if (!params.companyHasActiveLocations || params.allowedIds.length === 0) {
    if (requested) return { ok: false, code: "location_forbidden" };
    return { ok: true, locationId: null };
  }
  if (params.allowedIds.length === 1 && !requested) {
    return { ok: true, locationId: params.allowedIds[0] };
  }
  if (!requested) return { ok: false, code: "location_required" };
  if (!params.allowedIds.includes(requested)) {
    return { ok: false, code: "location_forbidden" };
  }
  return { ok: true, locationId: requested };
}

export function inviteErrorText(
  translate: (key: string) => string,
  code: string | null | undefined,
  fallback: string,
): string {
  if (code && code in INVITE_LOCATION_ERROR_KEYS) {
    return translate(
      INVITE_LOCATION_ERROR_KEYS[code as InviteLocationErrorCode],
    );
  }
  return fallback;
}
