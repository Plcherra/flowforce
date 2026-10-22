import { useTranslation } from "react-i18next";
import { Lightbulb, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  CourseRecommendation,
  LearningCatalogRecord,
} from "@/types/learning";

interface RecommendationsPanelProps {
  recommendations: CourseRecommendation[];
  courseById: Map<string, LearningCatalogRecord>;
  onEnroll: (courseId: string) => void;
}

export function RecommendationsPanel({
  recommendations,
  courseById,
  onEnroll,
}: RecommendationsPanelProps) {
  const { t } = useTranslation();
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          {t("learning.coPilotSuggestions")}
        </CardTitle>
        <CardDescription>
          {t("learning.coursesThatStrengthenYourCurrentGrowthPlan")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((recommendation) => {
          const course = courseById.get(recommendation.courseId);
          if (!course) {
            return null;
          }

          return (
            <div
              key={recommendation.courseId}
              className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {course.title}
                  <Badge variant="outline">{course.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {recommendation.reason}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" /> Confidence{" "}
                    {(recommendation.confidence * 100).toFixed(0)}%
                  </span>
                  <span>{course.modules.length} modules</span>
                  <span>{course.xpReward} XP</span>
                </div>
              </div>
              <Button size="sm" onClick={() => void onEnroll(course.id)}>
                {t("learning.enroll")}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
