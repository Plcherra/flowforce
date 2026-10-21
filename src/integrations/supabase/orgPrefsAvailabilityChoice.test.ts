import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Database } from "./types";

type OrgPrefsRow = Database["public"]["Tables"]["org_prefs"]["Row"];
type OrgPrefsInsert = Database["public"]["Tables"]["org_prefs"]["Insert"];

const CHOICE_AND_WEEKDAYS = [
  "availability_choice",
  "schedule_window_start_weekday",
  "schedule_window_end_weekday",
  "schedule_posting_weekday",
] as const satisfies ReadonlyArray<keyof OrgPrefsRow & keyof OrgPrefsInsert>;

export function runOrgPrefsAvailabilityChoiceTypeTest() {
  const sample = {
    availability_choice: "open",
    schedule_window_start_weekday: 0,
    schedule_window_end_weekday: 6,
    schedule_posting_weekday: 3,
  } as const satisfies Pick<OrgPrefsRow, (typeof CHOICE_AND_WEEKDAYS)[number]>;

  assert.deepEqual(CHOICE_AND_WEEKDAYS, [
    "availability_choice",
    "schedule_window_start_weekday",
    "schedule_window_end_weekday",
    "schedule_posting_weekday",
  ]);
  assert.equal(sample.availability_choice, "open");
  assert.equal(sample.schedule_window_start_weekday, 0);
  assert.equal(sample.schedule_window_end_weekday, 6);
  assert.equal(sample.schedule_posting_weekday, 3);
  assert.notEqual(sample.availability_choice, "fixed" as const);
  assert.equal(
    "availability_lock_mode" in sample,
    false,
    "the choice is not stored in availability_lock_mode",
  );

  const migration = readFileSync(
    path.join(
      process.cwd(),
      "supabase/migrations/20261021104137_org_prefs_availability_choice.sql",
    ),
    "utf8",
  );
  for (const column of CHOICE_AND_WEEKDAYS) {
    assert.match(migration, new RegExp(column));
  }
  assert.match(migration, /'open'/);
  assert.match(migration, /'fixed'/);
  assert.equal(migration.toLowerCase().includes("flexible"), false);
}
