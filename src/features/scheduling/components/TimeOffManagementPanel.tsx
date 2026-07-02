import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
} from "lucide-react";
import { TimeOffRequest } from "@/types/scheduling-unified";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import {
  fetchTimeOffRequests,
  updateTimeOffStatus,
} from "@/features/scheduling/repositories/shiftSwapsRepository";
import { TimeOffRequestPanel } from "@/features/availability/components/TimeOffRequestPanel";

interface TimeOffManagementPanelProps {
  canApprove?: boolean;
  staffOnly?: boolean;
}

function getDisplayName(user?: {
  first_name?: string | null;
  last_name?: string | null;
}) {
  const name = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || "Team member";
}

function getInitials(user?: {
  first_name?: string | null;
  last_name?: string | null;
}) {
  const initials =
    `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.trim();
  return initials || "TM";
}

function getStatusIcon(status: string) {
  switch (status) {
    case "approved":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "denied":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  }
}

export function TimeOffManagementPanel({
  canApprove = false,
  staffOnly = false,
}: TimeOffManagementPanelProps) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? null;
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const timeOffQuery = useQuery({
    queryKey: ["timeoff-requests", companyId],
    enabled: Boolean(companyId) && !staffOnly,
    queryFn: () => fetchTimeOffRequests({ companyId: companyId!, limit: 50 }),
  });

  const timeOffRequests = (timeOffQuery.data ?? []) as unknown as TimeOffRequest[];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const loading = timeOffQuery.isLoading;

  const filteredTimeOffRequests = useMemo(() => {
    if (!normalizedSearch) return timeOffRequests;
    return timeOffRequests.filter((request) => {
      const parts = [
        request.user?.first_name,
        request.user?.last_name,
        request.type,
        request.reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return parts.includes(normalizedSearch);
    });
  }, [timeOffRequests, normalizedSearch]);

  const handleTimeOffAction = async (
    requestId: string,
    action: "approve" | "reject",
  ) => {
    if (!companyId) return;
    try {
      await updateTimeOffStatus({
        requestId,
        action,
        actorId: profile?.id,
      });
      await queryClient.invalidateQueries({
        queryKey: ["timeoff-requests", companyId],
      });
      toast({
        title: `Time off request ${action === "approve" ? "approved" : "denied"}`,
        description: "Employee has been notified",
      });
    } catch {
      toast({
        title: "Error processing request",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  if (staffOnly) {
    return (
      <TimeOffRequestPanel employeeId={profile?.id ?? null} />
    );
  }

  if (!companyId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Connect your company profile to manage time off requests.
        </CardContent>
      </Card>
    );
  }

  if (timeOffQuery.isError) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Unable to load time off requests right now. Please try again in a
          moment.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 w-1/4 rounded bg-muted" />
              <div className="h-20 rounded bg-muted" />
              <div className="h-20 rounded bg-muted" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingCount = filteredTimeOffRequests.filter(
    (request) => request.status === "requested",
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Review and approve team time off requests.
          </p>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="mt-2">
              {pendingCount} pending
            </Badge>
          )}
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {filteredTimeOffRequests.length > 0 ? (
        filteredTimeOffRequests.map((request) => (
          <Card key={request.id}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {getInitials(request.user)}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <div className="font-medium">
                      {getDisplayName(request.user)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(request.start_date), "MMM d")} -{" "}
                      {format(new Date(request.end_date), "MMM d, yyyy")}
                    </div>
                    <Badge variant="outline" className="mt-1 capitalize">
                      {request.type}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(request.status)}
                    <Badge
                      variant={
                        request.status === "approved"
                          ? "default"
                          : request.status === "denied"
                            ? "destructive"
                            : "secondary"
                      }
                      className="capitalize"
                    >
                      {request.status}
                    </Badge>
                  </div>

                  {canApprove && request.status === "requested" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          handleTimeOffAction(request.id, "approve")
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleTimeOffAction(request.id, "reject")
                        }
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {request.reason && (
                <div className="mt-3 rounded bg-muted/50 p-2 text-sm">
                  <strong>Reason:</strong> {request.reason}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-semibold">
              {normalizedSearch
                ? "No time off requests match your search"
                : "No time off requests"}
            </h3>
            <p className="text-muted-foreground">
              {normalizedSearch
                ? "Try adjusting your search keywords."
                : "All time off requests are processed."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
