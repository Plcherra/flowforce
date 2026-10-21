import assert from "node:assert/strict";

import {
  formatRequestedWhen,
  isRequestedOffDay,
  timeLeftLabel,
  timeOffStatusLabel,
} from "./timeOffRequestDetail";

export function runTimeOffRequestDetailTest() {
  assert.equal(timeOffStatusLabel("requested"), "pending");
  assert.equal(timeOffStatusLabel("pending"), "pending");
  assert.equal(timeOffStatusLabel("approved"), "approved");
  assert.equal(timeOffStatusLabel("denied"), "rejected");
  assert.equal(timeOffStatusLabel("rejected"), "rejected");

  const day = new Date(2026, 9, 23, 12, 0, 0);
  const requests = [
    {
      user_id: "staff",
      start_date: "2026-10-23",
      end_date: "2026-10-23",
      status: "requested",
    },
    {
      user_id: "staff",
      start_date: "2026-10-24",
      end_date: "2026-10-24",
      status: "denied",
    },
  ];
  assert.equal(isRequestedOffDay(requests, "staff", day), true);
  assert.equal(
    isRequestedOffDay(requests, "staff", new Date(2026, 9, 24, 12, 0, 0)),
    false,
  );
  assert.equal(formatRequestedWhen("2026-10-23"), "Oct 23, 2026");
  assert.equal(
    timeLeftLabel("2026-10-23", new Date(2026, 9, 21, 8, 0, 0)),
    "Time left: 1d 16h",
  );
  assert.equal(
    timeLeftLabel("2026-10-21", new Date(2026, 9, 21, 8, 0, 0)),
    "Time left: started",
  );
}
