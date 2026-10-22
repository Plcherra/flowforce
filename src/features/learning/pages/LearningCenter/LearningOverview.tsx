import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  LearningEnrollment,
  PersonalLearningSnapshot,
  CourseRecommendation,
} from "@/types/learning";

interface LearningOverviewProps {
  snapshot: PersonalLearningSnapshot | null;
  enrollments: LearningEnrollment[];
  recommendations: CourseRecommendation[];
  loading: boolean;
  onOpenCatalog?: () => void;
}

export function LearningOverview({
  snapshot,
  enrollments,
  recommendations,
  loading,
  onOpenCatalog,
}: LearningOverviewProps) {
  const { t } = useTranslation();
  const stats = snapshot
    ? [
        { label: t("learning.activeCourses"), value: snapshot.activeEnrollments.length },
        { label: t("learning.hoursLogged"), value: snapshot.totalHours.toFixed(1) },
        { label: t("learning.xpEarned"), value: snapshot.totalXpEarned.toLocaleString() },
      ]
    : [];

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{t("learning.learningSnapshot")}</CardTitle>
            <CardDescription>
              {t("learning.progressAcrossPersonalEnrollments")}
            </CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={onOpenCatalog}>
            {t("learning.browseCatalog")}
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {loading && stats.length === 0
            ? Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-xl border bg-muted/20 p-4"
                >
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))
            : stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border bg-muted/20 p-4"
                >
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                </div>
              ))}
          {!loading && stats.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("learning.enrollInYourFirstCourseToStartTrackingHoursAndXp")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{t("learning.activeEnrollments")}</CardTitle>
          <CardDescription>{t("learning.trackProgressForEachCourse")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && enrollments.length === 0
            ? Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-3 w-full rounded-full" />
                </div>
              ))
            : enrollments.slice(0, 4).map((enrollment) => (
                <div key={enrollment.id}>
                  <div className="flex items-center justify-between text-sm font-medium">
                    <p>
                      {t("learning.courseNumber", {
                        id: enrollment.courseId.slice(0, 4),
                      })}
                    </p>
                    <span>{Math.round(enrollment.progressPercent)}%</span>
                  </div>
                  <Progress
                    value={enrollment.progressPercent}
                    className="mt-2"
                  />
                </div>
              ))}
          {!loading && enrollments.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("learning.youHaveNoActiveCoursesRightNow")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>{t("learning.recommendedNextSteps")}</CardTitle>
          <CardDescription>
            {t("learning.aiSuggestionsTailoredToYourXpGaps")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && recommendations.length === 0
            ? Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-64" />
                </div>
              ))
            : recommendations.slice(0, 4).map((rec) => (
                <div
                  key={rec.courseId}
                  className="rounded-xl border bg-muted/20 p-3"
                >
                  <p className="text-sm font-semibold">
                    Course #{rec.courseId.slice(0, 4)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {rec.reason} · Confidence {Math.round(rec.confidence * 100)}
                    %
                  </p>
                </div>
              ))}
          {!loading && recommendations.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("learning.completeACourseOrSyncCertificationsToSeePersonalisedRecommendations")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LearningOverview;
