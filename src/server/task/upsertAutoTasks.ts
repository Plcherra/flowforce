export async function upsertAutoTasks(orgId: string, tasks: any[]) {
  // Save tasks either in supabase or local JSON store
  // For now assume supabase:
  for (const task of tasks) {
    await supabaseAdmin
      .from("codex_auto_tasks")
      .upsert(task, { onConflict: "id" });
  }
}