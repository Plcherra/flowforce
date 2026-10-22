import { useTranslation } from "react-i18next";
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { ChannelData } from "./useChannelWizard";

interface ChannelWizardFormProps {
  channelData: ChannelData;
  onChannelDataChange: (data: Partial<ChannelData>) => void;
  showSettings?: boolean;
}

export function ChannelWizardForm({
  channelData,
  onChannelDataChange,
  showSettings = false,
}: ChannelWizardFormProps) {
  const { t } = useTranslation();
  if (showSettings) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground">{t("messages.privacy")}</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {t("messages.chooseWhoCanSeeThisGroup")} </p>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg border">
            <div className="space-y-1">
              <p className="font-medium text-foreground">{t("messages.privateGroup")}</p>
              <p className="text-sm text-muted-foreground">
                {t("messages.onlyThePeopleYouAddCanSeeThisGroup")} </p>
            </div>
            <Switch
              checked={channelData.is_private}
              onCheckedChange={(checked) =>
                onChannelDataChange({ is_private: checked })
              }
            />
          </div>

          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <h4 className="font-medium text-foreground">{t("messages.groupSummary")}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{t("auth.name")}</span>
                <span className="text-foreground font-medium">
                  {channelData.name || "Not set"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{t("messages.privacy2")}</span>
                <span className="text-foreground">
                  {channelData.is_private ? "Private" : "Public"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">{t("messages.members")}</span>
                <span className="text-foreground">
                  {t("messages.countSelected", { count: channelData.members.length })} </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">{t("messages.groupDetails")}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("messages.giveTheGroupAName")} </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t("messages.groupName2")}</Label>
          <Input
            id="name"
            value={channelData.name}
            onChange={(event) =>
              onChannelDataChange({ name: event.target.value })
            }
            placeholder={t("messages.eGClosingCrew")}
            className="text-base"
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t("tasks.description")}</Label>
          <Textarea
            id="description"
            value={channelData.description}
            onChange={(event) =>
              onChannelDataChange({ description: event.target.value })
            }
            placeholder={t("messages.whatIsThisGroupFor")}
            rows={3}
            className="text-base resize-none"
          />
        </div>

      </div>
    </div>
  );
}
