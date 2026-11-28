import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TaskDueByFields,
  type TaskDueByValue,
} from "@/features/tasks/components/TaskDueByFields";
import type { TaskPublishState } from "@/features/tasks/utils/taskSchedule";

export type TaskExecutionFormState = {
  title: string;
  description: string;
  priority: string;
  starts_at: string;
  ends_at: string;
  publish_state: TaskPublishState;
};

type TaskDetailsExecutionCardProps = {
  executionForm: TaskExecutionFormState;
  onExecutionFormChange: (next: TaskExecutionFormState) => void;
  dueBy: TaskDueByValue;
  onDueByChange: (next: TaskDueByValue) => void;
  shopTimeZone: string;
  onSave: () => void;
  savingExecution: boolean;
  onDelete: () => void;
  deletingTask: boolean;
};

export function TaskDetailsExecutionCard({
  executionForm,
  onExecutionFormChange,
  dueBy,
  onDueByChange,
  shopTimeZone,
  onSave,
  savingExecution,
  onDelete,
  deletingTask,
}: TaskDetailsExecutionCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">{t("tasks.executionControls")}</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 gap-2 text-destructive hover:text-destructive"
            onClick={onDelete}
            disabled={deletingTask}
          >
            <Trash2 className="h-4 w-4" />
            {deletingTask ? t("tasks.deleting") : t("tasks.delete")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2 sm:col-span-2 lg:col-span-4">
          <Label htmlFor="task-title">{t("tasks.taskTitle")}</Label>
          <Input
            id="task-title"
            value={executionForm.title}
            onChange={(event) =>
              onExecutionFormChange({
                ...executionForm,
                title: event.target.value,
              })
            }
          />
        </div>
        <div className="space-y-2 sm:col-span-2 lg:col-span-4">
          <Label htmlFor="task-description">{t("tasks.description")}</Label>
          <Textarea
            id="task-description"
            rows={3}
            value={executionForm.description}
            onChange={(event) =>
              onExecutionFormChange({
                ...executionForm,
                description: event.target.value,
              })
            }
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">
            {t("tasks.priority")}
          </Label>
          <Select
            value={executionForm.priority}
            onValueChange={(value) =>
              onExecutionFormChange({ ...executionForm, priority: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t("tasks.priority")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{t("tasks.low")}</SelectItem>
              <SelectItem value="medium">{t("tasks.medium")}</SelectItem>
              <SelectItem value="high">{t("tasks.high")}</SelectItem>
              <SelectItem value="urgent">{t("tasks.urgent")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="task-starts-at"
            className="text-xs font-semibold uppercase text-muted-foreground"
          >
            {t("tasks.starts")}
          </Label>
          <Input
            id="task-starts-at"
            type="datetime-local"
            value={executionForm.starts_at}
            onChange={(event) =>
              onExecutionFormChange({
                ...executionForm,
                starts_at: event.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="task-ends-at"
            className="text-xs font-semibold uppercase text-muted-foreground"
          >
            {t("tasks.ends")}
          </Label>
          <Input
            id="task-ends-at"
            type="datetime-local"
            value={executionForm.ends_at}
            onChange={(event) =>
              onExecutionFormChange({
                ...executionForm,
                ends_at: event.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase text-muted-foreground">
            {t("tasks.publish")}
          </Label>
          <Select
            value={executionForm.publish_state}
            onValueChange={(value) =>
              onExecutionFormChange({
                ...executionForm,
                publish_state: value as TaskPublishState,
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder={t("tasks.publish")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="published">{t("tasks.publishNow")}</SelectItem>
              <SelectItem value="scheduled">{t("tasks.scheduleForTheStart")}</SelectItem>
              <SelectItem value="draft">{t("tasks.draft")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="sm:col-span-2 lg:col-span-4">
          <TaskDueByFields
            idPrefix="task-details"
            value={dueBy}
            timeZone={shopTimeZone}
            onChange={onDueByChange}
          />
        </div>

        <div className="flex justify-stretch sm:col-span-2 sm:justify-end lg:col-span-4">
          <Button
            type="button"
            className="min-h-11 w-full sm:w-auto"
            onClick={onSave}
            disabled={savingExecution}
          >
            {savingExecution ? t("tasks.saving") : t("tasks.saveExecutionDetails")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}