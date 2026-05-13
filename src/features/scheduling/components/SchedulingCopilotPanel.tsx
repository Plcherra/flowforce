import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  useScheduleCopilot,
  type StepProgressState,
} from "@/features/scheduling/hooks/useScheduleCopilot";
import {
  CheckCircle,
  Circle,
  Info,
  PlayCircle,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

const ACTION_LIBRARY: Record<
  string,
  { action: string; label: string; intent: "primary" | "secondary" }[]
> = {
  "collect-staffing-signals": [
    {
      action: "start_schedule_draft",
      label: "Start schedule draft",
      intent: "primary",
    },
  ],
  "build-shift-draft": [
    {
      action: "publish_schedule",
      label: "Attempt publish (demo)",
      intent: "primary",
    },
    { action: "notify_team", label: "Notify team (demo)", intent: "secondary" },
  ],
  "gm-review-approval": [
    {
      action: "publish_schedule",
      label: "Publish schedule",
      intent: "primary",
    },
  ],
  "publish-and-acknowledge": [
    { action: "notify_team", label: "Send notifications", intent: "primary" },
  ],
};

const ROLE_OPTIONS = [
  { value: "operations_manager", label: "Operations Manager" },
  { value: "schedule_admin", label: "Schedule Admin" },
  { value: "general_manager", label: "General Manager" },
  { value: "people_ops", label: "People Ops" },
  { value: "shift_lead", label: "Shift Lead" },
];

export function SchedulingCopilotPanel() {
  const {
    rulebook,
    loading,
    actorRole,
    setActorRole,
    currentStep,
    currentStepId,
    setCurrentStepId,
    stepStatuses,
    criterionState,
    toggleCriterion,
    setCriterionValue,
    setCriterionApproval,
    runAction,
    lastEvaluation,
  } = useScheduleCopilot({
    source: "supabase",
    rulebookId: "restaurant-weekly-schedule",
  });

  const actionButtons = useMemo(
    () => ACTION_LIBRARY[currentStep?.id ?? ""] ?? [],
    [currentStep?.id],
  );

  return (
    <Card className="h-full">
      <CardHeader className="border-b border-border/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              Copilot
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Guided checklist enforcing the {rulebook.name} rulebook.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Label
              htmlFor="actor-role"
              className="text-xs uppercase tracking-wide text-muted-foreground"
            >
              Acting as
            </Label>
            <Select
              value={actorRole}
              onValueChange={setActorRole}
              disabled={loading}
            >
              <SelectTrigger id="actor-role" className="h-9 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row">
          <aside className="border-b border-border/60 lg:border-b-0 lg:border-r lg:w-72">
            <ScrollArea className="max-h-[360px] lg:max-h-[520px]">
              <ul className="divide-y divide-border/50">
                {stepStatuses.map((status) => (
                  <li
                    key={status.step.id}
                    className={cn(
                      "p-4 cursor-pointer transition-colors hover:bg-muted/40",
                      currentStepId === status.step.id && "bg-muted/40",
                    )}
                    onClick={() => setCurrentStepId(status.step.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground line-clamp-1">
                        {status.step.title}
                      </span>
                      <StepStatusBadge state={status.state} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {status.step.purpose}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Progress
                        value={(status.completed / status.total) * 100}
                        className="h-1 flex-1"
                      />
                      <span>
                        {status.completed}/{status.total}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </aside>

          <section className="flex-1 p-6 space-y-6">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading rulebook…</p>
            ) : currentStep ? (
              <div className="space-y-6">
                <header className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold">
                      {currentStep.title}
                    </CardTitle>
                    <Badge variant="secondary">
                      Step{" "}
                      {rulebook.steps.findIndex(
                        (step) => step.id === currentStep.id,
                      ) + 1}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentStep.purpose}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Allowed roles
                    </span>
                    {currentStep.allowedRoles.map((role) => (
                      <Badge key={role} variant="outline" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </header>

                <div className="space-y-4">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Completion criteria
                  </h4>
                  <div className="space-y-3">
                    {currentStep.completionCriteria.map((criterion) => {
                      const state =
                        criterionState[currentStep.id]?.[criterion.id];
                      const isNumeric = criterion.evidenceType === "numeric";
                      const requiresApproval = Boolean(criterion.approverRole);

                      return (
                        <div
                          key={criterion.id}
                          className={cn(
                            "rounded-lg border border-border/70 bg-muted/20 px-4 py-3",
                            state?.completed
                              ? "border-primary/60 bg-primary/5"
                              : "",
                          )}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">
                                  {criterion.label}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] uppercase tracking-wide"
                                >
                                  {criterion.evidenceType}
                                </Badge>
                              </div>
                              {criterion.description && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {criterion.description}
                                </p>
                              )}
                            </div>
                            <Switch
                              checked={state?.completed}
                              onCheckedChange={() =>
                                toggleCriterion(currentStep.id, criterion)
                              }
                            />
                          </div>

                          {isNumeric && (
                            <div className="mt-3 grid gap-2 sm:flex sm:items-center sm:gap-3">
                              <Label
                                htmlFor={`${criterion.id}-value`}
                                className="text-xs text-muted-foreground"
                              >
                                Actual value
                              </Label>
                              <Input
                                id={`${criterion.id}-value`}
                                type="number"
                                className="h-8 w-24"
                                value={state?.value ?? ""}
                                onChange={(event) =>
                                  setCriterionValue(
                                    currentStep.id,
                                    criterion.id,
                                    Number(event.target.value),
                                  )
                                }
                              />
                              {typeof criterion.targetValue === "number" && (
                                <span className="text-xs text-muted-foreground">
                                  Target ≥ {criterion.targetValue}
                                </span>
                              )}
                            </div>
                          )}

                          {requiresApproval && (
                            <div className="mt-3 flex items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2">
                              <div className="text-xs text-muted-foreground">
                                Pending approval from {criterion.approverRole}
                              </div>
                              <Switch
                                checked={state?.approved ?? false}
                                onCheckedChange={(value) =>
                                  setCriterionApproval(
                                    currentStep.id,
                                    criterion.id,
                                    value,
                                  )
                                }
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Copilot actions
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {actionButtons.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        No automated actions configured for this step yet.
                      </p>
                    )}
                    {actionButtons.map((button) => (
                      <Button
                        key={button.action}
                        onClick={() => runAction(button.action, currentStep.id)}
                        variant={
                          button.intent === "primary" ? "default" : "outline"
                        }
                        className="flex items-center gap-2"
                      >
                        <PlayCircle className="h-4 w-4" />
                        {button.label}
                      </Button>
                    ))}
                  </div>

                  {lastEvaluation && (
                    <CopilotEvaluationAlert evaluation={lastEvaluation} />
                  )}
                </div>

                {rulebook.constraints && rulebook.constraints.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Global guardrails
                    </h4>
                    <div className="grid gap-3">
                      {rulebook.constraints.map((constraint) => (
                        <div
                          key={constraint.id}
                          className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-3"
                        >
                          <div className="flex items-start gap-2">
                            {constraint.severity === "blocking" ? (
                              <ShieldAlert className="h-4 w-4 text-destructive mt-1" />
                            ) : (
                              <ShieldCheck className="h-4 w-4 text-warning mt-1" />
                            )}
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {constraint.label}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {constraint.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No steps defined in the rulebook.
              </p>
            )}
          </section>
        </div>
      </CardContent>
    </Card>
  );
}

function StepStatusBadge({ state }: { state: StepProgressState }) {
  switch (state) {
    case "complete":
      return (
        <Badge
          variant="outline"
          className="flex items-center gap-1 text-xs text-primary border-primary/60"
        >
          <CheckCircle className="h-3 w-3" /> Complete
        </Badge>
      );
    case "inProgress":
      return (
        <Badge
          variant="outline"
          className="flex items-center gap-1 text-xs text-warning border-warning"
        >
          <Circle className="h-3 w-3" /> In progress
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs text-muted-foreground">
          Not started
        </Badge>
      );
  }
}

function CopilotEvaluationAlert({
  evaluation,
}: {
  evaluation: CopilotEvaluation;
}) {
  const { result, action } = evaluation;

  if (result.status === "allowed") {
    return (
      <Alert variant="default" className="border-primary/40 bg-primary/10">
        <Info className="h-4 w-4" />
        <AlertTitle className="text-sm font-semibold">
          Action allowed
        </AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground">
          `{action}` passed all guardrails.
        </AlertDescription>
      </Alert>
    );
  }

  if (result.status === "warning") {
    return (
      <Alert
        variant="default"
        className="border-warning bg-warning/10 text-warning-foreground"
      >
        <Info className="h-4 w-4" />
        <AlertTitle className="text-sm font-semibold">
          Action needs attention
        </AlertTitle>
        <AlertDescription className="text-xs">
          {result.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <Info className="h-4 w-4" />
      <AlertTitle className="text-sm font-semibold">Action blocked</AlertTitle>
      <AlertDescription className="text-xs">{result.message}</AlertDescription>
    </Alert>
  );
}
