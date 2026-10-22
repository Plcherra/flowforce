import assert from "node:assert/strict";
import {
  draftsForSubmission,
  listIssueKeyFromLinks,
  newListIssueDrafts,
} from "./listIssueInsert";

export function runListIssueInsertTests() {
  const drafts = draftsForSubmission({
    formId: "form-1",
    formTitle: "Opening list",
    userId: "person-1",
    fields: [
      { id: "milk", label: "Milk temps", is_required: true },
      { id: "mats", label: "Rubber mats", is_required: false },
    ],
    answers: { milk: " ", mats: { flagged: true } },
    now: new Date("2026-10-22T18:00:00"),
  });
  assert.equal(drafts.length, 2);
  assert.equal(drafts.every((item) => item.assigned_to === "person-1"), true);
  assert.equal(drafts.every((item) => item.source === "form"), true);

  const first = newListIssueDrafts(drafts, []);
  assert.equal(first.length, 2);
  const again = newListIssueDrafts(drafts, first.map((item) => item.links.list_issue_key));
  assert.equal(again.length, 0);

  assert.equal(
    listIssueKeyFromLinks({ list_issue_key: " list-issue:flagged_item:field:form-1:mats:person-1 " }),
    "list-issue:flagged_item:field:form-1:mats:person-1",
  );
  assert.equal(listIssueKeyFromLinks(null), null);
}
