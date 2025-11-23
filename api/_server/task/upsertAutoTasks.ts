import { supabaseAdmin } from "../supabaseAdmin";
import { maybeAutoRunDevTasks } from "../codexEngine/taskRunner";

export async function upsertAutoTasks(orgId: string, tasks: any[]) {
  if (!tasks.length) return;

  const { error } = await supabaseAdmin
    .from("codex_auto_tasks")
    .upsert(tasks, { onConflict: "id" });

  if (error) throw error;

  await maybeAutoRunDevTasks(tasks);
}
