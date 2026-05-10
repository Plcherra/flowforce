import { RotateCcw, Award } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useEmployeeEngagement } from "@/hooks/useEmployeeEngagement";
import { useFeatureFlag } from "@/hooks/useFeatureFlags";

interface EngagementPanelProps {
  employeeId: string | null | undefined;
  role: string | null | undefined;
  displayName?: string;
}

const formatDate = (date: string) => {
  try {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
      return "Recently awarded";
    }
    return parsed.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Recently awarded";
  }
};

export function EngagementPanel({
  employeeId,
  role,
  displayName,
}: EngagementPanelProps) {
  const engagementFeatureEnabled = useFeatureFlag(
    "operations.engagementMetrics",
  );
  const { loading, error, snapshot, badges, milestoneTip, refresh } =
    useEmployeeEngagement(employeeId, role, {
      enabled: engagementFeatureEnabled,
    });

  const progressValue = Math.round(snapshot.progress * 100);
  const levelLabel = engagementFeatureEnabled
    ? `Level ${snapshot.level}`
    : "Disabled";
  const description = engagementFeatureEnabled
    ? `${displayName ? `${displayName.split(" ")[0]}'s` : "Employee"} gamification progress`
    : "Enable engagement metrics to start tracking gamification progress.";

  const renderLoadingState = () => (
    <div className="space-y-4">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );

  const renderDisabledState = () => (
    <div className="space-y-4 text-sm text-muted-foreground">
      <p>Engagement metrics are currently disabled for this workspace.</p>
      <p className="text-xs text-muted-foreground">
        Turn on the engagement metrics feature to start tracking progress.
        Existing activity will backfill automatically once enabled.
      </p>
      <div className="rounded-lg border border-dashed border-primary/20 bg-primary/5 px-4 py-3 text-primary">
        {milestoneTip}
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="space-y-4">
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </div>
      <p className="text-sm text-muted-foreground">
        We&apos;ll keep trying in the background and backfill engagement data
        automatically once it becomes available.
      </p>
    </div>
  );

  const renderActiveState = () => (
    <>
      <section className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-muted-foreground">
            XP Progress · {role ?? "role"}
          </span>
          <span className="text-muted-foreground">
            {snapshot.xpIntoLevel} / {snapshot.xpNeededForNextLevel} XP
          </span>
        </div>
        <Progress value={progressValue} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Total XP: {snapshot.xp}</span>
          <span>Next milestone: L{snapshot.nextLevel}</span>
        </div>
      </section>

      <section className="rounded-lg border border-primary/10 bg-primary/5 px-4 py-3 text-sm text-primary">
        {milestoneTip}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Earned badges</span>
          <Badge variant="outline" className="text-xs">
            {badges.length}
          </Badge>
        </div>

        {badges.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No badges yet. Keep going to earn your first badge!
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {badges.map((badge) => (
              <div
                key={`${badge.code}-${badge.awardedAt}`}
                className="h-full rounded-lg border border-primary/10 bg-card/70 p-3 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-lg">
                    {badge.icon ? (
                      <span className="leading-none">{badge.icon}</span>
                    ) : (
                      <Award className="h-4 w-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{badge.title}</p>
                    {badge.minLevel && (
                      <p className="text-[11px] uppercase text-muted-foreground">
                        Req. L{badge.minLevel}
                      </p>
                    )}
                  </div>
                </div>
                {badge.description && (
                  <p className="mt-2 text-xs leading-snug text-muted-foreground">
                    {badge.description}
                  </p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Awarded {formatDate(badge.awardedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );

  let content = renderLoadingState();
  if (!loading) {
    if (!engagementFeatureEnabled) {
      content = renderDisabledState();
    } else if (error) {
      content = renderErrorState();
    } else {
      content = renderActiveState();
    }
  }

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Engagement</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="text-xs uppercase tracking-wide"
          >
            {levelLabel}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={refresh}
            disabled={loading || !engagementFeatureEnabled}
            aria-label="Refresh engagement data"
          >
            <RotateCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">{content}</CardContent>
    </Card>
  );
}
