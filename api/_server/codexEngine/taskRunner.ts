import { supabaseAdmin } from "../supabaseAdmin";

export interface CodexAutoTask {
  id: string;
  generated_by?: string;
  status?: string;
  [key: string]: unknown;
}

export const Codex = {
  async run(task: CodexAutoTask) {
    // Placeholder: hook into the Codex execution pipeline.
    console.info(`[Codex] Auto-running task ${task.id}`);
  },
};

export async function maybeAutoRunDevTasks(tasks: CodexAutoTask[]) {
  if (!tasks.length) return;

  for (const task of tasks) {
    if (task.generated_by !== "dev_auto_plan" || !task.id) continue;

    try {
      await Codex.run(task);

      const { error } = await supabaseAdmin
        .from("codex_auto_tasks")
        .update({ status: "done" })
        .eq("id", task.id);

      if (error) {
        console.error(`[Codex] Failed to mark task ${task.id} done`, error);
      }
    } catch (err) {
      console.error(`[Codex] Failed to auto-run task ${task.id}`, err);
    }
  }
}
