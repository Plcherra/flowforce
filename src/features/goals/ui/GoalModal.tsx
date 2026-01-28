import { useEffect, useState, type FormEvent } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Goal } from "@/hooks/useGoals";
import { parseRewardDetails } from "@/features/goals/utils/rewardUtils";
import {
  GoalTasksSelector,
  type TaskWeightMap,
} from "@/features/goals/ui/GoalTasksSelector";

export interface GoalModalSubmitPayload {
  goalId?: string;
  title: string;
  description: string;
  xpReward: number | null;
  targetDate: string | null;
  taskWeights: TaskWeightMap;
}

export interface GoalSuggestionInput {
  title: string;
  description: string;
}

interface GoalModalProps {
  open: boolean;
  goal?: Goal | null;
  suggestion?: GoalSuggestionInput | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (values: GoalModalSubmitPayload) => Promise<void> | void;
  onDelete?: (goal: Goal) => Promise<void> | void;
}

const emptyForm = {
  title: "",
  description: "",
  xpReward: "",
  targetDate: "",
};

export function GoalModal({
  open,
  goal,
  suggestion,
  saving,
  onClose,
  onSubmit,
  onDelete,
}: GoalModalProps) {
  const [formValues, setFormValues] = useState(emptyForm);
  const [selectedTasks, setSelectedTasks] = useState<TaskWeightMap>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (goal) {
      const rewardDetails = parseRewardDetails(goal.reward_details);
      setFormValues({
        title: goal.title ?? "",
        description: goal.description ?? "",
        xpReward: rewardDetails.xp != null ? String(rewardDetails.xp) : "",
        targetDate: goal.target_completion_date
          ? goal.target_completion_date.split("T")[0]
          : "",
      });

      const nextSelections = goal.tasks.reduce<TaskWeightMap>(
        (acc, taskLink) => {
          if (taskLink.task?.id) {
            acc[taskLink.task.id] = taskLink.weight ?? 1;
          }
          return acc;
        },
        {},
      );
      setSelectedTasks(nextSelections);
      setError(null);
      return;
    }

    setFormValues({
      title: suggestion?.title ?? "",
      description: suggestion?.description ?? "",
      xpReward: "",
      targetDate: "",
    });
    setSelectedTasks({});
    setError(null);
  }, [goal, open, suggestion]);

  const modeLabel = goal ? "Update goal" : "Create goal";

  const handleSelectionChange = (taskId: string, weight: number | null) => {
    setSelectedTasks((prev) => {
      if (weight == null) {
        const { [taskId]: _removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [taskId]: weight,
      };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const xpReward = formValues.xpReward.trim()
      ? Number(formValues.xpReward.trim())
      : null;

    if (Number.isNaN(xpReward ?? 0)) {
      setError("XP reward must be a number.");
      return;
    }

    if (xpReward != null && xpReward < 0) {
      setError("XP reward cannot be negative.");
      return;
    }

    if (!formValues.title.trim()) {
      setError("A title is required.");
      return;
    }

    setError(null);

    await onSubmit({
      goalId: goal?.id,
      title: formValues.title.trim(),
      description: formValues.description.trim(),
      xpReward,
      targetDate: formValues.targetDate ? formValues.targetDate : null,
      taskWeights: selectedTasks,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] w-full max-w-3xl overflow-hidden">
        <form onSubmit={handleSubmit} className="flex h-full flex-col gap-4">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle>{modeLabel}</DialogTitle>
            <DialogDescription>
              {goal
                ? "Update goal details, XP reward, and linked tasks."
                : "Define a goal, assign XP reward, and attach tasks to track progress."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid flex-1 gap-4 overflow-y-auto pr-1 md:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal-title">Title</Label>
                <Input
                  id="goal-title"
                  value={formValues.title}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                  placeholder="Launch new training program"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-description">Description</Label>
                <Textarea
                  id="goal-description"
                  rows={6}
                  value={formValues.description}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe the desired outcome and how it will be measured."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-target-date">Target date</Label>
                <Input
                  id="goal-target-date"
                  type="date"
                  value={formValues.targetDate}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      targetDate: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-xp-reward">XP reward</Label>
                <Input
                  id="goal-xp-reward"
                  type="number"
                  min={0}
                  value={formValues.xpReward}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      xpReward: event.target.value,
                    }))
                  }
                  placeholder="110"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <GoalTasksSelector
              goalId={goal?.id}
              selectedWeights={selectedTasks}
              onSelectionChange={handleSelectionChange}
            />
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {goal && onDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={saving}
                onClick={() => {
                  void onDelete(goal);
                }}
              >
                Delete goal
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-1 justify-end gap-2 sm:flex-initial">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : goal ? "Save changes" : "Create goal"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
