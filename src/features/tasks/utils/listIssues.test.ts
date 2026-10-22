import assert from "node:assert/strict";
import { collectListIssues, readListFormIds } from "./listIssues";

const shift = {
  id: "shift-1",
  start: "2026-10-22T08:00:00",
  end: "2026-10-22T16:00:00",
  assigneeIds: ["person-1"],
  listFormIds: ["form-1"],
  title: "Barista opening",
};

const fields = [
  { id: "milk", formId: "form-1", label: "Milk temps", required: true },
  { id: "mats", formId: "form-1", label: "Rubber mats", required: false },
];

export function runListIssueTests() {
  assert.deepEqual(readListFormIds({ list_form_ids: [" form-1 ", ""] }), ["form-1"]);
  assert.deepEqual(readListFormIds(null), []);

  const missed = collectListIssues({
    shifts: [shift],
    fields,
    submissions: [],
    forms: [{ id: "form-1", title: "Opening list" }],
    now: new Date("2026-10-22T18:00:00"),
  });
  assert.equal(missed.length, 1);
  assert.equal(missed[0]?.source, "form");
  assert.equal(missed[0]?.assigned_to, "person-1");
  assert.equal(missed[0]?.links.list_issue_kind, "missed_form");
  assert.equal(missed[0]?.due_date, "2026-10-22");

  const answered = collectListIssues({
    shifts: [shift],
    fields,
    submissions: [
      {
        formId: "form-1",
        submittedBy: "person-1",
        submittedAt: "2026-10-22T12:00:00",
        answers: { milk: "38", mats: "ok" },
      },
    ],
    forms: [{ id: "form-1", title: "Opening list" }],
    now: new Date("2026-10-22T18:00:00"),
  });
  assert.equal(answered.length, 0);

  const problems = collectListIssues({
    shifts: [shift],
    fields,
    submissions: [
      {
        formId: "form-1",
        submittedBy: "person-1",
        submittedAt: "2026-10-22T12:00:00",
        answers: { milk: "", mats: { flagged: true } },
      },
    ],
    forms: [{ id: "form-1", title: "Opening list" }],
    now: new Date("2026-10-22T18:00:00"),
  });
  assert.deepEqual(
    problems.map((item) => item.links.list_issue_kind).sort(),
    ["flagged_item", "missing_required"],
  );
  assert.equal(problems.every((item) => item.assigned_to === "person-1"), true);

  const stillOpen = collectListIssues({
    shifts: [shift],
    fields,
    submissions: [],
    now: new Date("2026-10-22T10:00:00"),
  });
  assert.equal(stillOpen.length, 0);
}
