import { useTranslation } from "react-i18next";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CalendarIcon,
  Clock,
  Bell,
  MessageSquare,
  Share,
  Eye,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { dateLocaleForLanguage } from "@/features/company-updates/dateLocale";
import { WizardFormData } from "../CreateUpdateWizard";

interface PublishSettingsStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

export function PublishSettingsStep({
  formData,
  updateFormData,
}: PublishSettingsStepProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = dateLocaleForLanguage(i18n.language);
  const updatePublishingSettings = (
    updates: Partial<typeof formData.publishingSettings>,
  ) => {
    updateFormData({
      publishingSettings: { ...formData.publishingSettings, ...updates },
    });
  };

  const updateNotifications = (
    updates: Partial<typeof formData.publishingSettings.notifications>,
  ) => {
    updatePublishingSettings({
      notifications: {
        ...formData.publishingSettings.notifications,
        ...updates,
      },
    });
  };

  const updateEngagement = (
    updates: Partial<typeof formData.publishingSettings.engagement>,
  ) => {
    updatePublishingSettings({
      engagement: { ...formData.publishingSettings.engagement, ...updates },
    });
  };

  const handleScheduledDateChange = (date: Date | undefined) => {
    if (date) {
      updatePublishingSettings({
        scheduledDate: format(date, "yyyy-MM-dd"),
        publishNow: false,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold mb-2">{t("updates.publishingSettings")}</h3>
        <p className="text-muted-foreground">
          {t("updates.configureWhenAndHowYourUpdateWillBePublished")} </p>
      </div>

      <Tabs defaultValue="timing" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timing">
            <Clock className="h-4 w-4 mr-2" />
            {t("updates.timing")} </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            {t("shell.notifications")} </TabsTrigger>
          <TabsTrigger value="engagement">
            <MessageSquare className="h-4 w-4 mr-2" />
            {t("updates.engagement2")} </TabsTrigger>
        </TabsList>

        <TabsContent value="timing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("updates.publishingSchedule")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Immediate vs Scheduled */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    formData.publishingSettings.publishNow
                      ? "ring-2 ring-primary"
                      : ""
                  }`}
                  onClick={() =>
                    updatePublishingSettings({
                      publishNow: true,
                      scheduledDate: undefined,
                    })
                  }
                >
                  <CardContent className="p-4 text-center">
                    <Zap className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <h4 className="font-semibold">{t("updates.publishNow")}</h4>
                    <p className="text-sm text-muted-foreground">
                      {t("updates.sendImmediately")} </p>
                  </CardContent>
                </Card>

                <Card
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    !formData.publishingSettings.publishNow
                      ? "ring-2 ring-primary"
                      : ""
                  }`}
                  onClick={() =>
                    updatePublishingSettings({ publishNow: false })
                  }
                >
                  <CardContent className="p-4 text-center">
                    <CalendarIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <h4 className="font-semibold">{t("updates.schedule")}</h4>
                    <p className="text-sm text-muted-foreground">{t("updates.sendLater")}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("updates.scheduledHeld")}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Scheduled Publishing Options */}
              {!formData.publishingSettings.publishNow && (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t("updates.scheduleDate")}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.publishingSettings.scheduledDate
                              ? format(
                                  new Date(
                                    formData.publishingSettings.scheduledDate,
                                  ),
                                  "PPP",
                                  { locale: dateLocale },
                                )
                              : t("updates.selectDate")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={
                              formData.publishingSettings.scheduledDate
                                ? new Date(
                                    formData.publishingSettings.scheduledDate,
                                  )
                                : undefined
                            }
                            onSelect={handleScheduledDateChange}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("updates.scheduleTime")}</Label>
                      <Input
                        type="time"
                        value={
                          formData.publishingSettings.scheduledTime || "09:00"
                        }
                        onChange={(e) =>
                          updatePublishingSettings({
                            scheduledTime: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t("updates.timezone")}</Label>
                    <Select
                      value={formData.publishingSettings.timezone || "UTC"}
                      onValueChange={(value) =>
                        updatePublishingSettings({ timezone: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">{t("updates.utc")}</SelectItem>
                        <SelectItem value="America/New_York">
                          {t("updates.easternTime")} </SelectItem>
                        <SelectItem value="America/Chicago">
                          {t("updates.centralTime")} </SelectItem>
                        <SelectItem value="America/Denver">
                          {t("updates.mountainTime")} </SelectItem>
                        <SelectItem value="America/Los_Angeles">
                          {t("updates.pacificTime")} </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t("updates.notificationPreferences")} </CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("updates.notificationChoicesSaved")}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t("updates.emailNotifications")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("updates.sendEmailToRecipients")} </p>
                  </div>
                  <Switch
                    checked={formData.publishingSettings.notifications.email}
                    onCheckedChange={(checked) =>
                      updateNotifications({ email: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t("updates.pushNotifications")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("updates.sendMobilePushNotifications")} </p>
                  </div>
                  <Switch
                    checked={formData.publishingSettings.notifications.push}
                    onCheckedChange={(checked) =>
                      updateNotifications({ push: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t("updates.inAppNotifications")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("updates.showNotificationInApp")} </p>
                  </div>
                  <Switch
                    checked={formData.publishingSettings.notifications.inApp}
                    onCheckedChange={(checked) =>
                      updateNotifications({ inApp: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t("tasks.reminders")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("updates.sendRemindersForUnreadUpdates")} </p>
                  </div>
                  <Switch
                    checked={
                      formData.publishingSettings.notifications.reminders
                    }
                    onCheckedChange={(checked) =>
                      updateNotifications({ reminders: checked })
                    }
                  />
                </div>

                {formData.publishingSettings.notifications.reminders && (
                  <div className="pl-4 border-l-2 border-muted">
                    <Label>{t("updates.reminderInterval")}</Label>
                    <Select
                      value={String(
                        formData.publishingSettings.notifications
                          .reminderInterval || 24,
                      )}
                      onValueChange={(value) =>
                        updateNotifications({ reminderInterval: Number(value) })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">{t("tasks.text1Hour")}</SelectItem>
                        <SelectItem value="4">{t("updates.4Hours")}</SelectItem>
                        <SelectItem value="24">{t("updates.24Hours")}</SelectItem>
                        <SelectItem value="72">{t("updates.3Days")}</SelectItem>
                        <SelectItem value="168">{t("updates.1Week")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {t("updates.interactionSettings")} </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t("updates.allowLikes")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("updates.letUsersLikeTheUpdate")} </p>
                  </div>
                  <Switch
                    checked={formData.publishingSettings.engagement.allowLikes}
                    onCheckedChange={(checked) =>
                      updateEngagement({ allowLikes: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t("updates.allowComments")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("updates.enableCommentsOnTheUpdate")} </p>
                  </div>
                  <Switch
                    checked={
                      formData.publishingSettings.engagement.allowComments
                    }
                    onCheckedChange={(checked) =>
                      updateEngagement({ allowComments: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t("updates.allowSharing")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("updates.letUsersShareTheUpdate")} </p>
                  </div>
                  <Switch
                    checked={
                      formData.publishingSettings.engagement.allowSharing
                    }
                    onCheckedChange={(checked) =>
                      updateEngagement({ allowSharing: checked })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("updates.displaySettings")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t("updates.requireConfirmation")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("updates.usersMustConfirmTheyVeReadIt")} </p>
                  </div>
                  <Switch
                    checked={
                      formData.publishingSettings.engagement.requireConfirmation
                    }
                    onCheckedChange={(checked) =>
                      updateEngagement({ requireConfirmation: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t("updates.showAsPopUp")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("updates.displayAsModalWhenUsersLogin")} </p>
                  </div>
                  <Switch
                    checked={formData.publishingSettings.engagement.showAsPopup}
                    onCheckedChange={(checked) =>
                      updateEngagement({ showAsPopup: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">{t("updates.authorAttribution")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("updates.showAuthorNameOnTheUpdate")} </p>
                  </div>
                  <Switch
                    checked={formData.publishingSettings.authorAttribution}
                    onCheckedChange={(checked) =>
                      updatePublishingSettings({ authorAttribution: checked })
                    }
                  />
                </div>

                {formData.publishingSettings.authorAttribution && (
                  <div className="space-y-2">
                    <Label>{t("updates.authorNameOptional")}</Label>
                    <Input
                      value={formData.publishingSettings.authorName || ""}
                      onChange={(e) =>
                        updatePublishingSettings({ authorName: e.target.value })
                      }
                      placeholder={t("updates.leaveBlankToUseYourName")}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
