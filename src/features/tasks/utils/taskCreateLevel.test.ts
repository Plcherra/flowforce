import assert from "node:assert/strict";
import { taskCreateLevel } from "./taskCreateLevel";

export function runTaskCreateLevelTests() {
  assert.equal(
    taskCreateLevel({ createOthers: false, createSelf: false }),
    "none",
  );
  assert.equal(
    taskCreateLevel({
      createOthers: false,
      createSelf: false,
      legacyEdit: false,
    }),
    "none",
  );
  assert.equal(
    taskCreateLevel({
      createOthers: false,
      createSelf: false,
      legacyEdit: true,
    }),
    "others",
  );
  assert.equal(
    taskCreateLevel({
      createOthers: false,
      createSelf: true,
      legacyEdit: true,
    }),
    "self",
  );
  assert.equal(
    taskCreateLevel({ createOthers: true, createSelf: false }),
    "others",
  );
  assert.equal(
    taskCreateLevel({ createOthers: true, createSelf: true }),
    "others",
  );
}
