import assert from "node:assert/strict";

import {
  collectThreadReplies,
  messageToThreadMessage,
  normalizeMessageAttachments,
  replyParentId,
  threadReplyDraft,
  type ThreadReplySource,
} from "./threadReplies";

function source(
  id: string,
  replyToId: string | null,
  createdAt: number,
): ThreadReplySource {
  return { id, replyToId, createdAt };
}

export function runThreadReplyTests() {
  const root = "root";
  const messages = [
    source(root, null, 1),
    source("other", null, 2),
    source("reply-late", root, 5),
    source("reply-early", root, 3),
    source("nested", "reply-early", 4),
    source("elsewhere", "other", 6),
    source("cycle-a", "cycle-b", 7),
    source("cycle-b", "cycle-a", 8),
    source("self", "self", 9),
  ];

  const replies = collectThreadReplies(messages, root);
  assert.deepEqual(
    replies.map((reply) => reply.id),
    ["reply-early", "nested", "reply-late"],
  );
  assert.equal(collectThreadReplies(messages, "missing").length, 0);
  assert.deepEqual(
    collectThreadReplies(messages, "cycle-a").map((reply) => reply.id),
    ["cycle-b"],
  );
  assert.equal(collectThreadReplies(messages, "self").length, 0);
  assert.equal(
    collectThreadReplies(messages, root).some((reply) => reply.id === "self"),
    false,
  );

  assert.equal(threadReplyDraft("  hello  ", root, null)?.content, "hello");
  assert.equal(threadReplyDraft("  hello  ", root, null)?.replyToId, root);
  assert.equal(threadReplyDraft("hello", root, "reply-early")?.replyToId, "reply-early");
  assert.equal(threadReplyDraft("   ", root), null);
  assert.equal(threadReplyDraft("hello", ""), null);

  assert.equal(replyParentId({ reply_to_id: "parent" }), "parent");
  assert.equal(replyParentId({ reply_toid: "legacy", reply_to_id: null }), "legacy");
  assert.equal(replyParentId({ reply_to_id: "" }), null);

  const threadMessage = messageToThreadMessage(
    {
      id: "m1",
      content: "Need more milk",
      created_at: "2026-10-26T08:00:00.000Z",
      sender_id: "user-1",
      reply_to_id: root,
      senderprofile: { first_name: "Ada", last_name: "Lovelace", avatar_url: null },
    },
    "Team member",
  );
  assert.equal(threadMessage.sender.name, "Ada Lovelace");
  assert.equal(threadMessage.sender.id, "user-1");
  assert.equal(threadMessage.parentId, root);
  assert.equal(threadMessage.content, "Need more milk");

  const unnamed = messageToThreadMessage(
    {
      id: "m2",
      content: null,
      created_at: null,
      senderprofile: null,
    },
    "Team member",
  );
  assert.equal(unnamed.sender.name, "Team member");
  assert.equal(unnamed.content, "");
  assert.equal(unnamed.parentId, undefined);

  assert.deepEqual(
    normalizeMessageAttachments([
      { id: "a1", name: "cooler.jpg", size: 12, type: "image/jpeg", path: "co/cooler.jpg" },
      { name: "  " },
      null,
      "nope",
    ]),
    [
      {
        id: "a1",
        name: "cooler.jpg",
        size: 12,
        type: "image/jpeg",
        path: "co/cooler.jpg",
        url: undefined,
      },
    ],
  );
  assert.deepEqual(normalizeMessageAttachments({ name: "not-a-list" }), []);
}
