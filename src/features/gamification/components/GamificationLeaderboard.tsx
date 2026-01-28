import { Trophy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

export interface LeaderboardDisplayEntry {
  id: string;
  name: string;
  avatarUrl?: string | null;
  email?: string;
  xp: number;
  goalsCompleted: number;
  department?: string | null;
  role?: string | null;
  rank?: number;
}

interface GamificationLeaderboardProps {
  entries: LeaderboardDisplayEntry[];
  loading?: boolean;
  className?: string;
  title?: string;
  description?: string;
  emptyMessage?: string;
}

const rankBadges: Record<number, { label: string; className: string }> = {
  1: { label: "Gold", className: "border-amber-400 text-amber-700" },
  2: { label: "Silver", className: "border-slate-300 text-slate-600" },
  3: { label: "Bronze", className: "border-orange-400 text-orange-700" },
};

function getInitials(name?: string, email?: string) {
  if (!name && !email) return "?";
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }
  return email?.slice(0, 2).toUpperCase() ?? "?";
}

export function GamificationLeaderboard({
  entries,
  loading,
  className,
  title = "Top XP Leaders",
  description = "Ranked by XP and goals completed during the selected period.",
  emptyMessage = "No leaderboard entries. Sync activity or assign tasks to generate rankings.",
}: GamificationLeaderboardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {entries.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Rank</TableHead>
                  <TableHead>Team Member</TableHead>
                  <TableHead className="text-right">XP</TableHead>
                  <TableHead className="text-right">Goals (month)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry, index) => {
                  const rank = entry.rank ?? index + 1;
                  const badgeMeta = rankBadges[rank];
                  return (
                    <TableRow
                      key={entry.id}
                      className={cn(
                        "transition hover:bg-muted/40",
                        badgeMeta ? "bg-muted/30" : undefined,
                      )}
                    >
                      <TableCell className="font-semibold">
                        #{rank}
                        {badgeMeta ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "ml-2 text-[10px] uppercase tracking-wide",
                              badgeMeta.className,
                            )}
                          >
                            {badgeMeta.label}
                          </Badge>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar
                            className={cn(
                              "h-9 w-9 border",
                              badgeMeta?.className,
                            )}
                          >
                            <AvatarImage
                              src={entry.avatarUrl ?? undefined}
                              alt={entry.name}
                              loading="lazy"
                            />
                            <AvatarFallback>
                              {getInitials(entry.name, entry.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="max-w-[200px]">
                            <p className="font-medium leading-tight text-foreground">
                              {entry.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {entry.role ?? "Team member"}
                              {entry.department ? ` · ${entry.department}` : ""}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {entry.xp.toLocaleString()} XP
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {entry.goalsCompleted}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
