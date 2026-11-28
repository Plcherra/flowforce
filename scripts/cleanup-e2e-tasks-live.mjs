#!/usr/bin/env node
/**
 * Delete leftover e2e tasks on the linked database project using the test
 * owner's session only (anon key + TEST_USER_*). No service role.
 */
import { createClient } from "@supabase/supabase-js"; // pragma: allowlist secret

const E2E_TASK_TITLE_PREFIXES = [
  "e2e-task-",
  "e2e-due-by-",
  "e2e task ",
  "e2e list issue",
  "e2e missed opening",
];

function resolveAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || // pragma: allowlist secret
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || // pragma: allowlist secret
    ""
  );
}

function isE2eTaskTitle(title) {
  const normalized = String(title ?? "")
    .trim()
    .toLowerCase();
  return E2E_TASK_TITLE_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix.toLowerCase()),
  );
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; // pragma: allowlist secret
  const key = resolveAnonKey();
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!url || !key) {
    throw new Error("Missing public database URL or anon/publishable key.");
  }
  if (!email || !password) {
    throw new Error("Missing TEST_USER_EMAIL or TEST_USER_PASSWORD.");
  }

  const client = createClient(url, key); // pragma: allowlist secret
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    throw signInError;
  }

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, company_id, first_name, last_name")
    .eq("id", (await client.auth.getUser()).data.user?.id ?? "")
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile?.company_id) {
    throw new Error("Test user profile has no company_id.");
  }

  const { data: tasks, error: tasksError } = await client
    .from("tasks")
    .select("id, title, company_id, created_at")
    .eq("company_id", profile.company_id)
    .order("created_at", { ascending: false });

  if (tasksError) throw tasksError;

  const matches = (tasks ?? []).filter((row) => isE2eTaskTitle(row.title));

  const byCompany = new Map();
  for (const row of matches) {
    const bucket = byCompany.get(row.company_id) ?? [];
    bucket.push(row);
    byCompany.set(row.company_id, bucket);
  }

  console.log("E2E task cleanup preview");
  console.log(`Test owner company_id: ${profile.company_id}`);
  console.log(`Matching rows in owner company: ${matches.length}`);

  for (const [companyId, rows] of byCompany.entries()) {
    console.log(`Company ${companyId}: ${rows.length} row(s)`);
    for (const row of rows.slice(0, 20)) {
      console.log(`  - ${row.id} | ${row.title}`);
    }
    if (rows.length > 20) {
      console.log(`  ... and ${rows.length - 20} more`);
    }
  }

  const removed = [];
  for (const row of matches) {
    const { error: deleteError } = await client
      .from("tasks")
      .delete()
      .eq("id", row.id)
      .eq("company_id", profile.company_id);
    if (deleteError) {
      console.error(`Failed to delete ${row.id}: ${deleteError.message}`);
      continue;
    }
    removed.push(row);
    console.log(`Deleted ${row.id} (${row.title})`);
  }

  console.log(`Removed ${removed.length} task(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});