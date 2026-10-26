import {
  normalizeProductRoleKey,
  PRODUCT_ROLE_HIERARCHY,
} from "@/features/roles/constants/productRoles";
import type { CompanyUpdate } from "@/types/companyUpdates";

const MANAGE_LEVEL = PRODUCT_ROLE_HIERARCHY.manager;

export type CompanyUpdatePermissionKey = "systemSettings" | "admin.settings";

export const COMPANY_UPDATE_VIEW_MODES = ["feed", "grid", "list"] as const;

export type CompanyUpdateViewMode = (typeof COMPANY_UPDATE_VIEW_MODES)[number];

/**
 * Managers and above can publish, edit, archive, and delete.
 * A granted settings permission can do the same. Everyone else can read,
 * like, and comment.
 */
export function canManageCompanyUpdates(input: {
  role?: string | null;
  can?: (key: CompanyUpdatePermissionKey) => boolean;
}): boolean {
  if (input.can?.("systemSettings") || input.can?.("admin.settings")) {
    return true;
  }

  const role = normalizeProductRoleKey(input.role);
  if (!role) return false;
  return PRODUCT_ROLE_HIERARCHY[role] >= MANAGE_LEVEL;
}

export function normalizeCompanyUpdateViewMode(
  value: unknown,
): CompanyUpdateViewMode {
  if (value === "grid" || value === "list" || value === "feed") return value;
  return "feed";
}

export function companyUpdateGoesLiveAt(
  update: Pick<
    CompanyUpdate,
    "status" | "scheduledDate" | "publishingSettings"
  >,
): Date | null {
  if (update.status !== "scheduled") return null;
  const date =
    update.scheduledDate || update.publishingSettings?.scheduledDate || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const time = update.publishingSettings?.scheduledTime ?? "09:00";
  if (!/^(\d{2}):(\d{2})$/.test(time)) return null;
  return wallTimeToDate(date, time, update.publishingSettings?.timezone);
}

function wallTimeToDate(
  date: string,
  time: string,
  timeZone?: string | null,
): Date | null {
  const utcGuess = new Date(`${date}T${time}:00Z`);
  if (Number.isNaN(utcGuess.getTime())) return null;
  const zone = timeZone?.trim() || "UTC";
  try {
    const inZone = new Date(
      utcGuess.toLocaleString("en-US", { timeZone: zone }),
    );
    const inUtc = new Date(
      utcGuess.toLocaleString("en-US", { timeZone: "UTC" }),
    );
    return new Date(utcGuess.getTime() - (inZone.getTime() - inUtc.getTime()));
  } catch {
    return utcGuess;
  }
}

export function isCompanyUpdateDue(
  update: Pick<
    CompanyUpdate,
    "status" | "scheduledDate" | "publishingSettings"
  >,
  now = new Date(),
): boolean {
  const liveAt = companyUpdateGoesLiveAt(update);
  if (!liveAt) return false;
  return liveAt.getTime() <= now.getTime();
}

export function sanitizeUpdateSearch(term: string): string {
  return term.replace(/[%_,.()]/g, " ").replace(/\s+/g, " ").trim();
}
