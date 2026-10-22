import { useTranslation } from "react-i18next";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Users, Clock, Bell, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { WizardFormData } from "../CreateUpdateWizard";
import { CompanyUpdatePreview } from "@/features/company-updates/wizard/CompanyUpdatePreview";

interface SummaryStepProps {
  formData: WizardFormData;
}

export function SummaryStep({ formData }: SummaryStepProps) {
  const { t } = useTranslation();
  const getRecipientSummary = () => {
    if (formData.recipients.type === "all") {
      return "All employees";
    }

    const relevantTargets = formData.recipients.targets.filter((target) =>
      target.startsWith(`${formData.recipients.type}:`),
    );

    if (relevantTargets.length === 0) {
      return "No recipients selected";
    }

    const type = formData.recipients.type;
    if (type === "individuals") {
      return `${relevantTargets.length} ${relevantTargets.length === 1 ? "person" : "people"}`;
    }

    const labelMap: Record<string, { singular: string; plural: string }> =
      {
        departments: { singular: "department", plural: "departments" },
        roles: { singular: "role", plural: "roles" },
        groups: { singular: "group", plural: "groups" },
        all: { singular: "employee", plural: "employees" },
        individuals: { singular: "person", plural: "people" },
      };

    const labels = labelMap[type] ?? { singular: type, plural: `${type}s` };
    return `${relevantTargets.length} ${relevantTargets.length === 1 ? labels.singular : labels.plural}`;
  };

  const getScheduleSummary = () => {
    if (formData.publishingSettings.publishNow) {
      return "Publish immediately";
    }

    if (formData.publishingSettings.scheduledDate) {
      const dateStr = format(
        new Date(formData.publishingSettings.scheduledDate),
        "PPP",
      );
      const timeStr = formData.publishingSettings.scheduledTime || "09:00";
      return `Scheduled for ${dateStr} at ${timeStr}`;
    }

    return "Not scheduled";
  };

  const getNotificationSummary = () => {
    const { notifications } = formData.publishingSettings;
    const enabled = [];

    if (notifications.email) enabled.push("Email");
    if (notifications.push) enabled.push("Push");
    if (notifications.inApp) enabled.push("In-app");
    if (notifications.reminders) enabled.push("Reminders");

    return enabled.length > 0 ? enabled.join(", ") : "None";
  };

  const getEngagementSummary = () => {
    const { engagement } = formData.publishingSettings;
    const enabled = [];

    if (engagement.allowLikes) enabled.push("Likes");
    if (engagement.allowComments) enabled.push("Comments");
    if (engagement.allowSharing) enabled.push("Sharing");
    if (engagement.requireConfirmation) enabled.push("Read confirmation");
    if (engagement.showAsPopup) enabled.push("Pop-up display");

    return enabled.length > 0 ? enabled.join(", ") : "Basic display only";
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">{t("updates.reviewPublish")}</h3>
        <p className="text-muted-foreground">
          {t("updates.reviewYourUpdateBeforePublishing")} </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Update Preview */}
        <div className="space-y-4">
          <h4 className="font-semibold">{t("updates.updatePreview")}</h4>
          <CompanyUpdatePreview data={formData} />
        </div>

        {/* Settings Summary */}
        <div className="space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t("updates.settingsSummary")} </h4>

          <Card>
            <CardContent className="p-4 space-y-4">
              {/* Basic Info */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t("updates.basicInformation")}</span>
                </div>
                <div className="pl-6 space-y-1 text-sm text-muted-foreground">
                  <div>
                    {t("updates.type")} <Badge variant="outline">{formData.type}</Badge>
                  </div>
                  <div>
                    {t("updates.priority")}{" "}
                    <Badge variant="outline">{formData.priority}</Badge>
                  </div>
                  {formData.category && (
                    <div>{t("updates.category")} {formData.category}</div>
                  )}
                  {formData.template && (
                    <div>{t("updates.template")} {formData.template.name}</div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Recipients */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t("updates.recipients")}</span>
                </div>
                <div className="pl-6 text-sm text-muted-foreground">
                  {getRecipientSummary()}
                </div>
              </div>

              <Separator />

              {/* Schedule */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t("updates.schedule")}</span>
                </div>
                <div className="pl-6 text-sm text-muted-foreground">
                  {getScheduleSummary()}
                </div>
              </div>

              <Separator />

              {/* Notifications */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t("shell.notifications")}</span>
                </div>
                <div className="pl-6 text-sm text-muted-foreground">
                  {getNotificationSummary()}
                </div>
              </div>

              <Separator />

              {/* Engagement */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t("updates.engagement2")}</span>
                </div>
                <div className="pl-6 text-sm text-muted-foreground">
                  {getEngagementSummary()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/20 px-4 py-3 text-center text-sm text-muted-foreground">
        <p>
          {formData.publishingSettings.publishNow
            ? "Your update will be published immediately after confirmation."
            : "Your update will be saved and published at the scheduled time."}
        </p>
      </div>
    </div>
  );
}
