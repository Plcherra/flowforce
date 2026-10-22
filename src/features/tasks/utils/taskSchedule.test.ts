import assert from "node:assert/strict";
import { taskCompletionXp } from "@/features/gamification/leaderboard/calculations";
import {
  dueDateFromWindowEnd,
  formatTaskWindow,
  isTaskListedForViewer,
  mergeTaskSchedule,
  readPublishState,
  readTaskPoints,
  withTaskPoints,
} from "./taskSchedule";

export function runTaskScheduleTests() {
  const end = new Date(2026, 9, 23, 7, 0, 0);
  assert.equal(dueDateFromWindowEnd(end.toISOString()), "2026-10-23");
  assert.equal(dueDateFromWindowEnd(null), null);
  assert.equal(dueDateFromWindowEnd("not-a-date"), null);

  const start = new Date(2026, 9, 22, 7, 0, 0);
  const windowLabel = formatTaskWindow(start.toISOString(), end.toISOString());
  assert.equal(windowLabel?.includes("22"), true);
  assert.equal(windowLabel?.includes("23"), true);
  assert.equal(windowLabel?.includes("7:00 AM"), true);

  const merged = mergeTaskSchedule(
    { schedule_id: "sched-1", form_id: "form-9" },
    {
      startsAt: start.toISOString(),
      endsAt: end.toISOString(),
      publishState: "scheduled",
    },
  );
  assert.equal(merged.schedule_id, "sched-1");
  assert.equal(merged.form_id, "form-9");
  assert.equal(merged.starts_at, start.toISOString());
  assert.equal(merged.ends_at, end.toISOString());
  assert.equal(merged.publish_state, "scheduled");
  assert.equal(readPublishState(null), "published");
  assert.equal(readPublishState({}), "published");

  const creator = "user-a";
  const other = "user-b";
  const startIso = "2026-10-22T11:00:00.000Z";
  const before = new Date("2026-10-22T10:59:59.000Z");
  const atStart = new Date(startIso);
  const draft = { created_by: creator, links: { publish_state: "draft" } };
  const scheduled = {
    created_by: creator,
    links: { publish_state: "scheduled", starts_at: startIso },
  };
  const published = { created_by: creator, links: { schedule_id: "sched-1" } };

  assert.equal(isTaskListedForViewer(draft, other, atStart), false);
  assert.equal(isTaskListedForViewer(draft, creator, before), true);
  assert.equal(isTaskListedForViewer(scheduled, other, before), false);
  assert.equal(isTaskListedForViewer(scheduled, other, atStart), true);
  assert.equal(isTaskListedForViewer(scheduled, creator, before), true);
  assert.equal(
    isTaskListedForViewer(
      { created_by: creator, links: { publish_state: "scheduled" } },
      other,
      atStart,
    ),
    false,
  );
  assert.equal(isTaskListedForViewer(published, other, before), true);
  assert.equal(
    isTaskListedForViewer({ created_by: creator, links: null }, other, before),
    true,
  );

  assert.equal(readTaskPoints({ points: 12 }), 12);
  assert.equal(readTaskPoints({ points: 0 }), 0);
  assert.equal(readTaskPoints({ points: 1.5 }), null);
  assert.equal(readTaskPoints({ points: -3 }), null);
  assert.equal(readTaskPoints(null), null);
  const withPoints = withTaskPoints(
    { schedule_id: "sched-1", publish_state: "published" },
    25,
  );
  assert.equal(withPoints.schedule_id, "sched-1");
  assert.equal(withPoints.points, 25);

  assert.equal(
    taskCompletionXp({
      priority: "high",
      estimated_hours: 2,
      links: { points: 40 },
    }),
    40,
  );
  assert.equal(
    taskCompletionXp({
      priority: "high",
      estimated_hours: 2,
      links: { points: 0 },
    }),
    0,
  );
  assert.equal(
    taskCompletionXp({
      priority: "high",
      estimated_hours: 2,
      links: {},
    }),
    140,
  );
  assert.equal(
    taskCompletionXp({ priority: "low", estimated_hours: null, links: null }),
    50,
  );
  assert.equal(
    taskCompletionXp({ priority: "urgent", estimated_hours: null }),
    60,
  );
}
