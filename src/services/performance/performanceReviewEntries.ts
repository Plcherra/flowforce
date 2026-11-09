import dayjs from "dayjs";
import type { PerformanceReviewRow } from "@/repositories/performanceRepository";
import {
  performanceReviewStatusSchema,
  type PerformanceReview,
  type PerformanceReviewStatus,
} from "./performanceTypes";

export function determineReviewStatus(
  reviewDate: string | null,
  score: number | null,
  referenceDate: dayjs.Dayjs = dayjs(),
): PerformanceReviewStatus {
  if (!reviewDate) {
    return performanceReviewStatusSchema.parse("due_soon");
  }

  const diff = referenceDate.diff(dayjs(reviewDate), "day");
  if (diff > 180) {
    return performanceReviewStatusSchema.parse("overdue");
  }
  if (diff > 90) {
    return performanceReviewStatusSchema.parse("due_soon");
  }

  if ((score ?? 3) <= 2) {
    return performanceReviewStatusSchema.parse("needs_coaching");
  }

  return performanceReviewStatusSchema.parse("on_track");
}

function reviewRowSortDate(row: PerformanceReviewRow) {
  return row.review_date ?? row.created_at ?? null;
}

export function buildReviewEntries(
  rows: PerformanceReviewRow[],
): PerformanceReview[] {
  return rows
    .sort(
      (a, b) =>
        dayjs(reviewRowSortDate(b)).valueOf() -
        dayjs(reviewRowSortDate(a)).valueOf(),
    )
    .map((row) => {
      const reviewDate = reviewRowSortDate(row);
      const status = determineReviewStatus(reviewDate, row.score ?? null);
      return {
        id: row.id,
        goalId: row.goal_id ?? null,
        date: reviewDate,
        score: row.score ?? null,
        summary: row.summary ?? null,
        reviewerId: row.reviewerid,
        status,
        aiSummary: row.ai_summary ?? null,
        aiInsightId: row.ai_insightid ?? null,
        actionItems: (row.action_items ??
          []) as PerformanceReview["actionItems"],
        reviewCycle: row.review_cycle ?? null,
      };
    });
}
