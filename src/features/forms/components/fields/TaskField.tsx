import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  CheckSquare,
  Calendar,
  User,
  AlertCircle,
  Plus,
  X,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface TaskData {
  task_id?: string;
  task_title: string;
  due_date?: string;
  assigned_to?: string[];
  priority: "low" | "medium" | "high";
  description?: string;
  status: "pending" | "in_progress" | "completed";
  created_at: string;
}

interface TaskFieldProps {
  label: string;
  description?: string;
  value?: TaskData;
  onChange: (value: TaskData | undefined) => void;
  required?: boolean;
  availableUsers?: Array<{ id: string; name: string; email: string }>;
  className?: string;
}

export function TaskField({
  label,
  description,
  value,
  onChange,
  required = false,
  availableUsers = [],
  className = "",
}: TaskFieldProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);

  const createTask = () => {
    if (!taskTitle.trim()) {
      toast({
        title: "Error",
        description: "Task title is required",
        variant: "destructive",
      });
      return;
    }

    const newTask: TaskData = {
      task_id: Math.random().toString(36).substring(2, 15),
      task_title: taskTitle.trim(),
      description: taskDescription.trim() || undefined,
      due_date: dueDate || undefined,
      assigned_to: assignedUsers.length > 0 ? assignedUsers : undefined,
      priority,
      status: "pending",
      created_at: new Date().toISOString(),
    };

    onChange(newTask);
    setIsCreating(false);
    resetForm();

    toast({
      title: "Success",
      description: "Task created successfully",
    });
  };

  const resetForm = () => {
    setTaskTitle("");
    setTaskDescription("");
    setDueDate("");
    setPriority("medium");
    setAssignedUsers([]);
  };

  const cancelCreation = () => {
    setIsCreating(false);
    resetForm();
  };

  const clearTask = () => {
    onChange(undefined);
  };

  const toggleUserAssignment = (userId: string) => {
    setAssignedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getUserName = (userId: string) => {
    const user = availableUsers.find((u) => u.id === userId);
    return user ? user.name : userId;
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>

      {value ? (
        <Card className="border-l-4 border-l-primary/20">
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">
                    {value.task_title}
                  </h4>
                  {value.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {value.description}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearTask}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={getPriorityColor(value.priority)}
                >
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {value.priority.charAt(0).toUpperCase() +
                    value.priority.slice(1)}{" "}
                  Priority
                </Badge>

                <Badge
                  variant="outline"
                  className={getStatusColor(value.status)}
                >
                  <CheckSquare className="h-3 w-3 mr-1" />
                  {value.status
                    .replace("_", " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </Badge>

                {value.due_date && (
                  <Badge variant="outline">
                    <Calendar className="h-3 w-3 mr-1" />
                    Due: {formatDate(value.due_date)}
                  </Badge>
                )}
              </div>

              {value.assigned_to && value.assigned_to.length > 0 && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-wrap gap-1">
                    {value.assigned_to.map((userId) => (
                      <Badge key={userId} variant="secondary">
                        {getUserName(userId)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                Created: {formatDate(value.created_at)}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : isCreating ? (
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="text-center mb-4">
                <CheckSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">
                  Create New Task
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground">
                    Title *
                  </label>
                  <Input
                    placeholder="Enter task title"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-foreground">
                    Description
                  </label>
                  <Textarea
                    placeholder="Enter task description (optional)"
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-foreground">
                      Due Date
                    </label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground">
                      Priority
                    </label>
                    <Select
                      value={priority}
                      onValueChange={(value: "low" | "medium" | "high") =>
                        setPriority(value)
                      }
                    >
                      <SelectTrigger>
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

                {availableUsers.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">
                      Assign To (optional)
                    </label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {availableUsers.map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={assignedUsers.includes(user.id)}
                            onChange={() => toggleUserAssignment(user.id)}
                            className="rounded border-gray-300"
                          />
                          <span className="text-sm text-foreground">
                            {user.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            ({user.email})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={cancelCreation}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={createTask}
                  disabled={!taskTitle.trim()}
                  className="flex-1"
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
          <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-4">
            No task created yet
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Button>
        </div>
      )}
    </div>
  );
}

// For form builder preview
export function TaskFieldPreview({
  label = "Task",
  description = "Create and assign a task",
  className = "",
}: Partial<TaskFieldProps>) {
  return (
    <TaskField
      label={label}
      description={description}
      value={undefined}
      onChange={() => {}}
      availableUsers={[
        { id: "1", name: "John Doe", email: "john@example.com" },
        { id: "2", name: "Jane Smith", email: "jane@example.com" },
      ]}
      className={className}
    />
  );
}
