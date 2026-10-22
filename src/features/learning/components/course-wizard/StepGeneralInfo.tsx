import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LearningDeliveryMode } from "@/types/learning";
import {
  CATEGORY_LABEL_KEYS,
  learningLabel,
} from "@/features/learning/learningLabels";

interface StepGeneralInfoProps {
  title: string;
  description: string;
  category: string;
  deliveryMode: LearningDeliveryMode;
  categories: string[];
  onChange: (
    updates: Partial<{
      title: string;
      description: string;
      category: string;
      deliveryMode: LearningDeliveryMode;
    }>,
  ) => void;
}

export function StepGeneralInfo({
  title,
  description,
  category,
  deliveryMode,
  categories,
  onChange,
}: StepGeneralInfoProps) {
  const { t } = useTranslation();
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>{t("learning.courseBlueprint")}</CardTitle>
        <CardDescription>
          {t("learning.defineHowTheCourseShowsUpInTheCatalog")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="course-title">{t("schedule.title")}</Label>
          <Input
            id="course-title"
            value={title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder={t("learning.operationsOnboarding")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="course-description">{t("tasks.description")}</Label>
          <Textarea
            id="course-description"
            value={description}
            onChange={(event) => onChange({ description: event.target.value })}
            rows={4}
            placeholder={t("learning.outlineTheOutcomesPrerequisitesOrGuidanceForTheLearner")}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("dashboard.category")}</Label>
            <Select
              value={category}
              onValueChange={(value) => onChange({ category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("inventory.selectCategory")} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((option) => (
                  <SelectItem key={option} value={option}>
                    {learningLabel(t, CATEGORY_LABEL_KEYS, option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("learning.deliveryMode")}</Label>
            <Select
              value={deliveryMode}
              onValueChange={(value) =>
                onChange({ deliveryMode: value as LearningDeliveryMode })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t("learning.selectDeliveryMode")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self_paced">{t("learning.selfPaced")}</SelectItem>
                <SelectItem value="live">{t("learning.liveCohort")}</SelectItem>
                <SelectItem value="blended">{t("learning.blended")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StepGeneralInfo;
