import assert from "node:assert/strict";
import {
  hiringBlockStillOpen,
  hiringChecklistProgress,
  mergeHiringAnswer,
  openRequiredHiringBlocks,
  type HiringBlock,
} from "./hiringModel";
import { accessLevelKey, directoryMembership } from "@/features/employees/directoryPresence";

function block(partial: Partial<HiringBlock> & Pick<HiringBlock, "id" | "kind">): HiringBlock {
  return {
    title: partial.title ?? partial.id,
    body: "",
    required: partial.required ?? true,
    sortOrder: 0,
    linkUrl: null,
    fileName: null,
    storagePath: null,
    ...partial,
  };
}

export function runHiringFollowupTests() {
  const file = block({ id: "id", kind: "collect_file", title: "Photo ID" });
  const page = block({ id: "welcome", kind: "share_card", title: "Welcome" });
  const shared = block({ id: "handbook", kind: "share_file" });
  assert.equal(hiringBlockStillOpen(file, undefined), true);
  assert.equal(
    hiringBlockStillOpen(file, {
      blockId: "id",
      textValue: "",
      boolValue: null,
      dateValue: null,
      fileName: "id.pdf",
      done: true,
      verified: false,
    }),
    false,
  );
  assert.equal(hiringBlockStillOpen(shared, undefined), false);
  assert.equal(openRequiredHiringBlocks([file, page, shared], {}).length, 2);
  assert.deepEqual(hiringChecklistProgress([file, page, shared], {}), { done: 0, total: 3 });
  const sharedReady = { ...shared, storagePath: "shop/handbook.pdf", fileName: "handbook.pdf" };
  assert.deepEqual(hiringChecklistProgress([file, page, sharedReady], {}), { done: 1, total: 3 });
  const read = mergeHiringAnswer(page, undefined, { boolValue: true, done: true });
  assert.equal(read.done, true);
  assert.deepEqual(hiringChecklistProgress([file, page], { welcome: read }), { done: 1, total: 2 });
  assert.equal(directoryMembership({ invitePending: true, employment_status: "active" }), "invited");
  assert.equal(directoryMembership({ invitePending: false, employment_status: "active" }), "active");
  assert.equal(accessLevelKey("employee"), "hireActivity.accessStaff");
  assert.equal(accessLevelKey("staff"), "hireActivity.accessStaff");
}
