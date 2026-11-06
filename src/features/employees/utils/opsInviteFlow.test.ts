import assert from "node:assert/strict";
import {
  canAddOpsInviteShift,
  isOpsOnlyInvite,
  opsFirstShiftRange,
  opsInviteBasics,
  opsInviteShiftRow,
  readOpsFirstShift,
} from "./opsInviteFlow";

export function runOpsInviteFlowTests() {
  assert.equal(isOpsOnlyInvite({ team: false }), true);
  assert.equal(isOpsOnlyInvite({}), true);
  assert.equal(isOpsOnlyInvite({ team: true }), false);

  assert.equal(canAddOpsInviteShift({ "schedule.create": true }), true);
  assert.equal(canAddOpsInviteShift({ editSchedules: true }), true);
  assert.equal(canAddOpsInviteShift({ manageUsers: true }), false);
  assert.equal(canAddOpsInviteShift(null), false);

  const basics = opsInviteBasics({
    companyId: "company-1",
    description: "  Open the side door.  ",
    documents: [
      { id: "doc-1", title: "Opening notes" },
      { id: "doc-1", title: "Opening notes" },
      { id: "doc-blank", title: "   " },
      { id: "", title: "Missing id" },
    ],
    policies: [
      { id: "rule-1", name: "Close by 10", type: "scheduling_rules", archived_at: null },
      { id: "rule-old", name: "Old close", type: "scheduling_rules", archived_at: "2026-01-01" },
      { id: "policy-1", name: "Vacation", type: "time_off", archived_at: null },
    ],
  });
  assert.equal(basics.welcome, "Open the side door.");
  assert.deepEqual(basics.docs, [{ id: "doc-1", title: "Opening notes" }]);
  assert.deepEqual(basics.rules, [{ id: "rule-1", name: "Close by 10" }]);

  const demo = opsInviteBasics({
    companyId: "demo-company",
    description: "Demo workspace used when backend company linking fails.",
    documents: [],
    policies: [],
  });
  assert.equal(demo.welcome, null);
  assert.deepEqual(demo.docs, []);
  assert.deepEqual(demo.rules, []);

  const shift = opsFirstShiftRange({
    date: "2026-11-07",
    start: "09:00",
    end: "17:00",
  });
  assert.ok(shift);
  assert.ok(new Date(shift.end).getTime() > new Date(shift.start).getTime());
  assert.equal(
    opsFirstShiftRange({ date: "2026-11-07", start: "17:00", end: "09:00" }),
    null,
  );
  assert.equal(readOpsFirstShift(shift)?.start, shift.start);
  assert.equal(readOpsFirstShift({ start: "tomorrow", end: "later" }), null);

  const row = opsInviteShiftRow({
    companyId: "company-1",
    actorId: "actor-1",
    inviteId: "invite-1",
    email: "ada@example.com",
    title: "Ada Lovelace",
    roleName: "Barista",
    location: "North",
    userId: null,
    shift: shift!,
  });
  assert.equal(row.is_published, false);
  assert.equal(row.user_id, null);
  assert.equal(row.title, "Ada Lovelace");
  assert.deepEqual(row.requirements, {
    opsInvite: { inviteId: "invite-1", email: "ada@example.com" },
  });
}
