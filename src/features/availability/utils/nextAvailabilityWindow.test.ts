import assert from "node:assert/strict";
import { approvedFixedAvailabilityWindow } from "./nextAvailabilityWindow";

export function runNextAvailabilityWindowTest() {
  const saturdayPosting = approvedFixedAvailabilityWindow({
    sendDate: "2026-10-24",
    postingWeekday: 6,
    windowStartWeekday: 0,
    windowEndWeekday: 6,
  });
  assert.equal(saturdayPosting.postingDate, "2026-10-31");
  assert.equal(saturdayPosting.windowStart, "2026-11-01");
  assert.equal(saturdayPosting.windowEnd, "2026-11-07");
  assert.equal(saturdayPosting.postedWindowStart, "2026-10-25");
  assert.notEqual(
    saturdayPosting.windowStart,
    saturdayPosting.postedWindowStart,
    "a send on the posting weekday is stored for the following window",
  );

  const beforePosting = approvedFixedAvailabilityWindow({
    sendDate: "2026-10-21",
    postingWeekday: 6,
    windowStartWeekday: 0,
    windowEndWeekday: 6,
  });
  assert.equal(beforePosting.postingDate, "2026-10-24");
  assert.equal(beforePosting.windowStart, "2026-10-25");
  assert.equal(beforePosting.postedWindowStart, "2026-10-18");
  assert.notEqual(beforePosting.windowStart, beforePosting.postedWindowStart);

  const tuesdayPosting = approvedFixedAvailabilityWindow({
    sendDate: "2026-10-20",
    postingWeekday: 2,
    windowStartWeekday: 3,
    windowEndWeekday: 1,
  });
  assert.equal(tuesdayPosting.postingDate, "2026-10-27");
  assert.equal(tuesdayPosting.windowStart, "2026-10-28");
  assert.equal(tuesdayPosting.windowEnd, "2026-11-02");
  assert.equal(tuesdayPosting.postedWindowStart, "2026-10-21");
  assert.notEqual(tuesdayPosting.windowStart, tuesdayPosting.postedWindowStart);

  assert.throws(() =>
    approvedFixedAvailabilityWindow({
      sendDate: "2026-10-24",
      postingWeekday: 7,
      windowStartWeekday: 0,
      windowEndWeekday: 6,
    }),
  );
}
