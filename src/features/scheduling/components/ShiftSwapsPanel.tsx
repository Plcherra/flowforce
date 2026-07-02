import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  ArrowRightLeft,
  Clock,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Plus,
} from "lucide-react";
import { ShiftSwap } from "@/types/scheduling-unified";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useProfile } from "@/hooks/useProfile";
import {
  fetchShiftSwaps,
  updateShiftSwapStatus,
} from "@/features/scheduling/repositories/shiftSwapsRepository";

interface ShiftSwapsPanelProps {
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

function getSwapTypeIcon(type: string) {
  switch (type) {
    case "swap":
      return <ArrowRightLeft className="h-4 w-4 text-blue-500" />;
    case "claim":
      return <Plus className="h-4 w-4 text-green-500" />;
    case "give_away":
      return <Users className="h-4 w-4 text-orange-500" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "approved":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "rejected":
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  }
}

export function ShiftSwapsPanel({
  canApprove = false,
  staffOnly = false,
}: ShiftSwapsPanelProps) {
  const { toast } = useToast();
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? null;
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const shiftSwapsQuery = useQuery({
    queryKey: ["shift-swaps", companyId],
    enabled: Boolean(companyId),
    queryFn: () => fetchShiftSwaps({ companyId: companyId!, limit: 50 }),
  });

  const shiftSwaps = (shiftSwapsQuery.data ?? []) as unknown as ShiftSwap[];
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const loading = shiftSwapsQuery.isLoading;

  const scopedSwaps = useMemo(() => {
    if (!staffOnly || !profile?.id) return shiftSwaps;
    return shiftSwaps.filter(
      (swap) =>
        swap.requestinguser_id === profile.id ||
        swap.targetuser_id === profile.id,
    );
  }, [shiftSwaps, staffOnly, profile?.id]);

  const filteredShiftSwaps = useMemo(() => {
    if (!normalizedSearch) return scopedSwaps;
    return scopedSwaps.filter((swap) => {
      const parts = [
        swap.requestinguser?.first_name,
        swap.requestinguser?.last_name,
        swap.targetuser?.first_name,
        swap.targetuser?.last_name,
        swap.schedule?.title,
        swap.reason,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return parts.includes(normalizedSearch);
    });
  }, [scopedSwaps, normalizedSearch]);

  const handleSwapAction = async (
    swapId: string,
    action: "approve" | "reject",
  ) => {
    if (!companyId) return;
    try {
      await updateShiftSwapStatus({
        swapId,
        status: action === "approve" ? "approved" : "rejected",
        actorId: profile?.id,
      });
      await queryClient.invalidateQueries({
        queryKey: ["shift-swaps", companyId],
      });
      toast({
        title: `Shift swap ${action}d`,
        description: "Staff have been notified of the decision",
      });
    } catch {
      toast({
        title: "Error processing request",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  if (!companyId) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Connect your company profile to view shift swap requests.
        </CardContent>
      </Card>
    );
  }

  if (shiftSwapsQuery.isError) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          Unable to load shift swaps right now. Please try again in a moment.
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

  const pendingCount = filteredShiftSwaps.filter(
    (swap) => swap.status === "pending",
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {staffOnly
              ? "Your shift swap requests and offers."
              : "Review and approve team shift swap requests."}
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
            placeholder="Search swaps..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {filteredShiftSwaps.length > 0 ? (
        filteredShiftSwaps.map((swap) => (
          <Card key={swap.id}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getSwapTypeIcon(swap.swap_type)}
                    <Badge variant="outline" className="capitalize">
                      {swap.swap_type.replace("_", " ")}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {getInitials(swap.requestinguser)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">
                      {getDisplayName(swap.requestinguser)}
                    </span>

                    {swap.targetuser && (
                      <>
                        <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {getInitials(swap.targetuser)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {getDisplayName(swap.targetuser)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="text-right text-sm">
                    <div className="font-medium">
                      {swap.schedule?.title || "Shift details"}
                    </div>
                    <div className="text-muted-foreground">
                      {swap.schedule?.start_time
                        ? `${format(new Date(swap.schedule.start_time), "MMM d, HH:mm")} - ${format(
                            new Date(swap.schedule.end_time),
                            "HH:mm",
                          )}`
                        : "Timing to be confirmed"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusIcon(swap.status)}
                    <Badge
                      variant={
                        swap.status === "approved"
                          ? "default"
                          : swap.status === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                      className="capitalize"
                    >
                      {swap.status}
                    </Badge>
                  </div>

                  {canApprove && swap.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSwapAction(swap.id, "approve")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSwapAction(swap.id, "reject")}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {swap.reason && (
                <div className="mt-3 rounded bg-muted/50 p-2 text-sm">
                  <strong>Reason:</strong> {swap.reason}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <ArrowRightLeft className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-2 text-lg font-semibold">
              {normalizedSearch
                ? "No shift swaps match your search"
                : staffOnly
                  ? "No shift swap requests"
                  : "No shift swap requests"}
            </h3>
            <p className="text-muted-foreground">
              {normalizedSearch
                ? "Try a different name or keyword."
                : staffOnly
                  ? "When you request a swap it will appear here."
                  : "All shift swap requests are up to date."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
