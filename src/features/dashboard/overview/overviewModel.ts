import { readFormDistribution } from "@/features/forms/utils/formDistribution";

export const OVERVIEW_WIDGETS = [
  "myShift",
  "myLists",
  "companyUpdates",
  "coverage",
  "listStatus",
  "hrReadiness",
] as const;

export type OverviewWidgetId = (typeof OVERVIEW_WIDGETS)[number];

export type OverviewPacks = {
  team: boolean;
  insights: boolean;
  stock: boolean;
};

const LEADERSHIP_WIDGETS = new Set<OverviewWidgetId>(["coverage", "listStatus"]);

export function overviewWidgets(input: {
  leadership: boolean;
  packs?: OverviewPacks;
}): OverviewWidgetId[] {
  const packs = input.packs ?? { team: false, insights: false, stock: false };
  const widgets: OverviewWidgetId[] = ["myShift", "myLists", "companyUpdates"];
  if (input.leadership) {
    widgets.push("coverage", "listStatus");
  }
  // Pack cards belong here. A turned-off pack cannot add a card.
  const packWidgets: Record<keyof OverviewPacks, readonly OverviewWidgetId[]> = {
    team: [],
    insights: ["hrReadiness"],
    stock: [],
  };
  for (const pack of ["team", "insights", "stock"] as const) {
    if (packs[pack]) widgets.push(...packWidgets[pack]);
  }
  return widgets.filter((widget) => input.leadership || !LEADERSHIP_WIDGETS.has(widget));
}

export type CoverageShift = {
  user_id: string | null;
  is_published: boolean | null;
  is_template: boolean | null;
};

export function coverageSummary(shifts: readonly CoverageShift[]) {
  const live = shifts.filter(
    (shift) => shift.is_published === true && shift.is_template !== true,
  );
  const open = live.filter((shift) => !shift.user_id).length;
  return { filled: live.length - open, open, total: live.length };
}

export type ListStatusForm = {
  id: string;
  settings?: unknown;
  status?: string | null;
};

export type ListStatusSubmission = {
  form_id: string | null;
  submitted_at: string | null;
};

function sameLocalDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function rollupLists(input: {
  now: Date;
  forms: readonly ListStatusForm[];
  submissions: readonly ListStatusSubmission[];
}): { overdue: number; completed: number } {
  const completedIds = new Set<string>();
  for (const submission of input.submissions) {
    if (!submission.form_id || !submission.submitted_at) continue;
    const submitted = new Date(submission.submitted_at);
    if (Number.isNaN(submitted.getTime())) continue;
    if (sameLocalDay(submitted, input.now)) completedIds.add(submission.form_id);
  }

  let overdue = 0;
  let completed = 0;
  for (const form of input.forms) {
    if (form.status === "archived" || form.status === "draft") continue;
    const distribution = readFormDistribution(form.settings);
    if (distribution.recordKind !== "list") continue;
    if (completedIds.has(form.id)) {
      completed += 1;
      continue;
    }
    if (!distribution.dueAt) continue;
    const due = new Date(distribution.dueAt);
    if (Number.isNaN(due.getTime())) continue;
    if (sameLocalDay(due, input.now) && due.getTime() < input.now.getTime()) {
      overdue += 1;
    }
  }
  return { overdue, completed };
}
