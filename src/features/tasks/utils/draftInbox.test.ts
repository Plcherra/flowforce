import "@/i18n/config";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DraftInboxList } from "../components/DraftInboxList";
import {
  acceptDraftUpdate,
  dismissDraftUpdate,
  draftTaskInsert,
  editDraft,
  readInboxDraft,
} from "./draftInbox";
import type { ClosingNoteDraft } from "./closingNoteDrafts";

const draft: ClosingNoteDraft = {
  title: "Prep egg salad",
  description: "Egg salad expired, prep first",
  status: "draft",
  area: "cashier",
  personId: "ada",
  accepted: false,
};

export function runDraftInboxTests() {
  const inserted = draftTaskInsert(draft, "owner");
  const inbox = readInboxDraft({
    id: "draft-1",
    title: inserted.title,
    description: inserted.description,
    links: inserted.links,
  });
  assert.ok(inbox);
  assert.equal(readInboxDraft({ id: "x", title: "Nope", links: {} }), null);

  const edited = editDraft(inbox!, "Prep the egg salad", "Prep first");
  assert.equal(edited?.title, "Prep the egg salad");
  assert.equal(editDraft(inbox!, "  ", "x"), null);

  const accepted = acceptDraftUpdate(edited!);
  assert.equal(accepted.status, "todo");
  assert.equal(accepted.assigned_to, "ada");
  assert.equal(accepted.links.publish_state, "published");
  assert.equal(accepted.links.closingNoteDraft.accepted, true);
  assert.equal(
    readInboxDraft({ id: "draft-1", title: accepted.title, links: accepted.links }),
    null,
  );

  const dismissed = dismissDraftUpdate(inbox!);
  assert.equal(dismissed.status, "cancelled");
  assert.equal(dismissed.assigned_to, null);
  assert.equal(dismissed.links.closingNoteDraft.dismissed, true);
  assert.equal(dismissed.links.publish_state, "draft");

  const html = renderToStaticMarkup(
    createElement(DraftInboxList, {
      drafts: [inbox!],
      drafting: false,
      onDraft: () => undefined,
      onChange: () => undefined,
      onAccept: () => undefined,
      onDismiss: () => undefined,
    }),
  );
  assert.match(html, /draft-inbox/);
  assert.match(html, /draft-accept-draft-1/);
  assert.match(html, /draft-dismiss-draft-1/);
  assert.match(html, /Prep egg salad/);
}
