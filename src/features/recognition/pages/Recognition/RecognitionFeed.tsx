import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecognitionRecord } from "@/types/recognition";
import { useTranslation } from "react-i18next";
import { RecognitionText } from "@/features/recognition/components/RecognitionText";
import {
  useBadgeReasonTranslations,
  useRecognitionMessageTranslations,
} from "@/features/recognition/hooks/useRecognitionTranslations";

interface EarnedBadgeReason {
  id: string;
  title: string;
  reason: string | null;
  awardedAt?: string;
}

interface RecognitionFeedProps {
  recognitions: RecognitionRecord[];
  loading: boolean;
  earnedBadges?: EarnedBadgeReason[];
}

export function RecognitionFeed({
  recognitions,
  loading,
  earnedBadges = [],
}: RecognitionFeedProps) {
  const { t } = useTranslation();
  const messageSources = useMemo(
    () =>
      recognitions.map((recognition) => ({
        id: recognition.id,
        text: recognition.reward_details?.message ?? "",
        updated_at: recognition.awarded_at,
      })),
    [recognitions],
  );
  const badgeSources = useMemo(
    () =>
      earnedBadges.map((badge) => ({
        id: badge.id,
        text: badge.reason,
        updated_at: badge.awardedAt ?? null,
      })),
    [earnedBadges],
  );
  const messageTranslations = useRecognitionMessageTranslations(messageSources);
  const reasonTranslations = useBadgeReasonTranslations(badgeSources);
  const badgesWithReasons = earnedBadges.filter((badge) => badge.reason);
  const badgeReasonList = badgesWithReasons.map((badge) => (
    <div key={badge.id} className="rounded-xl border bg-muted/20 p-3">
      <p className="text-sm font-semibold">{badge.title}</p>
      <RecognitionText
        recordId={badge.id}
        text={badge.reason ?? ""}
        translation={reasonTranslations.get(badge.id) ?? null}
        className="text-sm text-foreground"
      />
    </div>
  ));
  if (loading && recognitions.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-3 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!loading && recognitions.length === 0) {
    return (
      <div className="space-y-4">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">{t("recognition.recognitionFeed")}</CardTitle>
            <CardDescription>{t("updates.noRecognitionsYet")}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{t("recognition.onceTeammatesCompleteGoalsTasksOrTrainingTheir")}</CardContent>
        </Card>
        {badgeReasonList}
      </div>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{t("recognition.recognitionFeed")}</CardTitle>
        <CardDescription>{t("recognition.latestShoutOutsAcrossTheOrganisation")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recognitions.slice(0, 12).map((recognition) => {
          const recipient = recognition.recipient;
          const fullName = recipient
            ? `${recipient.first_name ?? ""} ${recipient.last_name ?? ""}`.trim() ||
              "Unknown employee"
            : "Unknown employee";
          const message =
            recognition.reward_details?.message ?? "Recognition awarded";
          const source = recognition.reward_details?.source ?? "manual";

          return (
            <div
              key={recognition.id}
              className="flex items-center gap-3 rounded-xl border bg-muted/20 p-3"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage
                  src={recipient?.avatar_url ?? undefined}
                  alt={fullName}
                />
                <AvatarFallback>
                  {fullName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-semibold">{fullName}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {source.replace(/_/g, " ")}
                </p>
                <RecognitionText
                  recordId={recognition.id}
                  text={message}
                  translation={messageTranslations.get(recognition.id) ?? null}
                  className="text-sm text-foreground"
                />
              </div>
              <div className="text-xs text-muted-foreground">
                {new Date(recognition.awarded_at).toLocaleDateString()}
              </div>
            </div>
          );
        })}
        {badgeReasonList}
      </CardContent>
    </Card>
  );
}

export default RecognitionFeed;
