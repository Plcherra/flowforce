export const TASK_AUDIENCE_KINDS = [
  "private",
  "people",
  "position",
  "role",
  "department",
  "company",
] as const;

export type TaskAudienceKind = (typeof TASK_AUDIENCE_KINDS)[number];

export type TaskAudience = {
  kind: TaskAudienceKind;
  userIds: string[];
  positionIds: string[];
  roleIds: string[];
  departmentIds: string[];
};

export function emptyTaskAudience(kind: TaskAudienceKind = "private"): TaskAudience {
  return {
    kind,
    userIds: [],
    positionIds: [],
    roleIds: [],
    departmentIds: [],
  };
}

export function defaultTaskAudience(
  assignedTo: string | null | undefined,
): TaskAudience {
  return emptyTaskAudience(assignedTo ? "private" : "company");
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim() !== "");
}

export function parseTaskAudience(raw: unknown): TaskAudience {
  const record =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const kind = TASK_AUDIENCE_KINDS.includes(record.kind as TaskAudienceKind)
    ? (record.kind as TaskAudienceKind)
    : "private";
  return {
    kind,
    userIds: stringList(record.userIds ?? record.user_ids),
    positionIds: stringList(record.positionIds ?? record.position_ids),
    roleIds: stringList(record.roleIds ?? record.role_ids),
    departmentIds: stringList(record.departmentIds ?? record.department_ids),
  };
}

export function taskAudienceJson(audience: TaskAudience) {
  return {
    kind: audience.kind,
    user_ids: audience.userIds,
    position_ids: audience.positionIds,
    role_ids: audience.roleIds,
    department_ids: audience.departmentIds,
  };
}

export function taskAudienceReady(audience: TaskAudience): boolean {
  if (audience.kind === "people") return audience.userIds.length > 0;
  if (audience.kind === "position") return audience.positionIds.length > 0;
  if (audience.kind === "role") return audience.roleIds.length > 0;
  if (audience.kind === "department") return audience.departmentIds.length > 0;
  return true;
}
