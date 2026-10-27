import assert from "node:assert/strict";
import {
  builderPaneMode,
  formsTableMinWidth,
  formsTableScroller,
  paneScroller,
} from "./formsSurface";

export function runFormsSurfaceTests() {
  assert.equal(builderPaneMode(767), "stack");
  assert.equal(builderPaneMode(768), "columns");
  assert.match(formsTableScroller, /overflow-x-auto/);
  assert.match(formsTableScroller, /min-w-0/);
  assert.match(formsTableMinWidth, /min-w-/);
  assert.match(paneScroller, /overflow-y-auto/);
  assert.match(paneScroller, /min-h-0/);
}
