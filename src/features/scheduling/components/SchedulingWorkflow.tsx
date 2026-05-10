import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, Bell, Share2, CheckCircle2 } from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface WorkflowStep {
  day: string;
  dayName: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  actions: string[];
  color: string;
  isToday?: boolean;
  isCompleted?: boolean;
}

export function SchedulingWorkflow() {
  const { toast } = useToast();
  const today = new Date();
  const weekStart = startOfWeek(today);

  const getWorkflowSteps = (): WorkflowStep[] => {
    const thursday = addDays(weekStart, 4);
    const friday = addDays(weekStart, 5);
    const saturday = addDays(weekStart, 6);
    const sunday = addDays(weekStart, 7);

    return [
      {
        day: format(thursday, "MMM d"),
        dayName: "Thursday",
        icon: <Bell className="h-4 w-4" />,
        title: "Send Availability Reminder",
        description: "Notify staff to update their availability",
        actions: ["Send reminder to all staff", "Set deadline for tonight"],
        color: "bg-blue-500",
        isToday: isSameDay(today, thursday),
      },
      {
        day: format(friday, "MMM d"),
        dayName: "Friday",
        icon: <CalendarDays className="h-4 w-4" />,
        title: "Collect Updates & Build Draft",
        description: "Gather availability updates and create draft schedule",
        actions: [
          "Collect availability updates",
          "Build draft schedule",
          "Review conflicts",
        ],
        color: "bg-orange-500",
        isToday: isSameDay(today, friday),
      },
      {
        day: format(saturday, "MMM d"),
        dayName: "Saturday",
        icon: <CheckCircle2 className="h-4 w-4" />,
        title: "Review & Finalize",
        description: "Morning review and afternoon publication",
        actions: [
          "Review draft (morning)",
          "Finalize schedule",
          "Post to channels (afternoon)",
        ],
        color: "bg-green-500",
        isToday: isSameDay(today, saturday),
      },
      {
        day: format(sunday, "MMM d"),
        dayName: "Sunday",
        icon: <Share2 className="h-4 w-4" />,
        title: "Schedule Reminder",
        description: "Final reminder before week starts",
        actions: ["Send schedule reminder", "Confirm all shifts covered"],
        color: "bg-purple-500",
        isToday: isSameDay(today, sunday),
      },
    ];
  };

  const workflowSteps = getWorkflowSteps();

  const handleActionClick = (action: string, stepTitle: string) => {
    toast({
      title: action,
      description: `Action for ${stepTitle}`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Weekly Scheduling Flow
        </CardTitle>
        <CardDescription>
          Automated workflow for consistent scheduling process
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {workflowSteps.map((step, index) => (
            <div
              key={step.dayName}
              className={`relative p-4 rounded-lg border transition-all duration-200 ${
                step.isToday
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border bg-background hover:bg-muted/20"
              }`}
            >
              {/* Timeline connector */}
              {index < workflowSteps.length - 1 && (
                <div className="absolute left-8 top-16 h-8 w-px bg-border"></div>
              )}

              <div className="flex items-start gap-4">
                {/* Day indicator */}
                <div className="flex flex-col items-center">
                  <div className={`p-2 rounded-full text-white ${step.color}`}>
                    {step.icon}
                  </div>
                  <div className="mt-2 text-center">
                    <div className="text-xs font-medium text-muted-foreground">
                      {step.dayName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {step.day}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-sm">{step.title}</h3>
                    {step.isToday && (
                      <Badge variant="default" className="text-xs">
                        Today
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">
                    {step.description}
                  </p>

                  <div className="space-y-2">
                    {step.actions.map((action, actionIndex) => (
                      <Button
                        key={actionIndex}
                        variant={step.isToday ? "default" : "outline"}
                        size="sm"
                        className="text-xs mr-2 mb-1"
                        onClick={() => handleActionClick(action, step.title)}
                      >
                        {action}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-sm mb-1">
                Notification Settings
              </h4>
              <p className="text-xs text-muted-foreground mb-2">
                Automated reminders will be sent according to this schedule
              </p>
              <Button variant="outline" size="sm" className="text-xs">
                Configure Notifications
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
