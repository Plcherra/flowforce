export const DEMO_COMPANY_ID = "demo-company";

const MAX_SHIFT_MS = 18 * 60 * 60 * 1000;

export type OpsInviteStep = "invite" | "basics";

export type OpsBasicsDocument = {
  id: string;
  title: string;
};

export type OpsBasicsRule = {
  id: string;
  name: string;
};

export type OpsInviteBasics = {
  welcome: string | null;
  docs: OpsBasicsDocument[];
  rules: OpsBasicsRule[];
};

export type OpsFirstShift = {
  start: string;
  end: string;
};

export function isOpsOnlyInvite(flags: { team?: boolean } | null | undefined) {
  return flags?.team !== true;
}

export function canAddOpsInviteShift(
  permissions: Record<string, boolean> | null | undefined,
) {
  if (!permissions) return false;
  return (
    permissions["schedule.create"] === true ||
    permissions["schedule.edit"] === true ||
    permissions["editSchedules"] === true
  );
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function rowList(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is Record<string, unknown> =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item),
  );
}

export function opsInviteBasics(input: {
  companyId: string | null;
  description: string | null;
  documents: unknown;
  policies: unknown;
}): OpsInviteBasics {
  const welcome =
    input.companyId && input.companyId !== DEMO_COMPANY_ID
      ? text(input.description) || null
      : null;

  const docs: OpsBasicsDocument[] = [];
  const seenDocs = new Set<string>();
  for (const row of rowList(input.documents)) {
    const id = text(row.id);
    const title = text(row.title) || text(row.filename);
    if (!id || !title || seenDocs.has(id)) continue;
    seenDocs.add(id);
    docs.push({ id, title });
  }

  const rules: OpsBasicsRule[] = [];
  const seenRules = new Set<string>();
  for (const row of rowList(input.policies)) {
    const id = text(row.id);
    const name = text(row.name);
    const type = text(row.type);
    if (!id || !name || seenRules.has(id)) continue;
    if (type !== "scheduling_rules") continue;
    if (row.archived_at) continue;
    seenRules.add(id);
    rules.push({ id, name });
  }

  return { welcome, docs, rules };
}

export function opsFirstShiftRange(input: {
  date: string;
  start: string;
  end: string;
}): OpsFirstShift | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return null;
  if (!/^\d{2}:\d{2}$/.test(input.start) || !/^\d{2}:\d{2}$/.test(input.end)) {
    return null;
  }
  const start = new Date(`${input.date}T${input.start}:00`);
  const end = new Date(`${input.date}T${input.end}:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end.getTime() <= start.getTime()) return null;
  if (end.getTime() - start.getTime() > MAX_SHIFT_MS) return null;
  return { start: start.toISOString(), end: end.toISOString() };
}

export function readOpsFirstShift(value: unknown): OpsFirstShift | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const startText = text(record.start);
  const endText = text(record.end);
  const start = new Date(startText);
  const end = new Date(endText);
  if (!startText.includes("T") || !endText.includes("T")) return null;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  if (end.getTime() <= start.getTime()) return null;
  if (end.getTime() - start.getTime() > MAX_SHIFT_MS) return null;
  return { start: start.toISOString(), end: end.toISOString() };
}

export function opsInviteShiftRow(input: {
  companyId: string;
  actorId: string;
  inviteId: string;
  email: string | null;
  title: string;
  roleName: string;
  location: string | null;
  userId: string | null;
  shift: OpsFirstShift;
}): {
  company_id: string;
  created_by: string;
  title: string;
  role: string | null;
  start_time: string;
  end_time: string;
  location: string;
  is_all_day: boolean;
  is_published: boolean;
  is_template: boolean;
  status: string;
  user_id: string | null;
  required_headcount: number;
  break_minutes: number;
  notes: null;
  requirements: {
    opsInvite: {
      inviteId: string;
      email: string | null;
    };
  };
} {
  const title = text(input.title) || text(input.roleName);
  return {
    company_id: input.companyId,
    created_by: input.actorId,
    title,
    role: text(input.roleName) || null,
    start_time: input.shift.start,
    end_time: input.shift.end,
    location: text(input.location),
    is_all_day: false,
    is_published: false,
    is_template: false,
    status: "scheduled",
    user_id: input.userId,
    required_headcount: 1,
    break_minutes: 0,
    notes: null,
    requirements: {
      opsInvite: {
        inviteId: input.inviteId,
        email: input.email,
      },
    },
  };
}
