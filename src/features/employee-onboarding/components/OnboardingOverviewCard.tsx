import { useTranslation } from "react-i18next";
import { useNavigate } from "@/lib/router-adapter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Coffee, ChevronRight } from "lucide-react";
import { onboardingCompletion } from "../model";
import type { EmployeeOnboardingReady } from "../types";

export function OnboardingOverviewCard({ data }: { data: EmployeeOnboardingReady }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (data.status === "complete") return null;
  const progress = onboardingCompletion(data.steps);
  return (
    <Card data-testid="overview-employee-onboarding">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Coffee className="mr-2 h-5 w-5 text-primary" />
          {t("employeeOnboarding.overviewTitle")}
        </CardTitle>
        <CardDescription>{t("employeeOnboarding.overviewBody")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3 rounded-lg border bg-primary/5 p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{data.companyName || t("employeeOnboarding.theShop")}</p>
            <p className="text-xs text-muted-foreground">
              {t("employeeOnboarding.checklistProgress", {
                done: progress.activeDone,
                total: progress.activeTotal,
              })}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/app/onboarding")}>
            {t("employeeOnboarding.overviewOpen")}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
