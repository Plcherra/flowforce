"use client";

import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMobileOfflineQueue } from "@/hooks/useMobileOfflineQueue";
import { Link } from "@/lib/router-adapter";

export function MobileOfflineQueueStatus() {
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
      aria-label="Offline sync queue"
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
              {online ? "Sync queue" : "Offline mode"}
            </p>
            {summary.pending > 0 ? (
              <Badge variant="secondary">{summary.pending} pending</Badge>
            ) : null}
            {summary.failed > 0 ? (
              <Badge variant="destructive">{summary.failed} failed</Badge>
            ) : null}
            {summary.conflict > 0 ? (
              <Badge variant="outline">{summary.conflict} conflict</Badge>
            ) : null}
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {hasProblems
              ? "Review failed or conflicting mobile work before closing shift."
              : online
                ? "Queued mobile work will sync through its workflow."
                : "Tasks, forms, and counts are saved to this device first."}
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
            Retry
          </Button>
        ) : summary.synced > 0 ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-9"
            onClick={clearSynced}
          >
            Clear
          </Button>
        ) : (
          <Button asChild variant="ghost" size="sm" className="min-h-9">
            <Link to={route} aria-label="Open queued workflow">
              Open
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
