import assert from "node:assert/strict";
import { draftTasksFromClosingNotes } from "./closingNoteDrafts";

export async function runClosingNoteDraftTests() {
  let calls = 0;
  const clean = await draftTasksFromClosingNotes({
    notes: ["", "  "],
    area: "cashier",
    personId: "person-early",
    model: async () => {
      calls += 1;
      return "{\"tasks\":[]}";
    },
  });
  assert.deepEqual(clean, []);
  assert.equal(calls, 0);

  const drafts = await draftTasksFromClosingNotes({
    notes: ["no coins in the drawer"],
    area: "cashier",
    personId: "person-early",
    model: async (input) => {
      calls += 1;
      assert.equal(input.provider, "xai");
      assert.equal(input.body.model, "grok-4.3");
      assert.equal("search_parameters" in input.body, false);
      return JSON.stringify({
        tasks: [
          {
            title: "Restock the coin drawer",
            description: "no coins in the drawer",
          },
        ],
      });
    },
  });
  assert.equal(calls, 1);
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0]?.title, "Restock the coin drawer");
  assert.equal(drafts[0]?.status, "draft");
  assert.equal(drafts[0]?.accepted, false);
  assert.equal(drafts[0]?.personId, "person-early");
  assert.equal(drafts[0]?.area, "cashier");
}
