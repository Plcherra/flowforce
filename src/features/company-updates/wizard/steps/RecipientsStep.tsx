import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, Globe, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRecipientInsights } from "@/features/company-updates/wizard/useRecipientInsights";
import type { WizardFormData } from "../CreateUpdateWizard";

interface RecipientsStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

export function RecipientsStep({
  formData,
  updateFormData,
}: RecipientsStepProps) {
  const { t } = useTranslation();
  const insights = useRecipientInsights(formData);
  const audienceIsEveryone =
    formData.recipients.type === "all" &&
    formData.recipients.targets.length === 0;

  useEffect(() => {
    if (audienceIsEveryone) return;
    updateFormData({
      recipients: { type: "all", targets: [] },
    });
  }, [audienceIsEveryone, updateFormData]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="mb-2 text-lg font-semibold">
          {t("updates.selectRecipients")}
        </h3>
        <p className="text-muted-foreground">{t("updates.everyoneCanRead")}</p>
      </div>

      <Card className="border-primary/40 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-primary">
            <Target className="h-4 w-4" />
            {t("updates.audienceInsights")}
          </CardTitle>
          <CardDescription className="text-xs text-primary/80">
            {t("updates.estimatedReachUsesActiveEmployeeDataFromTheLastSync")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          {insights.loading ? (
            <Skeleton className="h-14 rounded-md" />
          ) : (
            <div className="rounded-lg border border-primary/30 bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {t("updates.estimatedReach")}
              </p>
              <p className="text-lg font-semibold text-primary">
                {t("updates.employeeCount", { count: insights.estimatedReach })}
              </p>
            </div>
          )}
          {insights.loading ? (
            <Skeleton className="h-14 rounded-md" />
          ) : (
            <div className="rounded-lg border border-primary/30 bg-background px-3 py-2">
              <p className="text-xs text-muted-foreground">
                {t("updates.totalEmployees")}
              </p>
              <p className="text-lg font-semibold">
                {t("updates.employeeCount", { count: insights.totalEmployees })}
              </p>
            </div>
          )}
          {insights.error ? (
            <p className="text-sm text-destructive sm:col-span-2" role="alert">
              {insights.error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="ring-2 ring-primary">
        <CardContent className="flex items-start gap-3 p-4">
          <Globe className="mt-0.5 h-6 w-6 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-semibold">{t("updates.allEmployees")}</h4>
              <Badge>{t("updates.selected")}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("updates.everyoneInCompany")}
            </p>
          </div>
        </CardContent>
      </Card>

      {!insights.loading && insights.actionItems.length > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning-muted px-3 py-2 text-xs text-warning-foreground">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <ul className="list-disc space-y-1 pl-4">
            {insights.actionItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
