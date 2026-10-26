import assert from "node:assert/strict";

import {
  parseCompanyUpdateReactions,
  parseCompanyUpdateRows,
} from "./repositories/companyUpdatesRepository";

const storedUpdate = {
  id: "1",
  company_id: "c",
  title: "Hello",
  body: "Team",
  update_type: "announcement",
  priority: "medium",
  status: "published",
  is_pinned: null,
  likes_count: null,
  comments_count: null,
  views_count: null,
  created_at: "2026-10-26T18:00:00.000Z",
  updated_at: "2026-10-26T18:00:00.000Z",
};

export function runCompanyUpdateRowTests() {
  const [row] = parseCompanyUpdateRows([storedUpdate]);
  assert.equal(row.likes_count, 0);
  assert.equal(row.comments_count, 0);
  assert.equal(row.views_count, 0);
  assert.equal(row.is_pinned, false);

  const [counted] = parseCompanyUpdateRows([
    {
      ...storedUpdate,
      likes_count: "2",
      comments_count: 1,
      views_count: "4",
      is_pinned: true,
    },
  ]);
  assert.equal(counted.likes_count, 2);
  assert.equal(counted.comments_count, 1);
  assert.equal(counted.views_count, 4);
  assert.equal(counted.is_pinned, true);

  const reactions = parseCompanyUpdateReactions([
    { update_id: "u1", reaction_type: "like" },
    { update_id: "u1", reaction_type: "nope" },
    { updateid: "u1", reaction_type: "view" },
  ]);
  assert.equal(reactions.length, 1);
  assert.equal(reactions[0]?.update_id, "u1");
  assert.equal(reactions[0]?.reaction_type, "like");
}
