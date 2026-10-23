import type { ChecklistArea } from "@/features/forms/utils/checklistForms";
import type { ClosingNoteDraft } from "./closingNoteDrafts";

export type InboxDraft = {
  id: string;
  title: string;
  description: string;
  area: ChecklistArea;
  personId: string | null;
};

type DraftTask = {
  id: string;
  title?: string | null;
  description?: string | null;
  links?: unknown;
};

function draftRecord(links: unknown): Record<string, unknown> | null {
  if (!links || typeof links !== "object" || Array.isArray(links)) return null;
  const raw = (links as Record<string, unknown>).closingNoteDraft;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

export function readInboxDraft(task: DraftTask): InboxDraft | null {
  const stored = draftRecord(task.links);
  if (!stored) return null;
  if (stored.accepted === true || stored.dismissed === true) return null;
  if (stored.area !== "cashier" && stored.area !== "supervisor") return null;
  const title = (task.title ?? "").trim();
  if (!title) return null;
  return {
    id: task.id,
    title,
    description: (task.description ?? "").trim(),
    area: stored.area,
    personId: typeof stored.personId === "string" && stored.personId ? stored.personId : null,
  };
}

export function draftTaskInsert(draft: ClosingNoteDraft, userId: string) {
  return {
    title: draft.title,
    description: draft.description,
    status: "todo" as const,
    source: "form" as const,
    priority: "medium" as const,
    created_by: userId,
    assigned_to: null,
    links: {
      publish_state: "draft",
      closingNoteDraft: {
        accepted: false,
        dismissed: false,
        area: draft.area,
        personId: draft.personId,
      },
    },
  };
}

export function editDraft(
  draft: InboxDraft,
  title: string,
  description: string,
): InboxDraft | null {
  const nextTitle = title.trim();
  if (!nextTitle) return null;
  return { ...draft, title: nextTitle, description: description.trim() };
}

export function acceptDraftUpdate(draft: InboxDraft) {
  return {
    title: draft.title,
    description: draft.description,
    status: "todo" as const,
    source: "form" as const,
    assigned_to: draft.personId,
    links: {
      publish_state: "published",
      closingNoteDraft: {
        accepted: true,
        dismissed: false,
        area: draft.area,
        personId: draft.personId,
      },
    },
  };
}

export function dismissDraftUpdate(draft: InboxDraft) {
  return {
    status: "cancelled" as const,
    assigned_to: null,
    links: {
      publish_state: "draft",
      closingNoteDraft: {
        accepted: false,
        dismissed: true,
        area: draft.area,
        personId: draft.personId,
      },
    },
  };
}
