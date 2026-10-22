export type ListIssueKind = "missed_form" | "missing_required" | "flagged_item";

export type ListIssueShift = {
  id: string;
  start: string;
  end: string;
  assigneeIds: string[];
  listFormIds: string[];
  title?: string | null;
};

export type ListIssueField = {
  id: string;
  formId: string;
  label: string;
  required: boolean;
};

export type ListIssueSubmission = {
  formId: string;
  submittedBy: string | null;
  submittedAt: string | null;
  answers: Record<string, unknown>;
};

export type ListIssueTaskDraft = {
  title: string;
  description: string;
  status: "todo";
  source: "form";
  priority: "medium";
  due_date: string;
  assigned_to: string;
  links: {
    form_id: string;
    list_issue_key: string;
    list_issue_kind: ListIssueKind;
    shift_id?: string;
    field_id?: string;
  };
};

function localDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function clean(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function readListFormIds(requirements: unknown): string[] {
  if (!requirements || typeof requirements !== "object") return [];
  const raw = (requirements as { list_form_ids?: unknown }).list_form_ids;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter((id) => id.length > 0);
}

function isFlagged(value: unknown): boolean {
  if (typeof value === "string" && value.trim().toLowerCase() === "issue") {
    return true;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.flagged === true || record.issue === true;
}

function isUnanswered(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if ("value" in record) return isUnanswered(record.value);
    if ("answer" in record) return isUnanswered(record.answer);
  }
  return false;
}

function draft(input: {
  kind: ListIssueKind;
  title: string;
  description: string;
  formId: string;
  assigneeId: string;
  due: string;
  shiftId?: string;
  fieldId?: string;
}): ListIssueTaskDraft {
  const key = [
    "list-issue",
    input.kind,
    input.shiftId ?? "none",
    input.formId,
    input.fieldId ?? "none",
    input.assigneeId,
  ].join(":");
  return {
    title: input.title.slice(0, 80),
    description: input.description,
    status: "todo",
    source: "form",
    priority: "medium",
    due_date: input.due,
    assigned_to: input.assigneeId,
    links: {
      form_id: input.formId,
      list_issue_key: key,
      list_issue_kind: input.kind,
      ...(input.shiftId ? { shift_id: input.shiftId } : {}),
      ...(input.fieldId ? { field_id: input.fieldId } : {}),
    },
  };
}

function submittedDuringShift(
  submission: ListIssueSubmission,
  assigneeId: string,
  formId: string,
  start: Date,
  end: Date,
): boolean {
  if (submission.formId !== formId) return false;
  if (clean(submission.submittedBy) !== assigneeId) return false;
  if (!submission.submittedAt) return false;
  const at = new Date(submission.submittedAt);
  if (Number.isNaN(at.getTime())) return false;
  return at.getTime() >= start.getTime() && at.getTime() <= end.getTime();
}

function shiftAssignee(shift: ListIssueShift, preferred?: string | null): string {
  const ids = shift.assigneeIds.map((id) => id.trim()).filter(Boolean);
  const preferredId = clean(preferred);
  if (preferredId && ids.includes(preferredId)) return preferredId;
  return ids[0] ?? "";
}

export function collectListIssues(input: {
  shifts: ListIssueShift[];
  fields: ListIssueField[];
  submissions: ListIssueSubmission[];
  forms?: Array<{ id: string; title?: string | null }>;
  now: Date;
}): ListIssueTaskDraft[] {
  const drafts: ListIssueTaskDraft[] = [];
  const formTitle = new Map(
    (input.forms ?? []).map((form) => [form.id, clean(form.title) || "List"]),
  );
  const fieldsByForm = new Map<string, ListIssueField[]>();
  for (const field of input.fields) {
    const list = fieldsByForm.get(field.formId) ?? [];
    list.push(field);
    fieldsByForm.set(field.formId, list);
  }

  for (const shift of input.shifts) {
    const start = new Date(shift.start);
    const end = new Date(shift.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    if (input.now.getTime() <= end.getTime()) continue;
    const due = localDate(end);
    const shiftName = clean(shift.title) || "Shift";

    for (const formId of shift.listFormIds) {
      const title = formTitle.get(formId) || "List";
      for (const assigneeId of shift.assigneeIds.map((id) => id.trim()).filter(Boolean)) {
        const done = input.submissions.some((submission) =>
          submittedDuringShift(submission, assigneeId, formId, start, end),
        );
        if (done) continue;
        drafts.push(
          draft({
            kind: "missed_form",
            title: `${title} was not done`,
            description: `${shiftName} ended without ${title}.`,
            formId,
            assigneeId,
            due,
            shiftId: shift.id,
          }),
        );
      }
    }
  }

  for (const submission of input.submissions) {
    const formId = clean(submission.formId);
    if (!formId) continue;
    const fields = fieldsByForm.get(formId) ?? [];
    const shift = input.shifts.find(
      (item) =>
        item.listFormIds.includes(formId) &&
        item.assigneeIds.some((id) => id.trim() === clean(submission.submittedBy)),
    );
    const assigneeId = shift
      ? shiftAssignee(shift, submission.submittedBy)
      : clean(submission.submittedBy);
    if (!assigneeId) continue;
    const due = shift ? localDate(new Date(shift.end)) : localDate(input.now);
    const title = formTitle.get(formId) || "List";

    for (const field of fields) {
      const answer = submission.answers[field.id];
      if (isFlagged(answer)) {
        drafts.push(
          draft({
            kind: "flagged_item",
            title: `${field.label || "Item"} flagged`,
            description: `${field.label || "An item"} was flagged on ${title}.`,
            formId,
            assigneeId,
            due,
            shiftId: shift?.id,
            fieldId: field.id,
          }),
        );
        continue;
      }
      if (field.required && isUnanswered(answer)) {
        drafts.push(
          draft({
            kind: "missing_required",
            title: `${field.label || "Item"} was not answered`,
            description: `${field.label || "A required item"} is missing on ${title}.`,
            formId,
            assigneeId,
            due,
            shiftId: shift?.id,
            fieldId: field.id,
          }),
        );
      }
    }
  }

  return drafts;
}
