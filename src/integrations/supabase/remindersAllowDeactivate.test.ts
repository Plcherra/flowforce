import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Database } from "./types";

type ReminderRow = Database["public"]["Tables"]["reminders"]["Row"];
type ReminderInsert = Database["public"]["Tables"]["reminders"]["Insert"];

export function runRemindersAllowDeactivateTypeTest() {
  const sample = {
    allow_deactivate: false,
  } as const satisfies Pick<ReminderRow, "allow_deactivate"> &
    Pick<ReminderInsert, "allow_deactivate">;

  assert.equal(sample.allow_deactivate, false);
  assert.equal("task_id" in sample, false);

  const migration = readFileSync(
    path.join(
      process.cwd(),
      "supabase/migrations/20261021110620_reminders_allow_deactivate.sql",
    ),
    "utf8",
  );
  assert.match(migration, /allow_deactivate/);
  assert.match(migration, /reminders/);
}
