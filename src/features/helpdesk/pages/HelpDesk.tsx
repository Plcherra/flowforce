import React, { useState, useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useProfile } from "@/hooks/useProfile";
import { useTickets } from "@/hooks/useTickets";
import { useCommunicationBootstrap } from "@/hooks/useCommunicationBootstrap";
import { PageLoader } from "@/components/common/PageLoader";
import { EmptyStateCard } from "@/components/common/EmptyStateCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  LifeBuoy,
  Plus,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { CreateTicketDialog } from "@/features/helpdesk/components/CreateTicketDialog";
import { TicketDetailsDialog } from "@/features/helpdesk/components/TicketDetailsDialog";
import type { HelpDeskTicketStatus, HelpDeskTicket } from "@/hooks/useTickets";

const STATUS_CONFIG: Record<
  HelpDeskTicketStatus,
  { label: string; icon: React.ReactNode; color: string }
> = {
  open: {
    label: "Open",
    icon: <Clock className="h-4 w-4" />,
    color: "text-blue-600",
  },
  in_progress: {
    label: "In Progress",
    icon: <AlertCircle className="h-4 w-4" />,
    color: "text-amber-600",
  },
  resolved: {
    label: "Resolved",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-green-600",
  },
  closed: {
    label: "Closed",
    icon: <XCircle className="h-4 w-4" />,
    color: "text-muted-foreground",
  },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

export default function HelpDeskPage() {
  const bootstrap = useCommunicationBootstrap();
  const { profile } = useProfile();
  const _isMobile = useIsMobile();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<HelpDeskTicket | null>(
    null,
  );
  const [ticketDetailsOpen, setTicketDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    HelpDeskTicketStatus | "all"
  >("all");
  const [_activeTab, _setActiveTab] = useState<"all" | "my">("all");

  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const { tickets, loading, error, refresh, createTicket } = useTickets({
    companyId: companyId ?? undefined,
    statusFilter: statusFilter !== "all" ? statusFilter : undefined,
    enabled: Boolean(companyId),
  });

  const filteredTickets = useMemo(() => {
    let filtered = tickets;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.subject.toLowerCase().includes(term) ||
          ticket.description?.toLowerCase().includes(term) ||
          ticket.category?.toLowerCase().includes(term),
      );
    }

    return filtered;
  }, [tickets, searchTerm]);

  const ticketStats = useMemo(() => {
    return {
      open: tickets.filter((t) => t.status === "open").length,
      inProgress: tickets.filter((t) => t.status === "in_progress").length,
      resolved: tickets.filter((t) => t.status === "resolved").length,
      closed: tickets.filter((t) => t.status === "closed").length,
      total: tickets.length,
    };
  }, [tickets]);

  if (!bootstrap.userReady || bootstrap.loading) {
    return <PageLoader text="Loading help desk..." />;
  }

  if (bootstrap.error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Unable to load workspace</AlertTitle>
          <AlertDescription>{bootstrap.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!bootstrap.ready) {
    return (
      <div className="p-6">
        <EmptyStateCard
          title="Waiting for workspace data"
          description="Help desk unlocks once we finish loading your organization information."
          icon={<LifeBuoy className="h-5 w-5" />}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-background/95 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Help Desk</h1>
            <p className="text-muted-foreground">
              Manage support tickets and requests
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Ticket
          </Button>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{ticketStats.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {ticketStats.open}
              </div>
              <div className="text-sm text-muted-foreground">Open</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-amber-600">
                {ticketStats.inProgress}
              </div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {ticketStats.resolved}
              </div>
              <div className="text-sm text-muted-foreground">Resolved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-muted-foreground">
                {ticketStats.closed}
              </div>
              <div className="text-sm text-muted-foreground">Closed</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-col gap-4 md:flex-row">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as HelpDeskTicketStatus | "all")
            }
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 w-3/4 bg-muted rounded" />
                  <div className="mt-2 h-3 w-1/2 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Error loading tickets</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : filteredTickets.length === 0 ? (
          <EmptyStateCard
            title={
              searchTerm || statusFilter !== "all"
                ? "No tickets found"
                : "No tickets yet"
            }
            description={
              searchTerm || statusFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first support ticket to get started"
            }
            icon={<LifeBuoy className="h-5 w-5" />}
            action={
              !searchTerm && statusFilter === "all" ? (
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Ticket
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((ticket) => {
              const statusConfig = STATUS_CONFIG[ticket.status];
              return (
                <Card
                  key={ticket.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setTicketDetailsOpen(true);
                  }}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {ticket.subject}
                          </h3>
                          <Badge
                            className={PRIORITY_COLORS[ticket.priority] || ""}
                          >
                            {ticket.priority}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={statusConfig.color}
                          >
                            {statusConfig.icon}
                            <span className="ml-1">{statusConfig.label}</span>
                          </Badge>
                        </div>
                        {ticket.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                            {ticket.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          {ticket.category && (
                            <span>Category: {ticket.category}</span>
                          )}
                          <span>
                            Created:{" "}
                            {new Date(ticket.createdAt).toLocaleDateString()}
                          </span>
                          {ticket.updatedAt &&
                            ticket.updatedAt !== ticket.createdAt && (
                              <span>
                                Updated:{" "}
                                {new Date(
                                  ticket.updatedAt,
                                ).toLocaleDateString()}
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <CreateTicketDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTicketCreated={refresh}
      />

      <TicketDetailsDialog
        open={ticketDetailsOpen}
        onOpenChange={(open) => {
          setTicketDetailsOpen(open);
          if (!open) {
            setSelectedTicket(null);
          }
        }}
        ticket={selectedTicket}
        onTicketUpdated={refresh}
      />
    </div>
  );
}
