/**
 * Task empty state component
 */

import { useTranslation } from "react-i18next";
import { MessageSquare, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { highlight } from "@/components/ui/highlight";
import { Button } from "@/components/ui/button";

interface TaskEmptyStateProps {
  hasTasks: boolean;
  onResetFilters?: () => void;
}

export function TaskEmptyState({
  hasTasks,
  onResetFilters,
}: TaskEmptyStateProps) {
  const { t } = useTranslation();
  if (hasTasks) {
    return (
      <Card className={highlight.watch} data-testid="tasks-no-results">
        <CardContent className="flex flex-col items-center justify-center space-y-3 rounded-lg py-12 text-center">
          <Search className="h-10 w-10 text-warning-foreground" />
          <h3 className="text-lg font-semibold">{t("tasks.noTasksMatchYourFilters")}</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            {t("tasks.tryAdjustingTheStatusPriorityOrSearchTerm")}
          </p>
          {onResetFilters && (
            <Button variant="ghost" size="sm" onClick={onResetFilters}>
              {t("tasks.resetFilters")}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={highlight.primary} data-testid="tasks-empty-state">
      <CardContent className="flex flex-col items-center justify-center rounded-lg py-12 text-center">
        <MessageSquare className="mb-4 h-12 w-12 text-primary" />
        <h3 className="text-lg font-semibold mb-2">{t("tasks.noTasksYet")}</h3>
        <p className="text-muted-foreground text-center">
          {t("tasks.createYourFirstTaskToGetStartedWith")}
        </p>
      </CardContent>
    </Card>
  );
}
