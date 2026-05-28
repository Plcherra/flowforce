import { isFuture, isPast } from "date-fns";
import type { CompanyUpdate } from "@/types/companyUpdates";

export interface CompanyUpdateReadinessSummary {
  totalUpdates: number;
  publishedUpdates: number;
  draftUpdates: number;
  scheduledUpdates: number;
  highPriorityUpdates: number;
  unviewedUpdates: number;
  noEngagementUpdates: number;
  assignedAudienceUpdates: number;
  reviewItems: Array<{
    id: string;
    label: string;
    detail: string;
    severity: "critical" | "warning" | "info";
  }>;
}

function updateTitle(update: CompanyUpdate) {
  return update.title?.trim() || "Untitled update";
}

export function buildCompanyUpdateReadinessSummary(
  updates: CompanyUpdate[],
): CompanyUpdateReadinessSummary {
  const publishedUpdates = updates.filter(
    (update) => update.status === "published",
  );
  const draftUpdates = updates.filter((update) => update.status === "draft");
  const scheduledUpdates = updates.filter(
    (update) => update.status === "scheduled",
  );
  const highPriorityUpdates = updates.filter(
    (update) => update.priority === "high",
  );
  const unviewedUpdates = publishedUpdates.filter(
    (update) => !update.viewerHasViewed,
  );
  const noEngagementUpdates = publishedUpdates.filter(
    (update) => update.views === 0 && update.likes === 0 && update.comments === 0,
  );
  const assignedAudienceUpdates = updates.filter(
    (update) => update.assignedEmployees.length > 0 || Boolean(update.recipients),
  );
  const staleDrafts = draftUpdates.filter((update) =>
    isPast(new Date(update.updatedAt)),
  );
  const scheduledWithoutFutureDate = scheduledUpdates.filter(
    (update) =>
      !update.scheduledDate || !isFuture(new Date(update.scheduledDate)),
  );

  const reviewItems = [
    ...scheduledWithoutFutureDate.slice(0, 4).map((update) => ({
      id: `schedule-${update.id}`,
      label: "Scheduled update needs date",
      detail: updateTitle(update),
      severity: "critical" as const,
    })),
    ...staleDrafts.slice(0, 4).map((update) => ({
      id: `draft-${update.id}`,
      label: "Draft awaiting publish",
      detail: updateTitle(update),
      severity: "warning" as const,
    })),
    ...noEngagementUpdates.slice(0, 4).map((update) => ({
      id: `engagement-${update.id}`,
      label: "No engagement yet",
      detail: updateTitle(update),
      severity: "info" as const,
    })),
  ];

  return {
    totalUpdates: updates.length,
    publishedUpdates: publishedUpdates.length,
    draftUpdates: draftUpdates.length,
    scheduledUpdates: scheduledUpdates.length,
    highPriorityUpdates: highPriorityUpdates.length,
    unviewedUpdates: unviewedUpdates.length,
    noEngagementUpdates: noEngagementUpdates.length,
    assignedAudienceUpdates: assignedAudienceUpdates.length,
    reviewItems,
  };
}
