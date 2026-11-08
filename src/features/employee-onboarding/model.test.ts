import assert from "node:assert/strict";
import {
  acceptedOnboardingFile,
  canManageOnboardingDocuments,
  canManageOnboardingSteps,
  companyDocumentPath,
  employeeFilePath,
  formatStartDate,
  nextStepSortOrder,
  onboardingCompletion,
  safeOnboardingFileName,
  startDateIso,
  visibleOnboardingSteps,
} from "./model";
import type { OnboardingStepView } from "./types";

const deny = () => false;

function step(partial: Partial<OnboardingStepView> & Pick<OnboardingStepView, "id">): OnboardingStepView {
  return {
    progressId: partial.id,
    title: partial.title ?? partial.id,
    body: "",
    kind: partial.kind ?? "acknowledge",
    required: partial.required ?? true,
    sortOrder: partial.sortOrder ?? 0,
    done: partial.done ?? false,
    documentId: null,
    documentTitle: null,
    documentPath: null,
    fileName: null,
    archivedAt: partial.archivedAt ?? null,
    ...partial,
  };
}

export function runEmployeeOnboardingModelTests() {
  assert.equal(safeOnboardingFileName("../Photo ID.png"), "Photo-ID.png");
  assert.equal(
    companyDocumentPath("company", "doc", "handbook.pdf"),
    "company/doc/handbook.pdf",
  );
  assert.equal(
    employeeFilePath("company", "person", "progress", "id.webp"),
    "company/person/progress/id.webp",
  );
  assert.equal(companyDocumentPath("company", "doc", "handbook.pdf").split("/")[0], "company");
  assert.equal(employeeFilePath("company", "person", "progress", "id.webp").split("/")[1], "person");

  assert.equal(acceptedOnboardingFile({ type: "application/pdf", size: 20 }), true);
  assert.equal(acceptedOnboardingFile({ type: "image/gif", size: 20 }), true);
  assert.equal(acceptedOnboardingFile({ type: "text/plain", size: 20, name: "notes.txt" }), false);
  assert.equal(
    acceptedOnboardingFile({ type: "", size: 20, name: "hours.xlsx" }),
    true,
  );
  assert.equal(acceptedOnboardingFile({ type: "image/png", size: 0 }), false);
  assert.equal(acceptedOnboardingFile({ type: "image/png", size: 10 * 1024 * 1024 + 1 }), false);

  assert.equal(startDateIso(null, "2026-11-07T09:00:00.000Z"), "2026-11-07T09:00:00.000Z");
  assert.equal(startDateIso("2026-11-16", "2026-11-07T09:00:00.000Z"), "2026-11-16");
  assert.match(formatStartDate("2026-11-16", "en"), /November/);
  assert.equal(formatStartDate(null, "en"), "");

  const steps = [
    step({ id: "later", sortOrder: 2, required: false, done: false }),
    step({ id: "archived", sortOrder: 0, archivedAt: "2026-11-01", done: false }),
    step({ id: "open", sortOrder: 1, done: false }),
    step({ id: "done", sortOrder: 0, done: true }),
  ];
  assert.deepEqual(
    visibleOnboardingSteps(steps).map((item) => item.id),
    ["done", "open", "later"],
  );
  const progress = onboardingCompletion(steps);
  assert.equal(progress.requiredTotal, 2);
  assert.equal(progress.requiredDone, 1);
  assert.equal(progress.canFinish, false);
  assert.equal(onboardingCompletion([step({ id: "only", done: true })]).canFinish, true);
  assert.equal(onboardingCompletion([]).canFinish, true);
  assert.equal(nextStepSortOrder(steps), 3);

  assert.equal(canManageOnboardingSteps({ role: "owner", can: deny }), true);
  assert.equal(canManageOnboardingSteps({ role: "admin", can: deny }), true);
  assert.equal(canManageOnboardingSteps({ role: "manager", can: deny }), false);
  assert.equal(
    canManageOnboardingSteps({ role: "staff", can: (key) => key === "systemSettings" }),
    true,
  );
  assert.equal(canManageOnboardingDocuments({ role: "manager", can: deny }), true);
  assert.equal(canManageOnboardingDocuments({ role: "staff", can: deny }), false);
  assert.equal(
    canManageOnboardingDocuments({ role: "barista", can: (key) => key === "documents.manage" }),
    true,
  );
}
