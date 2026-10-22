import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { LearningCatalogRecord } from "@/types/learning";
import {
  CATEGORY_LABEL_KEYS,
  DELIVERY_LABEL_KEYS,
  learningLabel,
} from "@/features/learning/learningLabels";

interface LearningCatalogProps {
  courses: LearningCatalogRecord[];
  recommendedCourseIds: Set<string>;
  loading: boolean;
  onEnroll?: (courseId: string) => void;
  onCreateCourse?: () => void;
  canCreateCourse: boolean;
}

export function LearningCatalog({
  courses,
  recommendedCourseIds,
  loading,
  onEnroll,
  onCreateCourse,
  canCreateCourse,
}: LearningCatalogProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{t("learning.catalog")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("learning.coursesAvailableToEnrollRightNow")}
          </p>
        </div>
        {canCreateCourse && (
          <Button type="button" onClick={onCreateCourse}>
            {t("learning.createCourse")}
          </Button>
        )}
      </div>

      {loading && courses.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-2 h-3 w-48" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-10 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>{t("learning.noCoursesFound")}</CardTitle>
            <CardDescription>
              {t("learning.addACourseToStartBuildingYourLearningCatalog")}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const recommended = recommendedCourseIds.has(course.id);
            return (
              <Card key={course.id} className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">{course.title}</CardTitle>
                  <CardDescription>
                    {course.description ?? t("learning.noDescriptionProvided")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      {learningLabel(t, CATEGORY_LABEL_KEYS, course.category)}
                    </Badge>
                    <Badge variant="secondary">
                      {learningLabel(t, DELIVERY_LABEL_KEYS, course.deliveryMode)}
                    </Badge>
                    {recommended && <Badge>{t("learning.recommended")}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {t("learning.xpRewardLine", {
                      xp: course.xpReward.toLocaleString(),
                      hours: course.estimatedHours,
                    })}
                  </p>
                  <Button type="button" onClick={() => onEnroll?.(course.id)}>
                    {t("learning.enroll")}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LearningCatalog;
