import assert from "node:assert/strict";
import {
  canActOnListIssue,
  canSeeListIssueGather,
  diffsForListIssueGrant,
  gatheredListIssues,
  listIssueGrant,
  listIssueGrantFromDiffs,
} from "./listIssueGather";

export function runListIssueGatherTests() {
  assert.equal(listIssueGrant({ isOwner: true, read: false, act: false }), "act");
  assert.equal(listIssueGrant({ isOwner: false, read: true, act: false }), "read");
  assert.equal(listIssueGrant({ isOwner: false, read: false, act: true }), "act");
  assert.equal(listIssueGrant({ isOwner: false, read: false, act: false }), "none");
  assert.equal(canSeeListIssueGather("read"), true);
  assert.equal(canSeeListIssueGather("none"), false);
  assert.equal(canActOnListIssue("act"), true);
  assert.equal(canActOnListIssue("read"), false);

  const tasks = [
    { id: "1", source: "form", links: { list_issue_kind: "missed_form" } },
    { id: "2", source: "form", links: { form_id: "form-1" } },
    { id: "3", source: "manual", links: { list_issue_kind: "flagged_item" } },
  ];
  assert.deepEqual(gatheredListIssues(tasks).map((task) => task.id), ["1"]);

  const diffs = diffsForListIssueGrant({}, {}, "read");
  assert.equal(diffs["tasks.list_issues.read"], "allow");
  assert.equal(diffs["tasks.list_issues.act"], undefined);
  const taken = diffsForListIssueGrant(
    { "tasks.list_issues.act": true },
    {},
    "read",
  );
  assert.equal(taken["tasks.list_issues.act"], "deny");
  assert.equal(listIssueGrantFromDiffs({}, diffs), "read");
  assert.equal(listIssueGrantFromDiffs({ "tasks.list_issues.act": true }, {}), "act");
}
