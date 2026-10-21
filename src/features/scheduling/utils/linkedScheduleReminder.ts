export type LinkedRecordKind = "task" | "form" | "shift";

const FORM_PREFIX = "record.form:";
const SHIFT_PREFIX = "record.shift:";
const TASK_TYPE = "record.task";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isLinkedRecordKind(value: unknown): value is LinkedRecordKind {
  return value === "task" || value === "form" || value === "shift";
}

export function isRecordId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function linkedRecordType(kind: LinkedRecordKind, id: string): string {
  if (kind === "task") return TASK_TYPE;
  return `record.${kind}:${id}`;
}

export function readLinkedRecord(row: {
  type?: string | null;
  task_id?: string | null;
}): { kind: LinkedRecordKind; id: string } | null {
  const type = row.type ?? "";
  if (type.startsWith(FORM_PREFIX)) {
    const id = type.slice(FORM_PREFIX.length).trim();
    return isRecordId(id) ? { kind: "form", id } : null;
  }
  if (type.startsWith(SHIFT_PREFIX)) {
    const id = type.slice(SHIFT_PREFIX.length).trim();
    return isRecordId(id) ? { kind: "shift", id } : null;
  }
  if (type === TASK_TYPE && row.task_id && isRecordId(row.task_id)) {
    return { kind: "task", id: row.task_id };
  }
  if (type === "schedule.assignment" || type.startsWith("schedule.")) {
    return null;
  }
  if (row.task_id && isRecordId(row.task_id)) {
    return { kind: "task", id: row.task_id };
  }
  return null;
}

export function linkedRecordHref(kind: LinkedRecordKind, id: string): string {
  if (kind === "task") return `/app/tasks#task-card-${id}`;
  if (kind === "form") return `/app/forms?form=${encodeURIComponent(id)}`;
  return `/app/enhanced-scheduling?shift=${encodeURIComponent(id)}`;
}
