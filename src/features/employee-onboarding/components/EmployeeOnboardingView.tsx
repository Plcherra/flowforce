import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coffee } from "lucide-react";
import { formatStartDate, onboardingCompletion, visibleOnboardingSteps } from "../model";
import type { EmployeeOnboardingReady, OnboardingStepView } from "../types";
import { OnboardingStepCard } from "./OnboardingStepCard";

export function EmployeeOnboardingView({
  data,
  busyId,
  onOpenDocument,
  onAcknowledge,
  onUpload,
  onFinish,
}: {
  data: EmployeeOnboardingReady;
  busyId: string | null;
  onOpenDocument: (step: OnboardingStepView) => void;
  onAcknowledge: (step: OnboardingStepView) => void;
  onUpload: (step: OnboardingStepView, file: File) => void;
  onFinish: () => void;
}) {
  const { t, i18n } = useTranslation();
  const steps = visibleOnboardingSteps(data.steps);
  const progress = onboardingCompletion(data.steps);
  const title =
    data.welcomeTitle.trim() ||
    t("employeeOnboarding.welcomeFallbackTitle", {
      company: data.companyName || t("employeeOnboarding.theShop"),
    });
  const body = data.welcomeBody.trim() || t("employeeOnboarding.welcomeFallbackBody");
  const finished = data.status === "complete";
  const facts = [
    ["role", t("employeeOnboarding.role"), data.facts.role],
    ["department", t("employeeOnboarding.department"), data.facts.department],
    ["store", t("employeeOnboarding.store"), data.facts.store],
    [
      "start",
      t("employeeOnboarding.startDate"),
      formatStartDate(data.facts.startDate, i18n.language),
    ],
  ] as const;

  return (
    <div data-testid="employee-onboarding">
      <div className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
        <div className="mr-auto">
          <h1 className="text-xl font-semibold">{t("employeeOnboarding.pageTitle")}</h1>
          <p className="text-sm text-muted-foreground">{t("employeeOnboarding.pageSubtitle")}</p>
        </div>
        <Badge variant="outline">
          {t("employeeOnboarding.checklistProgress", {
            done: progress.activeDone,
            total: progress.activeTotal,
          })}
        </Badge>
      </div>
      <div className="space-y-4 px-4 py-6">
        <Card className="bg-primary/5 ring-2 ring-primary/20" data-testid="onboarding-welcome">
          <div className="h-2 w-full bg-primary" />
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-lg">
              <Coffee className="mr-2 h-5 w-5 text-primary" />
              {title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{body}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {facts.map(([key, label, value]) => (
                <div key={key} className="rounded-lg border bg-card p-3" data-testid={`onboarding-fact-${key}`}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium">{value || t("employeeOnboarding.notSet")}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <h2 className="text-lg font-semibold">{t("employeeOnboarding.checklistTitle")}</h2>
        {steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("employeeOnboarding.noStepsForHire")}</p>
        ) : (
          steps.map((step) => (
            <OnboardingStepCard
              key={step.id}
              step={step}
              busy={busyId === step.id}
              onOpenDocument={onOpenDocument}
              onAcknowledge={onAcknowledge}
              onUpload={onUpload}
            />
          ))
        )}
        {finished ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("employeeOnboarding.finishedTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {t("employeeOnboarding.finishedBody")}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            <Button
              type="button"
              data-testid="onboarding-finish"
              disabled={!progress.canFinish || Boolean(busyId)}
              onClick={onFinish}
            >
              {t("employeeOnboarding.finish")}
            </Button>
            <p className="text-sm text-muted-foreground">{t("employeeOnboarding.finishHelp")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
