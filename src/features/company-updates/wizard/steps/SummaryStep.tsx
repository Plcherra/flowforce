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
      return t("updates.allEmployeesSummary");
    }

    const relevantTargets = formData.recipients.targets.filter((target) =>
      target.startsWith(`${formData.recipients.type}:`),
    );

    if (relevantTargets.length === 0) {
      return t("updates.noRecipientsSelected");
    }

    return t("updates.personCount", { count: relevantTargets.length });
  };

  const getScheduleSummary = () => {
    if (formData.publishingSettings.publishNow) {
      return t("updates.publishImmediately");
    }

    if (formData.publishingSettings.scheduledDate) {
      const dateStr = format(
        new Date(formData.publishingSettings.scheduledDate),
        "PPP",
      );
      const timeStr = formData.publishingSettings.scheduledTime || "09:00";
      return t("updates.scheduledFor", { date: dateStr, time: timeStr });
    }

    return t("updates.notScheduled");
  };

  const getNotificationSummary = () => {
    const { notifications } = formData.publishingSettings;
    const enabled = [];

    if (notifications.email) enabled.push(t("updates.channelEmail"));
    if (notifications.push) enabled.push(t("updates.channelPush"));
    if (notifications.inApp) enabled.push(t("updates.channelInApp"));
    if (notifications.reminders) enabled.push(t("updates.channelReminders"));

    return enabled.length > 0 ? enabled.join(", ") : t("updates.noNotifications");
  };

  const getEngagementSummary = () => {
    const { engagement } = formData.publishingSettings;
    const enabled = [];

    if (engagement.allowLikes) enabled.push(t("updates.channelLikes"));
    if (engagement.allowComments) enabled.push(t("updates.channelComments"));
    if (engagement.allowSharing) enabled.push(t("updates.channelSharing"));
    if (engagement.requireConfirmation) {
      enabled.push(t("updates.channelReadConfirmation"));
    }
    if (engagement.showAsPopup) enabled.push(t("updates.channelPopup"));

    return enabled.length > 0
      ? enabled.join(", ")
      : t("updates.basicDisplayOnly");
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
            ? t("updates.publishConfirmNow")
            : t("updates.scheduledConfirm")}
        </p>
      </div>
    </div>
  );
}
