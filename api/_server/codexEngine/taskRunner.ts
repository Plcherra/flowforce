import { supabaseAdmin } from "../supabaseAdmin.js";
import { createServerLogger } from "../utils/logger.js";

export interface CodexAutoTask {
  id: string;
  generated_by?: string;
  status?: string;
  [key: string]: unknown;
}

const logger = createServerLogger('codexTaskRunner', { tags: ['codex'] });

export const Codex = {
  async run(task: CodexAutoTask) {
    // Placeholder: hook into the Codex execution pipeline.
    logger.info('Auto-running task', { context: { taskId: task.id, source: task.generated_by } });
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
        logger.error('Failed to mark task done', { error, context: { taskId: task.id } });
      }
    } catch (err) {
      logger.error('Failed to auto-run task', { error: err, context: { taskId: task.id } });
    }
  }
}
