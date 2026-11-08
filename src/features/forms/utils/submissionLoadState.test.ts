import assert from "node:assert/strict";
import { submissionLoadState } from "./submissionLoadState";

export function runSubmissionLoadStateTests() {
  assert.equal(submissionLoadState({ loading: true, failed: false, count: 0 }), "loading");
  assert.equal(submissionLoadState({ loading: false, failed: true, count: 0 }), "error");
  assert.equal(submissionLoadState({ loading: false, failed: false, count: 0 }), "empty");
  assert.equal(submissionLoadState({ loading: false, failed: false, count: 2 }), "ready");
}
