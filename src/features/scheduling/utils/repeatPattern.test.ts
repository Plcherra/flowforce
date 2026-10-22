import assert from "node:assert/strict";
import {
  occursOn,
  patternFromChoice,
  parseRepeatPattern,
} from "./repeatPattern";

export function runRepeatPatternTests() {
  const everyTwoWeeks = patternFromChoice("every-2-weeks", "2026-10-11");
  assert.equal(occursOn(everyTwoWeeks, "2026-10-11", "2026-10-11"), true);
  assert.equal(occursOn(everyTwoWeeks, "2026-10-11", "2026-10-18"), false);
  assert.equal(occursOn(everyTwoWeeks, "2026-10-11", "2026-10-25"), true);

  const weekly = patternFromChoice("weekly", "2026-10-06");
  assert.equal(occursOn(weekly, "2026-10-06", "2026-10-13"), true);
  assert.equal(occursOn(weekly, "2026-10-06", "2026-10-07"), false);
  assert.equal(occursOn(null, "2026-10-06", "2026-10-13"), false);
  assert.equal(occursOn(null, "2026-10-06", "2026-10-06"), true);

  const everyFifteen = patternFromChoice("every-15-days", "2026-10-01");
  assert.equal(occursOn(everyFifteen, "2026-10-01", "2026-10-16"), true);
  assert.equal(occursOn(everyFifteen, "2026-10-01", "2026-10-15"), false);

  const daily = patternFromChoice("daily", "2026-10-01");
  assert.equal(occursOn(daily, "2026-10-01", "2026-10-03"), true);

  const monthly = patternFromChoice("monthly", "2026-10-11");
  assert.equal(occursOn(monthly, "2026-10-11", "2026-11-11"), true);
  assert.equal(occursOn(monthly, "2026-10-11", "2026-11-12"), false);

  assert.equal(parseRepeatPattern(everyTwoWeeks)?.interval, 2);
  assert.equal(parseRepeatPattern({ frequency: "nope" }), null);
}
