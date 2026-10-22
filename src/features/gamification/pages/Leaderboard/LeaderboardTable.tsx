import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { LeaderboardEntry } from "@/features/gamification/leaderboard/types";
import { useTranslation } from "react-i18next";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  loading: boolean;
}

export function LeaderboardTable({ entries, loading }: LeaderboardTableProps) {
  const { t } = useTranslation();
  if (loading && entries.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-2 h-3 w-64" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!loading && entries.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">{t("common.leaderboard")}</CardTitle>
          <CardDescription>{t("gamification.noXpDataAvailable")}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{t("gamification.syncXpDataFromSupabaseOrAssignYour")}</CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{t("common.leaderboard")}</CardTitle>
        <CardDescription>{t("gamification.topPerformersThisPeriod")}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("gamification.rank")}</TableHead>
              <TableHead>{t("schedule.employee")}</TableHead>
              <TableHead>{t("dashboard.profile.department")}</TableHead>
              <TableHead>{t("messages.role")}</TableHead>
              <TableHead className="text-right">{t("analytics.xp")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.employeeId}>
                <TableCell className="font-semibold">#{entry.rank}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={entry.avatarUrl ?? undefined}
                        alt={entry.fullName}
                      />
                      <AvatarFallback>
                        {entry.fullName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{entry.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.email}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{entry.department?.name ?? "—"}</TableCell>
                <TableCell>{entry.role}</TableCell>
                <TableCell className="text-right font-semibold">
                  {entry.xp.total.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default LeaderboardTable;
