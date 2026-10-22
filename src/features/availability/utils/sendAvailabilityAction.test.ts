import assert from "node:assert/strict";

import { approvedFixedAvailabilityWindow } from "@/features/availability/utils/nextAvailabilityWindow";
import { sendAvailabilityAction } from "@/features/availability/utils/sendAvailabilityAction";

export function runSendAvailabilityActionTests() {
  const input = {
    sendDate: "2026-10-22",
    postingWeekday: 6,
    windowStartWeekday: 0,
    windowEndWeekday: 6,
  };
  const windowStart = approvedFixedAvailabilityWindow(input).windowStart;
  const openWeek = sendAvailabilityAction(input, false);
  const lockedWeek = sendAvailabilityAction(input, true);

  assert.equal(openWeek.label, "Send availability");
  assert.equal(openWeek.windowStart, windowStart);
  assert.equal(openWeek.helper.includes(windowStart), true);
  assert.equal(openWeek.writesApprovalRequest, false);
  assert.deepEqual(lockedWeek, openWeek);

  const text = `${openWeek.label} ${openWeek.helper}`;
  assert.equal(text.includes("Save changes"), false);
  assert.equal(text.includes("Request change"), false);
  assert.equal(text.includes("Send for approval"), false);
  assert.notEqual(openWeek.windowStart, approvedFixedAvailabilityWindow(input).postedWindowStart);
}
