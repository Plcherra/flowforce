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
import { WizardFormData } from "../CreateUpdateWizard";

interface PublishSettingsStepProps {
  formData: WizardFormData;
  updateFormData: (updates: Partial<WizardFormData>) => void;
}

export function PublishSettingsStep({
  formData,
  updateFormData,
}: PublishSettingsStepProps) {
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
        <h3 className="text-lg font-semibold mb-2">Publishing Settings</h3>
        <p className="text-muted-foreground">
          Configure when and how your update will be published
        </p>
      </div>

      <Tabs defaultValue="timing" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timing">
            <Clock className="h-4 w-4 mr-2" />
            Timing
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="engagement">
            <MessageSquare className="h-4 w-4 mr-2" />
            Engagement
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publishing Schedule</CardTitle>
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
                    <h4 className="font-semibold">Publish Now</h4>
                    <p className="text-sm text-muted-foreground">
                      Send immediately
                    </p>
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
                    <h4 className="font-semibold">Schedule</h4>
                    <p className="text-sm text-muted-foreground">Send later</p>
                  </CardContent>
                </Card>
              </div>

              {/* Scheduled Publishing Options */}
              {!formData.publishingSettings.publishNow && (
                <div className="space-y-4 border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Schedule Date</Label>
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
                                )
                              : "Select date"}
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
                      <Label>Schedule Time</Label>
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
                    <Label>Timezone</Label>
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
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">
                          Eastern Time
                        </SelectItem>
                        <SelectItem value="America/Chicago">
                          Central Time
                        </SelectItem>
                        <SelectItem value="America/Denver">
                          Mountain Time
                        </SelectItem>
                        <SelectItem value="America/Los_Angeles">
                          Pacific Time
                        </SelectItem>
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
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send email to recipients
                    </p>
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
                    <Label className="text-base">Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send mobile push notifications
                    </p>
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
                    <Label className="text-base">In-App Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show notification in app
                    </p>
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
                    <Label className="text-base">Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Send reminders for unread updates
                    </p>
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
                    <Label>Reminder Interval</Label>
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
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="4">4 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="72">3 days</SelectItem>
                        <SelectItem value="168">1 week</SelectItem>
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
                  Interaction Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Allow Likes</Label>
                    <p className="text-sm text-muted-foreground">
                      Let users like the update
                    </p>
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
                    <Label className="text-base">Allow Comments</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable comments on the update
                    </p>
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
                    <Label className="text-base">Allow Sharing</Label>
                    <p className="text-sm text-muted-foreground">
                      Let users share the update
                    </p>
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
                <CardTitle className="text-base">Display Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Require Confirmation</Label>
                    <p className="text-sm text-muted-foreground">
                      Users must confirm they've read it
                    </p>
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
                    <Label className="text-base">Show as Pop-up</Label>
                    <p className="text-sm text-muted-foreground">
                      Display as modal when users login
                    </p>
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
                    <Label className="text-base">Author Attribution</Label>
                    <p className="text-sm text-muted-foreground">
                      Show author name on the update
                    </p>
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
                    <Label>Author Name (Optional)</Label>
                    <Input
                      value={formData.publishingSettings.authorName || ""}
                      onChange={(e) =>
                        updatePublishingSettings({ authorName: e.target.value })
                      }
                      placeholder="Leave blank to use your name"
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
