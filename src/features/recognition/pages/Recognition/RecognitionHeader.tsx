import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCcw, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

interface RecognitionHeaderProps {
  loading: boolean;
  syncing: boolean;
  totalRecognitions: number;
  onRefresh?: () => void;
  onSync?: () => void;
}

export function RecognitionHeader({
  loading,
  syncing,
  totalRecognitions,
  onRefresh,
  onSync,
}: RecognitionHeaderProps) {
  const { t } = useTranslation();
  return (
    <header className="flex flex-col gap-4 rounded-2xl border bg-card/80 p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t("common.recognition")}</p>
        <h1 className="mt-1 text-3xl font-bold">{t("recognition.recognitionCulture")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("recognition.celebrateWinsMonitorBadgeUnlocksAndKeepCopilot")}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline">
          {totalRecognitions} recognitions tracked
        </Badge>
        <Button
          type="button"
          variant="outline"
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCcw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />{t("common.refresh")}</Button>
        <Button type="button" onClick={onSync} disabled={syncing}>
          <Sparkles
            className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`}
          />{t("recognition.syncAutomation")}</Button>
      </div>
    </header>
  );
}

export default RecognitionHeader;
