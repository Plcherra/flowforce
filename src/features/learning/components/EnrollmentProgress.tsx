import { useTranslation } from "react-i18next";
import { Fragment, useState } from "react";
import {
  Activity,
  CheckSquare,
  Clock,
  GraduationCap,
  LineChart,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type {
  LearningCatalogRecord,
  LearningEnrollment,
  LearningProgressEvent,
  LearningProgressSnapshot,
} from "@/types/learning";

interface EnrollmentProgressProps {
  enrollments: LearningEnrollment[];
  courses: Map<string, LearningCatalogRecord>;
  progressEvents: Record<string, LearningProgressEvent[]>;
  progressSnapshots: Record<string, LearningProgressSnapshot[]>;
  progressEventCursors: Record<string, string | null>;
  progressSnapshotCursors: Record<string, string | null>;
  onCompleteNextModule: (enrollmentId: string, moduleIndex: number) => void;
  onLoadMoreProgress: (enrollmentId: string) => Promise<void>;
}

export function EnrollmentProgress({
  enrollments,
  courses,
  progressEvents,
  progressSnapshots,
  progressEventCursors,
  progressSnapshotCursors,
  onCompleteNextModule,
  onLoadMoreProgress,
}: EnrollmentProgressProps) {
  const { t } = useTranslation();
  const [loadingMoreIds, setLoadingMoreIds] = useState<Record<string, boolean>>(
    {},
  );

  if (enrollments.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-5 w-5 text-primary" />
            {t("learning.noEnrollmentsYet")}
          </CardTitle>
          <CardDescription>
            {t("learning.enrollInACourseFromTheCatalogToStartTrackingYourProgress")}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {enrollments.map((enrollment) => {
        const course = courses.get(enrollment.courseId);
        if (!course) {
          return null;
        }
        const nextModuleIndex = Math.min(
          enrollment.currentModule,
          Math.max(course.modules.length - 1, 0),
        );
        const nextModule = course.modules[nextModuleIndex];
        const events = progressEvents[enrollment.id] ?? [];
        const snapshots = progressSnapshots[enrollment.id] ?? [];
        const hasMoreHistory = Boolean(
          progressEventCursors[enrollment.id] ||
            progressSnapshotCursors[enrollment.id],
        );
        const loadingMore = loadingMoreIds[enrollment.id];

        const handleLoadMore = async () => {
          if (loadingMore) return;
          setLoadingMoreIds((previous) => ({
            ...previous,
            [enrollment.id]: true,
          }));
          try {
            await onLoadMoreProgress(enrollment.id);
          } finally {
            setLoadingMoreIds((previous) => ({
              ...previous,
              [enrollment.id]: false,
            }));
          }
        };

        return (
          <Card key={enrollment.id} className="shadow-sm">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <CardDescription>
                    {t("learning.levelLine", {
                      level: course.levelRequirement,
                      hours: course.estimatedHours,
                      xp: course.xpReward,
                    })}
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    enrollment.status === "completed" ? "default" : "outline"
                  }
                >
                  {enrollment.status === "completed"
                    ? t("learning.completed")
                    : t("learning.inProgress")}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>{t("onboarding.sidebar.progress")}</span>
                  <span className="font-medium">
                    {enrollment.progressPercent.toFixed(0)}%
                  </span>
                </div>
                <Progress value={enrollment.progressPercent} />
              </div>

              <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />{" "}
                  {enrollment.hoursCompleted.toFixed(1)} hrs logged
                </span>
                <span className="flex items-center gap-1">
                  <LineChart className="h-3 w-3" /> {enrollment.level}
                </span>
                <span className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" /> {enrollment.currentModule}
                  /{course.modules.length} modules
                </span>
              </div>

              {enrollment.status !== "completed" && nextModule && (
                <div className="flex flex-col gap-2 rounded-md border border-dashed p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        Next up: {nextModule.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {nextModule.estimatedMinutes} min · {nextModule.xpAward}{" "}
                        XP
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        onCompleteNextModule(enrollment.id, nextModuleIndex)
                      }
                    >
                      {t("learning.markComplete")}
                    </Button>
                  </div>
                </div>
              )}

              {events.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">{t("learning.recentActivity")}</p>
                  <div className="space-y-2">
                    {events.slice(0, 4).map((event) => (
                      <Fragment key={event.id}>
                        <div className="flex flex-col rounded-md border p-3 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Activity className="h-3 w-3" />
                            <span>
                              {new Date(event.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="mt-1 font-medium text-foreground">
                            {event.eventType.replace("_", " ")}
                          </div>
                          {event.note && (
                            <div className="text-muted-foreground">
                              {event.note}
                            </div>
                          )}
                        </div>
                      </Fragment>
                    ))}
                  </div>
                </div>
              )}

              {snapshots.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">{t("learning.progressCheckpoints")}</p>
                  <div className="space-y-2">
                    {snapshots.map((snapshot) => (
                      <div
                        key={snapshot.id}
                        className="rounded-md border p-3 text-xs"
                      >
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-foreground">
                              {snapshot.progressPercent.toFixed(0)}% complete ·{" "}
                              {snapshot.timeSpentMinutes} min logged
                            </div>
                            {snapshot.aiRecommendation && (
                              <p className="text-muted-foreground">
                                {snapshot.aiRecommendation}
                              </p>
                            )}
                          </div>
                          <span className="text-muted-foreground">
                            {new Date(snapshot.recordedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasMoreHistory && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleLoadMore()}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("learning.loading")}
                      </>
                    ) : (
                      t("learning.loadMoreHistory")
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
