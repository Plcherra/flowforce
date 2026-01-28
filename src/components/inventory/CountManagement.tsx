import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  Trash,
  Play,
} from "lucide-react";
import { useInventoryCounts } from "@/features/inventory/hooks/useInventoryCounts";
import { useToast } from "@/hooks/use-toast";

interface Count {
  id: string;
  count_type: string;
  count_date: string;
  count_period?: string | null;
  status: string;
  review_status: string;
  notes?: string;
  description?: string | null;
  created_at: string;
  submitted_at?: string | null;
  completed_at?: string | null;
  locations?: Array<{ id: string; name: string; location_type?: string }>;
}

interface CountManagementProps {
  onViewCount: (countId: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "approved":
      return "default";
    case "completed":
      return "default";
    case "awaiting_review":
      return "secondary";
    case "in_progress":
      return "secondary";
    case "planned":
      return "outline";
    default:
      return "outline";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "approved":
      return CheckCircle;
    case "completed":
      return CheckCircle;
    case "in_progress":
      return Clock;
    case "awaiting_review":
      return Clock;
    case "planned":
      return AlertCircle;
    default:
      return AlertCircle;
  }
};

const formatCountType = (type?: string | null) => {
  if (!type) return "Count";
  return type
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

const getPeriodLabel = (period?: string | null) => {
  switch (period) {
    case "day_start":
      return "Day Start";
    case "day_end":
      return "Day End";
    default:
      return "Custom";
  }
};

const REVIEW_STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  pending: { label: "Pending Review", variant: "outline" },
  under_review: { label: "Under Review", variant: "secondary" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Needs Revision", variant: "destructive" },
};

export function CountManagement({ onViewCount }: CountManagementProps) {
  const { counts, loading, deleteCount } = useInventoryCounts();
  const { toast } = useToast();

  const handleDelete = async (countId: string, countType: string) => {
    if (
      window.confirm(`Are you sure you want to delete the ${countType} count?`)
    ) {
      try {
        await deleteCount(countId);
        toast({
          title: "Success",
          description: "Count deleted successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete count",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return <div>Loading counts...</div>;
  }

  const groupedCounts = counts.reduce<
    Record<
      string,
      { date: string; day_start: Count[]; day_end: Count[]; other: Count[] }
    >
  >((acc, count) => {
    const dateKey = count.count_date || count.created_at;
    if (!acc[dateKey]) {
      acc[dateKey] = {
        date: dateKey,
        day_start: [],
        day_end: [],
        other: [],
      };
    }

    const bucket =
      count.count_period === "day_start"
        ? "day_start"
        : count.count_period === "day_end"
          ? "day_end"
          : "other";

    acc[dateKey][bucket].push(count);
    return acc;
  }, {});

  const sortedGroups = Object.values(groupedCounts).sort((a, b) => {
    const aDate = new Date(a.date).getTime();
    const bDate = new Date(b.date).getTime();
    return bDate - aDate;
  });

  return (
    <div className="space-y-4">
      {counts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No Counts Yet</h3>
            <p className="text-muted-foreground">
              Create your first inventory count to get started
            </p>
          </CardContent>
        </Card>
      ) : (
        sortedGroups.map((group) => {
          const formattedDate = new Date(group.date).toLocaleDateString(
            undefined,
            {
              weekday: "long",
              month: "short",
              day: "numeric",
            },
          );

          const sections: Array<{ title: string; counts: Count[] }> = [
            { title: "Day Start", counts: group.day_start },
            { title: "Day End", counts: group.day_end },
            { title: "Other Counts", counts: group.other },
          ].filter((section) => section.counts.length > 0);

          return (
            <div key={group.date} className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{formattedDate}</h3>
                <span className="text-sm text-muted-foreground">
                  {sections.reduce(
                    (total, section) => total + section.counts.length,
                    0,
                  )}{" "}
                  counts
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {sections.map((section) => (
                  <div key={section.title} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {section.title}
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        {section.counts.length}{" "}
                        {section.counts.length === 1 ? "count" : "counts"}
                      </span>
                    </div>

                    {section.counts.map((count) => {
                      const StatusIcon = getStatusIcon(count.status);
                      const reviewConfig =
                        REVIEW_STATUS_CONFIG[count.review_status] ||
                        REVIEW_STATUS_CONFIG.pending;

                      return (
                        <Card
                          key={count.id}
                          className="transition-all hover:shadow-md"
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">
                                    {formatCountType(count.count_type)}
                                  </h3>
                                  <Badge
                                    variant={getStatusColor(count.status)}
                                    className="flex items-center gap-1 capitalize"
                                  >
                                    <StatusIcon className="h-3 w-3" />
                                    {count.status.replace(/_/g, " ")}
                                  </Badge>
                                  <Badge
                                    variant={reviewConfig.variant}
                                    className="capitalize"
                                  >
                                    {reviewConfig.label}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Created{" "}
                                  {new Date(count.created_at).toLocaleString()}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => onViewCount(count.id)}
                                  className="flex items-center gap-2"
                                >
                                  <Play className="h-3 w-3" />
                                  Details
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleDelete(
                                      count.id,
                                      formatCountType(count.count_type),
                                    )
                                  }
                                  className="flex items-center gap-2"
                                >
                                  <Trash className="h-3 w-3" />
                                  Delete
                                </Button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 bg-muted/30 rounded-lg p-3 text-xs">
                              <div>
                                <div className="text-muted-foreground">
                                  Scheduled
                                </div>
                                <div className="font-medium">
                                  {new Date(
                                    count.count_date,
                                  ).toLocaleDateString()}{" "}
                                  • {getPeriodLabel(count.count_period)}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">
                                  Submitted
                                </div>
                                <div>
                                  {count.submitted_at
                                    ? new Date(
                                        count.submitted_at,
                                      ).toLocaleString()
                                    : "Not submitted"}
                                </div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">
                                  Completed
                                </div>
                                <div>
                                  {count.completed_at
                                    ? new Date(
                                        count.completed_at,
                                      ).toLocaleString()
                                    : "Not completed"}
                                </div>
                              </div>
                            </div>

                            {count.locations && count.locations.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {count.locations.map((location) => (
                                  <Badge key={location.id} variant="secondary">
                                    {location.name}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {count.description && (
                              <div className="text-sm">
                                <span className="font-medium">
                                  Description:{" "}
                                </span>
                                <span className="text-muted-foreground">
                                  {count.description}
                                </span>
                              </div>
                            )}

                            {count.notes && (
                              <div className="text-sm">
                                <span className="font-medium">Notes: </span>
                                <span className="text-muted-foreground">
                                  {count.notes}
                                </span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
