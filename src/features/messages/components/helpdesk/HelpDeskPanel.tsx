import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LifeBuoy, RefreshCw, AlertCircle, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTickets } from "@/hooks/useTickets";
import { CreateTicketDialog } from "@/features/helpdesk/components/CreateTicketDialog";

interface HelpDeskPanelProps {
  companyId?: string | null;
  organizationName?: string | null;
  onClose?: () => void;
}

const STATUS_TEXT: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-muted-foreground",
  medium: "text-foreground",
  high: "text-amber-600",
  urgent: "text-red-600",
};

export function HelpDeskPanel({
  companyId,
  organizationName,
  onClose,
}: HelpDeskPanelProps) {
  const hasCompany = Boolean(companyId);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { tickets, loading, error, refresh, usingFallback } = useTickets({
    companyId: companyId ?? undefined,
    enabled: hasCompany,
  });

  const topTickets = useMemo(() => tickets.slice(0, 4), [tickets]);
  const openCount = useMemo(
    () =>
      tickets.filter(
        (ticket) => ticket.status === "open" || ticket.status === "in_progress",
      ).length,
    [tickets],
  );

  return (
    <div className="rounded-3xl border bg-background/95 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.4em] text-muted-foreground">
            <LifeBuoy className="h-3.5 w-3.5" />
            Help Desk
          </div>
          <h3 className="mt-2 text-lg font-semibold">Support flow</h3>
          <p className="text-sm text-muted-foreground">
            {organizationName
              ? `${organizationName} help queue`
              : "Route internal requests alongside chat."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{openCount} active</Badge>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close help desk panel"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          className="gap-2"
          onClick={() => setCreateDialogOpen(true)}
          disabled={!hasCompany}
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => void refresh()}
          disabled={loading || !hasCompany}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        {usingFallback && (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3.5 w-3.5" />
            fallback data
          </Badge>
        )}
      </div>

      {error && (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-4">
        {!hasCompany ? (
          <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Connect your workspace to load help requests.
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={`helpdesk-skeleton-${index}`}
                className="h-20 w-full rounded-2xl"
              />
            ))}
          </div>
        ) : topTickets.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No tickets yet. Create one from any message to populate the queue.
          </div>
        ) : (
          <ScrollArea className="max-h-[360px] pr-2">
            <div className="space-y-3">
              {topTickets.map((ticket) => (
                <motion.div
                  key={ticket.id}
                  layout
                  className="rounded-2xl border border-border/70 bg-background/80 p-3 cursor-pointer hover:bg-background/90 transition-colors"
                  onClick={() => {
                    // Could open ticket details dialog here if needed
                    window.location.href = "/app/help-desk";
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{ticket.subject}</p>
                    <Badge variant="outline" className="text-[11px]">
                      {STATUS_TEXT[ticket.status] ?? ticket.status}
                    </Badge>
                  </div>
                  {ticket.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {ticket.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                    <span
                      className={
                        PRIORITY_COLORS[ticket.priority] ??
                        "text-muted-foreground"
                      }
                    >
                      Priority: {ticket.priority}
                    </span>
                    <span className="text-muted-foreground">
                      Updated{" "}
                      {new Date(
                        ticket.updatedAt ?? ticket.createdAt,
                      ).toLocaleDateString()}
                    </span>
                    <span className="text-muted-foreground">
                      {ticket.category
                        ? `Category: ${ticket.category}`
                        : "General"}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      <CreateTicketDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTicketCreated={refresh}
      />
    </div>
  );
}
