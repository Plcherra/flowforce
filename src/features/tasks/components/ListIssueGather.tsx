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

const KIND_LABELS: Record<string, string> = {
  missed_form: "List not done",
  missing_required: "Required item missing",
  flagged_item: "Flagged item",
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
      <h2 className="text-sm font-semibold">List issues</h2>
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
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span>
                <span className="text-muted-foreground">
                  {KIND_LABELS[kind ?? ""] ?? "List issue"}
                  {" · "}
                </span>
                {issue.title || "Checklist task"}
              </span>
              {canAct && !finished ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid={`list-issue-done-${issue.id}`}
                  onClick={() => onMarkDone(issue.id)}
                >
                  Mark done
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
