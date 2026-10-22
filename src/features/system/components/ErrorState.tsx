import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({
  title,
  message,
  onRetry,
}: ErrorStateProps) {
  const { t } = useTranslation();
  const heading = title ?? t("common.somethingWentWrong");
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
      <div>
        <h2 className="text-lg font-semibold text-destructive">{heading}</h2>
        <p className="mt-2 text-sm text-destructive/80">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" onClick={onRetry}>{t("forms.tryAgain")}</Button>
      )}
    </div>
  );
}
