import { useTranslation } from "react-i18next";
import { Link } from "@/lib/router-adapter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CompanyUpdatesCard from "@/features/dashboard/components/CompanyUpdatesCard";
import { useMyShiftBoard } from "@/features/tasks/hooks/useMyShiftBoard";
import { useProfile } from "@/hooks/useProfile";
import { usePackFlags } from "@/hooks/usePackFlags";
import { isLeadershipLevel } from "@/features/scheduling/utils/leadershipLevel";
import { TodayRoleLists } from "@/features/dashboard/components/TodayRoleLists";
import { EmployeeOnboardingOverview } from "@/features/employee-onboarding/components/EmployeeOnboardingOverview";
import { overviewWidgets, type OverviewWidgetId } from "./overviewModel";
import { useListStatus, useTodayCoverage } from "./useRoleOverviewData";

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function RoleOverview() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { flags } = usePackFlags();
  const leadership = isLeadershipLevel({ name: profile?.role });
  const widgets = overviewWidgets({
    leadership,
    packs: { team: flags.team, insights: flags.insights, stock: flags.stock },
  });
  const { board } = useMyShiftBoard([]);
  const coverage = useTodayCoverage();
  const lists = useListStatus();

  return (
    <section
      className="space-y-4"
      data-testid="role-overview"
      data-leadership={leadership ? "true" : "false"}
    >
      <EmployeeOnboardingOverview />
      {widgets.map((widget) => (
        <OverviewWidget
          key={widget}
          widget={widget}
          board={board}
          coverage={coverage}
          lists={lists}
          t={t}
        />
      ))}
    </section>
  );
}

function OverviewWidget({
  widget,
  board,
  coverage,
  lists,
  t,
}: {
  widget: OverviewWidgetId;
  board: ReturnType<typeof useMyShiftBoard>["board"];
  coverage: ReturnType<typeof useTodayCoverage>;
  lists: ReturnType<typeof useListStatus>;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  if (widget === "companyUpdates") {
    return (
      <div data-testid="overview-company-updates">
        <CompanyUpdatesCard />
      </div>
    );
  }
  if (widget === "myShift") return <MyShiftCard board={board} t={t} />;
  if (widget === "myLists") return <MyListsCard board={board} t={t} />;
  if (widget === "coverage") return <CoverageCard coverage={coverage} t={t} />;
  return <ListStatusCard lists={lists} t={t} />;
}

function MyShiftCard({
  board,
  t,
}: {
  board: ReturnType<typeof useMyShiftBoard>["board"];
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  const ready = board.kind === "ready";
  const when = ready ? formatWhen(board.shiftStartsAt) : "";
  return (
    <Card data-testid="overview-my-shift">
      <CardHeader>
        <CardTitle>{t("dashboard.overview.myShiftTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {board.kind === "loading" ? <p>{t("dashboard.overview.myShiftLoading")}</p> : null}
        {board.kind === "error" ? <p>{t("dashboard.overview.myShiftError")}</p> : null}
        {board.kind === "empty" || board.kind === "unmapped" ? (
          <p>{t("dashboard.overview.myShiftEmpty")}</p>
        ) : null}
        {ready ? (
          <p>
            {when
              ? t("dashboard.overview.myShiftWhen", {
                  title: board.shiftTitle,
                  when,
                })
              : board.shiftTitle}
          </p>
        ) : null}
        <Link className="text-primary underline" to="/app/enhanced-scheduling">
          {t("dashboard.overview.myShiftOpen")}
        </Link>
      </CardContent>
    </Card>
  );
}

function MyListsCard({
  board,
  t,
}: {
  board: ReturnType<typeof useMyShiftBoard>["board"];
  t: (key: string) => string;
}) {
  const roleLists = board.kind === "ready" ? board.view.roleLists : [];
  return (
    <Card data-testid="overview-my-lists">
      <CardHeader>
        <CardTitle>{t("dashboard.overview.myListsTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {board.kind === "loading" ? <p>{t("dashboard.overview.myListsLoading")}</p> : null}
        {board.kind === "error" ? <p>{t("dashboard.overview.myListsError")}</p> : null}
        {board.kind !== "loading" && board.kind !== "error" && roleLists.length === 0 ? (
          <p>{t("dashboard.overview.myListsEmpty")}</p>
        ) : null}
        {roleLists.length > 0 ? <TodayRoleLists /> : null}
      </CardContent>
    </Card>
  );
}

function CoverageCard({
  coverage,
  t,
}: {
  coverage: ReturnType<typeof useTodayCoverage>;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <Card data-testid="overview-coverage">
      <CardHeader>
        <CardTitle>{t("dashboard.overview.coverageTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        {coverage.status === "loading" ? <p>{t("dashboard.overview.coverageLoading")}</p> : null}
        {coverage.status === "error" ? <p>{t("dashboard.overview.coverageError")}</p> : null}
        {coverage.status === "ready" && coverage.value.total === 0 ? (
          <p>{t("dashboard.overview.coverageEmpty")}</p>
        ) : null}
        {coverage.status === "ready" && coverage.value.total > 0 ? (
          <>
            <p>{t("dashboard.overview.coverageFilled", { count: coverage.value.filled })}</p>
            <p>{t("dashboard.overview.coverageOpen", { count: coverage.value.open })}</p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ListStatusCard({
  lists,
  t,
}: {
  lists: ReturnType<typeof useListStatus>;
  t: (key: string, options?: Record<string, unknown>) => string;
}) {
  return (
    <Card data-testid="overview-list-status">
      <CardHeader>
        <CardTitle>{t("dashboard.overview.listStatusTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {lists.status === "loading" ? <p>{t("dashboard.overview.listStatusLoading")}</p> : null}
        {lists.status === "error" ? <p>{t("dashboard.overview.listStatusError")}</p> : null}
        {lists.status === "ready" ? (
          <p>
            {t("dashboard.overview.listStatusBody", {
              overdue: lists.value.overdue,
              completed: lists.value.completed,
            })}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
