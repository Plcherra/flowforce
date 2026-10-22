import assert from "node:assert/strict";
import { performanceTaskPoints } from "./taskPointsTotal";

export function runTaskPointsTotalTests() {
  assert.equal(performanceTaskPoints([40]), 40);
  assert.equal(performanceTaskPoints([40, 10, 0]), 50);
  assert.equal(performanceTaskPoints([40, null, undefined, Number.NaN]), 40);
  assert.equal(performanceTaskPoints([]), 0);
}
