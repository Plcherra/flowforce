import assert from "node:assert/strict";
import {
  blankStore,
  isPlaceholderStoreName,
  primaryWindow,
  shouldAskForStore,
  storesProblem,
} from "./storeDraft";

export function runStoreDraftTests() {
  assert.equal(isPlaceholderStoreName("Walk-in"), true);
  assert.equal(isPlaceholderStoreName(" walk in "), true);
  assert.equal(isPlaceholderStoreName("Rua"), false);
  assert.equal(shouldAskForStore(0), false);
  assert.equal(shouldAskForStore(1), false);
  assert.equal(shouldAskForStore(2), true);

  const empty = blankStore();
  assert.equal(storesProblem([empty]), "store");

  const rua = blankStore();
  rua.name = "Rua";
  rua.address = "12 High Street";
  assert.equal(storesProblem([rua]), null);
  assert.deepEqual(primaryWindow(rua), { opens: "08:00", closes: "22:00" });

  const closed = blankStore();
  closed.name = "Walk-in";
  assert.equal(storesProblem([closed]), "store");

  const sameClock = blankStore();
  sameClock.name = "Mall";
  sameClock.hours.monday = { closed: false, open: "09:00", close: "09:00" };
  assert.equal(storesProblem([sameClock]), "store");

  const extraBlank = blankStore();
  assert.equal(storesProblem([rua, extraBlank]), null);
}
