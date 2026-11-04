"use client";

import { useTranslation } from "react-i18next";

import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileOfflineQueue } from "@/hooks/useMobileOfflineQueue";
import { Link } from "@/lib/router-adapter";

export function MobileOfflineQueueStatus() {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { online, summary, retryFailed, clearSynced } = useMobileOfflineQueue();

  if (!isMobile) return null;

  const activeCount =
    summary.pending + summary.syncing + summary.failed + summary.conflict;

  if (online && activeCount === 0 && summary.synced === 0) {
    return null;
  }

  const hasProblems = summary.failed > 0 || summary.conflict > 0;
  const route = summary.nextRoute ?? "/app/dashboard";

  return (
    <section
      aria-label={t("shell.offlineSyncQueue")}
      className="border-b border-border bg-background px-3 py-2"
      data-mobile-offline-queue="true"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-muted">
          {online ? (
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          ) : (
            <WifiOff className="h-4 w-4" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold leading-tight">
              {online ? t("literals.syncQueue") : t("literals.offlineMode")}
            </p>
            {summary.pending > 0 ? (
              <Badge variant="secondary">{summary.pending} {t("literals.pending")}</Badge>
            ) : null}
            {summary.failed > 0 ? (
              <Badge variant="destructive">{summary.failed} {t("literals.failed")}</Badge>
            ) : null}
            {summary.conflict > 0 ? (
              <Badge variant="outline">{summary.conflict} {t("literals.conflict")}</Badge>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {hasProblems
              ? t("literals.reviewFailedOrConflictingMobileWorkBeforeClosing")
              : online
                ? t("literals.queuedMobileWorkWillSyncThroughItsWorkflow")
                : t("literals.tasksFormsAndCountsAreSavedToThis")}
          </p>
        </div>
        {hasProblems ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-9"
            onClick={retryFailed}
          >
            {t("shell.retry")}
          </Button>
        ) : summary.synced > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-9"
            onClick={clearSynced}
          >
            {t("shell.clear")}
          </Button>
        ) : (
          <Button asChild variant="ghost" size="sm" className="min-h-9">
            <Link to={route} aria-label={t("shell.openQueuedWorkflow")}>
              {t("shell.open")}
            </Link>
          </Button>
        )}
        {hasProblems ? (
          <AlertTriangle
            className="h-4 w-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
        ) : null}
      </div>
    </section>
  );
}
