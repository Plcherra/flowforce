import {
  collectListIssues,
  type ListIssueField,
  type ListIssueTaskDraft,
} from "./listIssues";

export function listIssueKeyFromLinks(links: unknown): string | null {
  if (!links || typeof links !== "object") return null;
  const key = (links as { list_issue_key?: unknown }).list_issue_key;
  return typeof key === "string" && key.trim() ? key.trim() : null;
}

export function newListIssueDrafts(
  drafts: ListIssueTaskDraft[],
  existingKeys: Iterable<string>,
): ListIssueTaskDraft[] {
  const seen = new Set(existingKeys);
  const next: ListIssueTaskDraft[] = [];
  for (const item of drafts) {
    const key = item.links.list_issue_key;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(item);
  }
  return next;
}

export function draftsForSubmission(input: {
  formId: string;
  formTitle?: string | null;
  userId: string;
  fields: Array<{
    id: string;
    label?: string | null;
    is_required?: boolean | null;
  }>;
  answers: Record<string, unknown>;
  now?: Date;
}): ListIssueTaskDraft[] {
  const fields: ListIssueField[] = input.fields.map((field) => ({
    id: field.id,
    formId: input.formId,
    label: field.label?.trim() || "Item",
    required: Boolean(field.is_required),
  }));
  return collectListIssues({
    shifts: [],
    fields,
    submissions: [
      {
        formId: input.formId,
        submittedBy: input.userId,
        submittedAt: (input.now ?? new Date()).toISOString(),
        answers: input.answers,
      },
    ],
    forms: [{ id: input.formId, title: input.formTitle }],
    now: input.now ?? new Date(),
  });
}
