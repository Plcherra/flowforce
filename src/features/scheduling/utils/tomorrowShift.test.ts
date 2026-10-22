import assert from "node:assert/strict";
import {
  isClosingShift,
  tomorrowShiftAssignee,
  type ShiftMatch,
} from "./tomorrowShift";

function shift(overrides: Partial<ShiftMatch> & Pick<ShiftMatch, "id" | "start">): ShiftMatch {
  return {
    location: "Store 1",
    role: "Barista",
    positionId: "barista",
    templateId: null,
    assigneeIds: [],
    title: "Closing",
    ...overrides,
  };
}

export function runTomorrowShiftTests() {
  const today = new Date(2026, 9, 22, 21, 0, 0);
  const closing = shift({
    id: "thu-close",
    start: new Date(2026, 9, 22, 16, 0, 0).toISOString(),
    assigneeIds: ["john"],
  });
  const friday = shift({
    id: "fri-close",
    start: new Date(2026, 9, 23, 16, 0, 0).toISOString(),
    assigneeIds: ["ana"],
  });

  assert.equal(isClosingShift({ title: "Closing", role: "Barista" }), true);
  assert.equal(isClosingShift({ title: "Close", role: null }), true);
  assert.equal(isClosingShift({ title: "Opening", role: "Barista" }), false);

  assert.equal(
    tomorrowShiftAssignee({ current: closing, shifts: [closing, friday], today }),
    "ana",
  );
  assert.equal(
    tomorrowShiftAssignee({
      current: shift({
        id: "thu-open",
        title: "Opening",
        start: closing.start,
        assigneeIds: ["john"],
      }),
      shifts: [friday],
      today,
    }),
    null,
  );
  assert.equal(
    tomorrowShiftAssignee({
      current: closing,
      shifts: [shift({ ...friday, location: "Store 2", id: "other-store" })],
      today,
    }),
    null,
  );
  assert.equal(
    tomorrowShiftAssignee({
      current: closing,
      shifts: [shift({ ...friday, assigneeIds: [] })],
      today,
    }),
    null,
  );
  assert.equal(
    tomorrowShiftAssignee({
      current: shift({
        ...closing,
        templateId: "close-template",
        role: "Closer",
      }),
      shifts: [
        shift({
          ...friday,
          templateId: "close-template",
          role: "Something else",
          assigneeIds: ["sam"],
        }),
      ],
      today,
    }),
    "sam",
  );
  assert.equal(
    tomorrowShiftAssignee({
      current: shift({ ...closing, templateId: "close-template" }),
      shifts: [shift({ ...friday, templateId: "open-template" })],
      today,
    }),
    null,
  );
}
