import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X } from "lucide-react";

export interface Task {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
}

interface TaskFormProps {
  tasks: Task[];
  onChange: (tasks: Task[]) => void;
  disabled?: boolean;
  minTasks?: number;
}

export function TaskForm({
  tasks,
  onChange,
  disabled = false,
  minTasks = 2,
}: TaskFormProps) {
  const addTask = () => {
    onChange([...tasks, { title: "", description: "", priority: "medium" }]);
  };

  const removeTask = (index: number) => {
    if (tasks.length > minTasks) {
      onChange(tasks.filter((_, i) => i !== index));
    }
  };

  const updateTask = (index: number, field: keyof Task, value: string) => {
    const updatedTasks = tasks.map((task, i) =>
      i === index ? { ...task, [field]: value } : task,
    );
    onChange(updatedTasks);
  };

  const hasEmptyTasks = tasks.some((task) => !task.title.trim());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Tasks (minimum {minTasks} required) *</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTask}
          disabled={disabled}
        >
          Add Task
        </Button>
      </div>

      <div className="space-y-3 max-h-60 overflow-y-auto">
        {tasks.map((task, index) => (
          <div key={index} className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Task {index + 1}</span>
              {tasks.length > minTasks && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTask(index)}
                  disabled={disabled}
                  aria-label={`Remove task ${index + 1}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <Input
                placeholder="Task title *"
                value={task.title}
                onChange={(e) => updateTask(index, "title", e.target.value)}
                disabled={disabled}
                aria-label={`Task ${index + 1} title`}
              />
              <Textarea
                placeholder="Task description"
                value={task.description}
                onChange={(e) =>
                  updateTask(index, "description", e.target.value)
                }
                rows={2}
                disabled={disabled}
                aria-label={`Task ${index + 1} description`}
              />
              <Select
                value={task.priority}
                onValueChange={(value: "low" | "medium" | "high") =>
                  updateTask(index, "priority", value)
                }
                disabled={disabled}
              >
                <SelectTrigger aria-label={`Task ${index + 1} priority`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="high">High Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      {hasEmptyTasks && tasks.length >= minTasks && (
        <p className="text-sm text-destructive">All tasks must have a title</p>
      )}
      {tasks.length < minTasks && (
        <p className="text-sm text-destructive">
          At least {minTasks} tasks are required
        </p>
      )}
    </div>
  );
}
