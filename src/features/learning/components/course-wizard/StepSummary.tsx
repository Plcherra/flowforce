import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CourseModuleInput, LearningDeliveryMode } from "@/types/learning";
import {
  CATEGORY_LABEL_KEYS,
  DELIVERY_LABEL_KEYS,
  learningLabel,
  ROLE_LABEL_KEYS,
} from "@/features/learning/learningLabels";

interface StepSummaryProps {
  title: string;
  description: string;
  category: string;
  deliveryMode: LearningDeliveryMode;
  targetRoles: string[];
  levelRequirement: number;
  xpReward: number;
  estimatedHours: number;
  modules: CourseModuleInput[];
}

export function StepSummary({
  title,
  description,
  category,
  deliveryMode,
  targetRoles,
  levelRequirement,
  xpReward,
  estimatedHours,
  modules,
}: StepSummaryProps) {
  const { t } = useTranslation();
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>{t("learning.reviewAndPublish")}</CardTitle>
        <CardDescription>
          {t("learning.doubleCheckTheExperienceBeforeDeploying")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-lg font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground">
            {description || t("learning.noDescriptionProvided")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">
            {learningLabel(t, CATEGORY_LABEL_KEYS, category)}
          </Badge>
          <Badge variant="secondary">
            {learningLabel(t, DELIVERY_LABEL_KEYS, deliveryMode)}
          </Badge>
          <Badge variant="outline">
            {t("learning.levelPlus", { level: levelRequirement })}
          </Badge>
        </div>
        <div className="rounded-xl border bg-muted/20 p-4 text-sm">
          <p className="font-semibold text-foreground">
            {t("learning.xpEstimated", {
              xp: xpReward.toLocaleString(),
              hours: estimatedHours,
            })}
          </p>
          <p className="text-muted-foreground">
            {t("learning.targetRolesLine", {
              roles:
                targetRoles.length > 0
                  ? targetRoles
                      .map((role) => learningLabel(t, ROLE_LABEL_KEYS, role))
                      .join(", ")
                  : t("learning.allEmployees"),
            })}
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground">
            {t("learning.modulesWithCount", { count: modules.length })}
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            {modules.map((module, index) => (
              <li
                key={`${module.title}-${index}`}
                className="rounded-lg border bg-muted/20 p-3"
              >
                <p className="font-medium text-foreground">{module.title}</p>
                <p className="text-xs text-muted-foreground">
                  {module.estimatedMinutes} minutes · {module.xpAward} XP
                </p>
              </li>
            ))}
          </ul>
          {modules.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {t("learning.addAtLeastOneModuleToLaunchTheCourse")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default StepSummary;
