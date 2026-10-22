import assert from "node:assert/strict";
import {
  roleFetchBlocksUi,
  sameAuthSession,
  sameAuthUser,
} from "./resumeStability";

export function runResumeStabilityTests() {
  const user = { id: "user-1", updated_at: "2026-10-22T00:00:00Z" };
  assert.equal(sameAuthUser(user, { ...user }), true);
  assert.equal(sameAuthUser(user, { ...user, updated_at: "2026-10-22T01:00:00Z" }), false);
  assert.equal(sameAuthUser(null, user), false);
  assert.equal(sameAuthUser(null, null), true);

  const session = { access_token: "token-a", user };
  assert.equal(sameAuthSession(session, { ...session, user: { ...user } }), true);
  assert.equal(sameAuthSession(session, { ...session, access_token: "token-b" }), false);
  assert.equal(sameAuthSession(null, session), false);

  assert.equal(roleFetchBlocksUi(null, "user-1"), true);
  assert.equal(roleFetchBlocksUi("user-1", "user-1"), false);
  assert.equal(roleFetchBlocksUi("user-1", "user-2"), true);
}
