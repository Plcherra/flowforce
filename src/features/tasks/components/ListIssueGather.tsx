import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useCan } from "@/hooks/useCan";
import { useCompanyRoles } from "@/hooks/useCompanyRoles";
import { useProfile } from "@/hooks/useProfile";
import { resolveProductLevel } from "@/features/roles/constants/productLevels";
import {
  canActOnListIssue,
  canSeeListIssueGather,
  gatheredListIssues,
  listIssueGrant,
} from "@/features/tasks/utils/listIssueGather";

const KIND_KEYS: Record<string, string> = {
  missed_form: "tasks.listNotDone",
  missing_required: "tasks.requiredMissing",
  flagged_item: "tasks.flaggedItem",
};

export function ListIssueGather({
  tasks,
  onMarkDone,
}: {
  tasks: Array<{
    id: string;
    title?: string | null;
    status?: string | null;
    source?: string | null;
    links?: unknown;
  }>;
  onMarkDone: (taskId: string) => void;
}) {
  const { t } = useTranslation();
  const { can, isLoading } = useCan();
  const { profile } = useProfile();
  const { roles } = useCompanyRoles();
  const role = (Array.isArray(roles) ? roles : []).find(
    (item) => item.id === profile?.role_id,
  );
  const isOwner =
    profile?.role === "owner" ||
    (role ? resolveProductLevel(role) === "owner" : false);
  const grant = listIssueGrant({
    isOwner,
    read: can("tasks.list_issues.read"),
    act: can("tasks.list_issues.act"),
  });

  if (isLoading || !canSeeListIssueGather(grant)) return null;
  const issues = gatheredListIssues(tasks);
  if (issues.length === 0) return null;
  const canAct = canActOnListIssue(grant);

  return (
    <section className="space-y-2" data-testid="list-issue-gather">
      <h2 className="text-sm font-semibold">{t("tasks.listIssues")}</h2>
      <ul className="divide-y rounded-md border">
        {issues.map((issue) => {
          const kind =
            issue.links && typeof issue.links === "object"
              ? (issue.links as { list_issue_kind?: string }).list_issue_kind
              : null;
          const finished = issue.status === "done" || issue.status === "completed";
          return (
            <li
              key={issue.id}
              className="flex flex-col gap-2 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="min-w-0">
                <span className="text-muted-foreground">
                  {t(KIND_KEYS[kind ?? ""] ?? "tasks.listIssue")}
                  {" · "}
                </span>
                {issue.title || t("tasks.checklistTask")}
              </span>
              {canAct && !finished ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="min-h-11 shrink-0"
                  data-testid={`list-issue-done-${issue.id}`}
                  onClick={() => onMarkDone(issue.id)}
                >
                  {t("tasks.markDone")}
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
