import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export type ReportInboxProcessingFilter = "all" | "ready" | "processing" | "error";

export function ReportInboxStatusFilters({
  value,
  onChange,
}: {
  value: ReportInboxProcessingFilter;
  onChange: (filter: ReportInboxProcessingFilter) => void;
}) {
  const { t } = useTranslation();
  const options = [
    { id: "all", label: t("schedule.allStatuses") },
    { id: "ready", label: t("analytics.ready") },
    { id: "processing", label: t("analytics.processing") },
    { id: "error", label: t("analytics.errors") },
  ] as const satisfies ReadonlyArray<{
    id: ReportInboxProcessingFilter;
    label: string;
  }>;

  return (
    <div
      className="flex flex-wrap gap-2"
      data-testid="reports-status-filters"
      role="toolbar"
      aria-label={t("inventory.filterByStatus")}
    >
      {options.map((item) => (
        <Button
          key={item.id}
          type="button"
          size="sm"
          variant={value === item.id ? "default" : "outline"}
          data-testid={`reports-status-filter-${item.id}`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}