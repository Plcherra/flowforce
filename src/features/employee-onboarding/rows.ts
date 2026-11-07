import type { OnboardingDocument, OnboardingStepKind, OnboardingStepView } from "./types";

export type LooseRow = Record<string, unknown>;

export function text(row: LooseRow, key: string) {
  const value = row[key];
  return typeof value === "string" ? value : "";
}

export function nullableText(row: LooseRow, key: string) {
  const value = row[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function bool(row: LooseRow, key: string) {
  return row[key] === true;
}

export function numberValue(row: LooseRow, key: string) {
  const value = row[key];
  return typeof value === "number" ? value : 0;
}

export function stepKind(value: string): OnboardingStepKind {
  return value === "upload" ? "upload" : "acknowledge";
}

export function documentFromRow(row: LooseRow): OnboardingDocument {
  return {
    id: text(row, "id"),
    title: text(row, "title"),
    storagePath: text(row, "storage_path"),
    fileName: text(row, "file_name"),
    archivedAt: nullableText(row, "archived_at"),
  };
}

export function stepViews(input: {
  steps: LooseRow[];
  progress: LooseRow[];
  documents: OnboardingDocument[];
}): OnboardingStepView[] {
  const progressByStep = new Map(input.progress.map((row) => [text(row, "step_id"), row]));
  const documents = new Map(input.documents.map((document) => [document.id, document]));
  return input.steps.map((row) => {
    const progress = progressByStep.get(text(row, "id"));
    const documentId = nullableText(row, "document_id");
    const document = documentId ? documents.get(documentId) : undefined;
    const archivedDocument = !document || document.archivedAt;
    return {
      id: text(row, "id"),
      progressId: progress ? text(progress, "id") : null,
      title: text(row, "title"),
      body: text(row, "body"),
      kind: stepKind(text(row, "kind")),
      required: bool(row, "required"),
      sortOrder: numberValue(row, "sort_order"),
      done: progress ? text(progress, "status") === "done" : false,
      documentId,
      documentTitle: archivedDocument ? null : document.title,
      documentPath: archivedDocument ? null : document.storagePath,
      fileName: progress ? nullableText(progress, "file_name") : null,
      archivedAt: nullableText(row, "archived_at"),
    };
  });
}
