import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Award } from "lucide-react";

interface EmptyCertificationsStateProps {
  title: string;
  description: string;
}

export function EmptyCertificationsState({
  title,
  description,
}: EmptyCertificationsStateProps) {
  const { t } = useTranslation();
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Award className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {t("learning.publishRequirementsOrEnrollEmployeesToStartTrackingProgress")}
      </CardContent>
    </Card>
  );
}

export default EmptyCertificationsState;
