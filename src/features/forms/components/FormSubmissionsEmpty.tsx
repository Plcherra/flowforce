import { useTranslation } from "react-i18next";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function FormSubmissionsEmpty({ onFill }: { onFill?: () => void }) {
  const { t } = useTranslation();
  return (
    <Card data-testid="form-submissions-empty">
      <CardContent className="py-8 text-center">
        <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="mb-2 text-lg font-semibold">{t("forms.noSubmissionsYet")}</h3>
        <p className="mb-4 text-muted-foreground">
          {t("forms.thisFormHasnTReceivedAnySubmissionsYet")}
        </p>
        {onFill ? (
          <Button type="button" onClick={onFill}>
            {t("forms.fillForm")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
