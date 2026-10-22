import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import {
  AlertTriangle,
  Bell,
  FileText,
  Lock,
  Megaphone,
  MessageCircle,
  Users,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Message, MessageChannel } from "@/types/messages";
import { buildCommunicationReadinessSummary } from "@/features/messages/utils/communicationReadiness";

interface CommunicationReadinessPanelProps {
  channels: MessageChannel[];
  messages: Message[];
  userId?: string | null;
  onCreateChannel: () => void;
  onCreateAnnouncement: () => void;
}

const reviewTone: Record<string, string> = {
  critical: "border-destructive/40 bg-destructive/10 text-destructive",
  warning:
    "border-warning/40 bg-warning-muted text-warning-foreground",
  info: "border-primary/40 bg-primary/10 text-primary",
};

export function CommunicationReadinessPanel({
  channels,
  messages,
  userId,
  onCreateChannel,
  onCreateAnnouncement,
}: CommunicationReadinessPanelProps) {
  const { t } = useTranslation();
  const summary = useMemo(
    () =>
      buildCommunicationReadinessSummary({
        channels,
        currentMessages: messages,
        userId,
      }),
    [channels, messages, userId],
  );

  const cards = [
    {
      label: "Channels",
      value: summary.totalChannels,
      detail: `${summary.teamChannels} team / ${summary.directChannels} direct`,
      icon: MessageCircle,
    },
    {
      label: "Unread",
      value: summary.unreadChannels,
      detail: `${summary.emptyChannels} inactive`,
      icon: Bell,
    },
    {
      label: "Help desk",
      value: summary.helpdeskChannels,
      detail: "Support routing",
      icon: Users,
    },
    {
      label: "Private",
      value: summary.privateChannels,
      detail: "Scoped channels",
      icon: Lock,
    },
    {
      label: "Attachments",
      value: summary.currentChannelAttachments,
      detail: "Current channel",
      icon: FileText,
    },
  ];

  return (
    <Card className="border-border/70 bg-background/95 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl">{t("messages.communicationReadiness")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("messages.channelsReadsAttachmentsAndAnnouncementsAreMonitoredHere")} </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onCreateAnnouncement}>
              <Megaphone className="mr-2 h-4 w-4" />
              {t("dashboard.announcement")} </Button>
            <Button type="button" onClick={onCreateChannel}>
              {t("messages.createChannel")} </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="rounded-lg border border-border/70 bg-muted/30 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {item.label}
                  </p>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {item.value}
                </p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
            );
          })}
        </div>

        {summary.reviewItems.length > 0 ? (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{t("messages.communicationReviewNeeded")}</AlertTitle>
            <AlertDescription>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {summary.reviewItems.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-md border px-3 py-2 text-sm ${reviewTone[item.severity]}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-medium">{item.label}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {item.severity}
                      </Badge>
                    </span>
                    <span className="mt-1 block truncate">{item.detail}</span>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <div className="rounded-lg border border-success/40 bg-success-muted p-3 text-sm text-success">
            {t("messages.noUnreadOrInactiveChannelIssuesDetected")} </div>
        )}
      </CardContent>
    </Card>
  );
}
