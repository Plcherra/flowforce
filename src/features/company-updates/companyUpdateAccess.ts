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

/** Grid and list show the description as text. The editor stores HTML. */
export function plainUpdateText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function applyEngagementCounts<
  T extends {
    id: string;
    likes_count: number;
    comments_count: number;
    views_count: number;
  },
>(
  records: T[],
  reactions: Array<{ update_id?: string | null; reaction_type?: string | null }>,
  comments: Array<{ update_id?: string | null }>,
): T[] {
  const counts = new Map<
    string,
    { likes: number; comments: number; views: number }
  >();
  for (const record of records) {
    counts.set(record.id, { likes: 0, comments: 0, views: 0 });
  }
  for (const reaction of reactions) {
    const bucket = reaction.update_id ? counts.get(reaction.update_id) : undefined;
    if (!bucket) continue;
    if (reaction.reaction_type === "like") bucket.likes += 1;
    if (reaction.reaction_type === "view") bucket.views += 1;
  }
  for (const comment of comments) {
    const bucket = comment.update_id ? counts.get(comment.update_id) : undefined;
    if (bucket) bucket.comments += 1;
  }
  return records.map((record) => {
    const count = counts.get(record.id);
    if (!count) return record;
    return {
      ...record,
      likes_count: count.likes,
      comments_count: count.comments,
      views_count: count.views,
    };
  });
}

/** Stored counts are nullable numerics. A missing count is zero. */
export function readCompanyUpdateCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function companyUpdateLoadMessage(
  error: unknown,
  fallback: string,
): string {
  if (
    error !== null &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "ZodError"
  ) {
    return fallback;
  }
  if (error instanceof Error) {
    const message = error.message.trim();
    if (!message || message.startsWith("[") || message.startsWith("{")) {
      return fallback;
    }
    return message;
  }
  return fallback;
}
