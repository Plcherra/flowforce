import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfWeek, endOfWeek } from "date-fns";

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  priority: "high" | "medium" | "low";
}

const defaultChecklist: Omit<ChecklistItem, "completed">[] = [
  {
    id: "availability",
    text: "Review staff availability (app/notes)",
    priority: "high",
  },
  {
    id: "changes",
    text: "Confirm changes (vacations, requests, etc.)",
    priority: "high",
  },
  {
    id: "priorities",
    text: "Check priorities: closers, training shifts, special events",
    priority: "medium",
  },
  {
    id: "balance",
    text: "Balance shifts (fair hours distribution)",
    priority: "medium",
  },
  {
    id: "coverage",
    text: "Confirm coverage for all roles (Barista, Runner, Cashier, FOH Supervisor)",
    priority: "high",
  },
  {
    id: "validation",
    text: "Double-check: no one outside availability, breaks included",
    priority: "high",
  },
];

export function WeeklySchedulingChecklist() {
  const { toast } = useToast();
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [currentWeek, setCurrentWeek] = useState(() => startOfWeek(new Date()));

  // Initialize checklist for current week
  useEffect(() => {
    const weekKey = format(currentWeek, "yyyy-MM-dd");
    const savedChecklist = localStorage.getItem(
      `scheduling-checklist-${weekKey}`,
    );

    if (savedChecklist) {
      setChecklist(JSON.parse(savedChecklist));
    } else {
      const newChecklist = defaultChecklist.map((item) => ({
        ...item,
        completed: false,
      }));
      setChecklist(newChecklist);
      localStorage.setItem(
        `scheduling-checklist-${weekKey}`,
        JSON.stringify(newChecklist),
      );
    }
  }, [currentWeek]);

  const toggleItem = (itemId: string) => {
    const updatedChecklist = checklist.map((item) =>
      item.id === itemId ? { ...item, completed: !item.completed } : item,
    );
    setChecklist(updatedChecklist);

    const weekKey = format(currentWeek, "yyyy-MM-dd");
    localStorage.setItem(
      `scheduling-checklist-${weekKey}`,
      JSON.stringify(updatedChecklist),
    );

    const item = updatedChecklist.find((i) => i.id === itemId);
    if (item?.completed) {
      toast({
        title: "Task completed!",
        description: item.text,
      });
    }
  };

  const resetChecklist = () => {
    const newChecklist = defaultChecklist.map((item) => ({
      ...item,
      completed: false,
    }));
    setChecklist(newChecklist);

    const weekKey = format(currentWeek, "yyyy-MM-dd");
    localStorage.setItem(
      `scheduling-checklist-${weekKey}`,
      JSON.stringify(newChecklist),
    );

    toast({
      title: "Checklist reset",
      description: "All items have been reset for this week",
    });
  };

  const completedItems = checklist.filter((item) => item.completed).length;
  const totalItems = checklist.length;
  const progress = (completedItems / totalItems) * 100;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-destructive text-destructive-foreground";
      case "medium":
        return "bg-warning text-warning-foreground";
      case "low":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-primary" />
            Weekly Scheduling Checklist
          </CardTitle>
          <CardDescription>
            Week of {format(currentWeek, "MMM d")} -{" "}
            {format(endOfWeek(currentWeek), "MMM d, yyyy")}
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={resetChecklist}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm text-muted-foreground">
              {completedItems}/{totalItems}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-3">
          {checklist.map((item) => (
            <div
              key={item.id}
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                item.completed
                  ? "bg-muted/50 border-muted"
                  : "bg-background border-border hover:bg-muted/20"
              }`}
            >
              <Checkbox
                id={item.id}
                checked={item.completed}
                onCheckedChange={() => toggleItem(item.id)}
                className="mt-0.5"
              />

              <div className="flex-1 space-y-2">
                <label
                  htmlFor={item.id}
                  className={`text-sm leading-relaxed cursor-pointer ${
                    item.completed
                      ? "line-through text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  {item.text}
                </label>

                <Badge
                  variant="secondary"
                  className={`text-xs ${getPriorityColor(item.priority)}`}
                >
                  {item.priority} priority
                </Badge>
              </div>

              {item.completed && (
                <Circle className="h-4 w-4 text-primary fill-current mt-0.5" />
              )}
            </div>
          ))}
        </div>

        {progress === 100 && (
          <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Week completed!</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              All scheduling tasks are complete for this week.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
