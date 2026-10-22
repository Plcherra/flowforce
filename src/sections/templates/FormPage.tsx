import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Props = { title?: string; description?: string };

export function FormPage({ title, description }: Props) {
  const { t } = useTranslation();
  const pageTitle = title ?? t("schedule.form");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{pageTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>{t("schedule.name")}</Label>
            <Input placeholder={t("sections.enterName")} />
          </div>
          <div>
            <Label>{t("schedule.status")}</Label>
            <Input placeholder={t("sections.active")} />
          </div>
        </div>
        <Button>{t("forms.submit")}</Button>
      </CardContent>
    </Card>
  );
}
