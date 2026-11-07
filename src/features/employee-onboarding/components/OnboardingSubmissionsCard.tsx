import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OnboardingSubmission } from "../types";

export function OnboardingSubmissionsCard({
  submissions,
  onOpen,
}: {
  submissions: OnboardingSubmission[];
  onOpen: (submission: OnboardingSubmission) => void;
}) {
  const { t } = useTranslation();
  if (submissions.length === 0) return null;
  return (
    <Card data-testid="onboarding-submissions">
      <CardHeader>
        <CardTitle className="text-lg">{t("employeeOnboarding.submissionsTitle")}</CardTitle>
        <CardDescription>{t("employeeOnboarding.submissionsHelp")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {submissions.map((submission) => (
          <div key={submission.id} className="flex items-center gap-3 rounded-lg border p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {submission.personName || t("employeeOnboarding.theShop")}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {submission.stepTitle || submission.fileName}
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => onOpen(submission)}>
              {t("employeeOnboarding.openDocument")}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
