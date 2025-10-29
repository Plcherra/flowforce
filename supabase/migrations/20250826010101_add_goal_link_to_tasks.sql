-- Add goal linkage to tasks with cascading cleanup when a goal is removed
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tasks_goal_id ON public.tasks(goal_id);

WITH ranked_links AS (
  SELECT
    task_id,
    goal_id,
    ROW_NUMBER() OVER (PARTITION BY task_id ORDER BY created_at DESC, id DESC) AS rn
  FROM public.goal_tasks
)
UPDATE public.tasks AS t
SET goal_id = rl.goal_id
FROM ranked_links rl
WHERE rl.task_id = t.id
  AND rl.rn = 1
  AND t.goal_id IS NULL;
