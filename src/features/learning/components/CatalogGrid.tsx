import { useTranslation } from "react-i18next";
import {
  CATEGORY_LABEL_KEYS,
  learningLabel,
  ROLE_LABEL_KEYS,
} from "@/features/learning/learningLabels";
import { useId, useMemo, useState } from "react";
import {
  BookMarked,
  Clock,
  Layers,
  Sparkles,
  Target,
  Users,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import type {
  LearningCatalogRecord,
  LearningEnrollment,
} from "@/types/learning";

interface CatalogGridProps {
  courses: LearningCatalogRecord[];
  enrollments: LearningEnrollment[];
  onEnroll: (courseId: string) => void;
  onShowProgress?: () => void;
  highlightCourseIds?: Set<string>;
}

export function CatalogGrid({
  courses,
  enrollments,
  onEnroll,
  onShowProgress,
  highlightCourseIds,
}: CatalogGridProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const searchInputId = useId();
  const categorySelectId = useId();

  const enrollmentsByCourse = useMemo(() => {
    const map = new Map<string, LearningEnrollment>();
    enrollments.forEach((enrollment) => {
      map.set(enrollment.courseId, enrollment);
    });
    return map;
  }, [enrollments]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((course) => {
      set.add(course.category);
    });
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      if (categoryFilter !== "all" && course.category !== categoryFilter) {
        return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase();
        const haystack =
          `${course.title} ${course.description ?? ""} ${course.category} ${course.targetRoles.join(" ")}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [courses, categoryFilter, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <Label htmlFor={searchInputId} className="sr-only">
            {t("learning.searchCourses")}
          </Label>
          <Input
            id={searchInputId}
            placeholder={t("learning.searchCourses")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="md:w-64"
            aria-label={t("learning.searchCourses")}
          />
          <Label htmlFor={categorySelectId} className="sr-only">
            {t("learning.filterByCategory")}
          </Label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger
              id={categorySelectId}
              className="h-10 md:w-48"
              aria-label={t("learning.filterByCategory")}
            >
              <SelectValue placeholder={t("inventory.allCategories2")} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category === "all"
                    ? t("inventory.allCategories2")
                    : learningLabel(t, CATEGORY_LABEL_KEYS, category)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {onShowProgress && (
          <Button variant="outline" onClick={onShowProgress}>
            {t("learning.viewMyProgress")}
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCourses.map((course) => {
          const enrollment = enrollmentsByCourse.get(course.id);
          const metrics = course.metrics;
          const highlight = highlightCourseIds?.has(course.id);
          const completionRate =
            enrollment?.progressPercent ?? metrics?.avgProgress ?? 0;

          return (
            <Card
              key={course.id}
              className={
                highlight
                  ? "border-primary shadow-sm shadow-primary/10"
                  : undefined
              }
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {course.title}
                      {highlight && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="mr-1 h-3 w-3" /> {t("learning.recommended")}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                  </div>
                  <Badge variant="outline">
                    {learningLabel(t, CATEGORY_LABEL_KEYS, course.category)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />{" "}
                    {t("learning.hoursShort", { count: course.estimatedHours })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" /> {course.xpReward} XP
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />{" "}
                    {t("learning.moduleCount", { count: course.modules.length })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />{" "}
                    {course.targetRoles
                      .map((role) => learningLabel(t, ROLE_LABEL_KEYS, role))
                      .join(", ")}
                  </span>
                  {course.certificationCode && (
                    <span className="flex items-center gap-1">
                      <BookMarked className="h-3 w-3" />{" "}
                      {course.certificationCode}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>
                      {enrollment
                        ? t("learning.yourProgress")
                        : t("learning.averageCompletion")}
                    </span>
                    <span className="font-medium">
                      {completionRate.toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={completionRate} />
                </div>

                {metrics && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {t("learning.learnerActiveCount", {
                        count: metrics.activeLearners,
                      })}
                    </span>
                    <span>
                      {t("learning.learnerCompletedCount", {
                        count: metrics.completions,
                      })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {t("learning.levelPlus", { level: course.levelRequirement })}
                  </div>
                  {enrollment ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!onShowProgress}
                      onClick={() => onShowProgress?.()}
                    >
                      {t("common.continue")}
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => void onEnroll(course.id)}>
                      {t("learning.enroll")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
