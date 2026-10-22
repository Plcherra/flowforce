import assert from "node:assert/strict";
import {
  REPEAT_CHOICES,
  applyChoiceToDays,
  choiceFromPattern,
  customPattern,
  nextThreeDates,
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

  assert.equal(occursOn(everyTwoWeeks, "2026-10-11", "2026-10-26"), false);
  assert.deepEqual(
    REPEAT_CHOICES.map((choice) => choice.label),
    [
      "Does not repeat",
      "Daily",
      "Weekly",
      "Monthly",
      "Every 2 weeks (14 days)",
      "Every 15 days",
      "Custom",
    ],
  );

  const everyTen = customPattern({
    interval: 10,
    unit: "days",
    anchor: "2026-10-01",
  });
  assert.equal(occursOn(everyTen, "2026-10-01", "2026-10-01"), true);
  assert.equal(occursOn(everyTen, "2026-10-01", "2026-10-11"), true);
  assert.equal(occursOn(everyTen, "2026-10-01", "2026-10-21"), true);
  assert.notEqual(everyTen?.interval, 2);
  assert.notEqual(everyTen?.interval, 15);
  assert.equal(customPattern({ interval: 0, unit: "days", anchor: "2026-10-01" }), null);

  assert.deepEqual(nextThreeDates(everyFifteen, "2026-10-01"), [
    "2026-10-01",
    "2026-10-16",
    "2026-10-31",
  ]);
  assert.deepEqual(nextThreeDates(everyTen, "2026-10-01"), [
    "2026-10-01",
    "2026-10-11",
    "2026-10-21",
  ]);

  const sundayPattern = patternFromChoice("every-15-days", "2026-10-11");
  assert.equal(occursOn(sundayPattern, "2026-10-11", "2026-10-12"), false);

  const selected = applyChoiceToDays(
    { 0: null, 6: null },
    [6],
    "every-15-days",
    (day) => (day === 6 ? "2026-10-11" : "2026-10-05"),
  );
  assert.equal(selected[0], null);
  assert.equal(selected[6]?.interval, 15);
  assert.equal(choiceFromPattern(selected[6]), "every-15-days");
}
