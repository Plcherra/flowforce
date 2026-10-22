import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

type ViewType = "month" | "week" | "day" | "year";

interface ViewSelectorProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  isMobile?: boolean;
  mode?: "scheduling" | "events";
}

export function ViewSelector({
  currentView,
  onViewChange,
  isMobile = false,
  mode = "scheduling",
}: ViewSelectorProps) {
  const { t } = useTranslation();
  const isScheduling = mode === "scheduling";

  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Button
            variant={currentView === "day" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => onViewChange("day")}
          >
            {t("schedule.day")}
          </Button>
          <Button
            variant={currentView === "week" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => onViewChange("week")}
          >
            {t("schedule.week")}
          </Button>
          <Button
            variant={currentView === "month" ? "default" : "outline"}
            size="sm"
            className="flex-1"
            onClick={() => onViewChange("month")}
          >
            {t("schedule.month")}
          </Button>
        </div>

        {isScheduling && (
          <div className="flex items-center justify-center space-x-4 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-success rounded-full"></div>
              <span>{t("schedule.published")}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-warning rounded-full"></div>
              <span>{t("schedule.draft")}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-destructive rounded-full"></div>
              <span>{t("schedule.understaffed")}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Button
          variant={currentView === "day" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewChange("day")}
        >
          {t("schedule.day")}
        </Button>
        <Button
          variant={currentView === "week" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewChange("week")}
        >
          {t("schedule.week")}
        </Button>
        <Button
          variant={currentView === "month" ? "default" : "outline"}
          size="sm"
          onClick={() => onViewChange("month")}
        >
          {t("schedule.month")}
        </Button>
        {isScheduling && (
          <Button
            variant={currentView === "year" ? "default" : "outline"}
            size="sm"
            onClick={() => onViewChange("year")}
          >
            {t("schedule.year")}
          </Button>
        )}
      </div>

      {isScheduling && (
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-success rounded"></div>
            <span>{t("schedule.published")}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-warning rounded"></div>
            <span>{t("schedule.draft")}</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-destructive rounded"></div>
            <span>{t("schedule.understaffed")}</span>
          </div>
        </div>
      )}
    </div>
  );
}
