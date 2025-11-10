import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Award,
  BarChart3,
  RefreshCcw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLeaderboardData } from '@/features/leaderboard/useLeaderboardData';
import type { LeaderboardBadgeTier, LeaderboardPeriod } from '@/features/leaderboard/types';
import { cn } from '@/lib/utils';
import {
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  BarChart,
} from 'recharts';
import { Link } from 'react-router-dom';

dayjs.extend(relativeTime);

const periodOptions: { label: string; value: LeaderboardPeriod }[] = [
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'All-Time', value: 'all_time' },
];

const periodDescriptions: Record<LeaderboardPeriod, string> = {
  weekly: 'Performance from the current week',
  monthly: 'Momentum across the current month',
  all_time: 'Lifetime performance and achievements',
};

function formatDepartmentName(name: string | null | undefined) {
  if (!name || name.trim().length === 0) return 'Unnamed department';
  return name;
}

const badgeColors: Record<LeaderboardBadgeTier, string> = {
  Bronze: 'bg-amber-900/10 text-amber-900 border-amber-900/30',
  Silver: 'bg-slate-200 text-slate-700 border-slate-300',
  Gold: 'bg-amber-400/20 text-amber-700 border-amber-500/30',
  Platinum: 'bg-indigo-100 text-indigo-700 border-indigo-300',
};

export default function Leaderboard() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('monthly');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const { entries, analytics, departments, roles, challenges, loading, syncing, error, lastUpdated, refresh } =
    useLeaderboardData(period);
  const handleManualRefresh = () => {
    void refresh({ forceSync: true });
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const departmentMatches =
        departmentFilter === 'all' ||
        (departmentFilter === 'none' && !entry.department?.id) ||
        entry.department?.id === departmentFilter;
      const roleMatches = roleFilter === 'all' || entry.role === roleFilter;
      return departmentMatches && roleMatches;
    });
  }, [entries, departmentFilter, roleFilter]);

  const xpSourceData = useMemo(
    () => [
      { name: 'Tasks', value: analytics.xpBySource.tasks },
      { name: 'Goals', value: analytics.xpBySource.goals },
      { name: 'Recognitions', value: analytics.xpBySource.recognitions },
      { name: 'Training', value: analytics.xpBySource.training },
    ],
    [analytics.xpBySource],
  );

  const badgeDistribution = useMemo(() => {
    const total = analytics.participantCount || 1;
    return Object.entries(analytics.badgeTierDistribution).map(([tier, count]) => ({
      tier,
      count,
      percent: Math.round((count / total) * 100),
    }));
  }, [analytics.badgeTierDistribution, analytics.participantCount]);

  const lastUpdatedLabel = lastUpdated ? dayjs(lastUpdated).fromNow() : 'not synced';

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gamification Leaderboard</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Track XP, badges, and achievements across Tasks, Goals, Recognitions, and Training. Filters keep the
            analytics focused on what matters for your team.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="text-xs">
            Updated {lastUpdatedLabel}
          </Badge>
          <Button type="button" variant="outline" onClick={handleManualRefresh} disabled={loading || syncing}>
            <RefreshCcw className={cn('mr-2 h-4 w-4', syncing ? 'animate-spin' : '')} />
            Refresh
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <ToggleGroup
              type="single"
              value={period}
              onValueChange={(value) => {
                if (value) setPeriod(value as LeaderboardPeriod);
              }}
            >
              {periodOptions.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value} className="text-xs font-medium uppercase">
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <span className="text-sm text-muted-foreground">{periodDescriptions[period]}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                <SelectItem value="none">No department</SelectItem>
                {departments
                  .filter((department) => department.id)
                  .map((department) => (
                    <SelectItem key={department.id} value={department.id!}>
                      {formatDepartmentName(department.name)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {roles.map(({ role }) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : entries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <Sparkles className="h-10 w-10 text-primary" />
            <div>
              <CardTitle className="text-2xl">No leaderboard data yet</CardTitle>
              <CardDescription className="mt-2 text-base">
                Sync recent activity or assign your first task to start tracking XP, badges, and Copilot insights.
              </CardDescription>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
              <Button onClick={handleManualRefresh} disabled={syncing}>
                <RefreshCcw className={cn('mr-2 h-4 w-4', syncing ? 'animate-spin' : '')} />
                Sync leaderboard
              </Button>
              <Button variant="outline" asChild>
                <Link to="/app/tasks">Assign your first task</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card>
                <CardHeader className="space-y-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Participants
                    </CardTitle>
                  </div>
                  <CardDescription>{analytics.participantCount} active profiles tracked</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{filteredEntries.length}</div>
                  <p className="text-sm text-muted-foreground">Avg. XP {analytics.averageXp}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Top Department
                    </CardTitle>
                  </div>
                  <CardDescription>XP leaders driven by team focus</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">
                    {analytics.topDepartment?.name ? formatDepartmentName(analytics.topDepartment.name) : 'No department'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.topDepartment?.participantCount ?? 0} participants · {analytics.topDepartment?.totalXp ?? 0}{' '}
                    XP
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Badge Distribution
                    </CardTitle>
                  </div>
                  <CardDescription>Tier progress for this period</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {badgeDistribution.map(({ tier, count, percent }) => (
                    <div key={tier}>
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span>{tier}</span>
                        <span>
                          {count} · {percent}%
                        </span>
                      </div>
                      <Progress value={percent} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Copilot Challenges
                    </CardTitle>
                  </div>
                  <CardDescription>Automated rewards queued</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{challenges.length}</div>
                  <p className="text-sm text-muted-foreground">Ready for manager review</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      XP By Source
                    </CardTitle>
                    <CardDescription>Contribution mix across modules</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={xpSourceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                    <YAxis stroke="#888888" fontSize={12} />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                      formatter={(value: number) => [`${value} XP`, 'XP']}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Leaderboard
                  </CardTitle>
                  <CardDescription>Top performers by XP, filtered for your selections</CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {filteredEntries.length} of {analytics.participantCount} participants
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[520px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-xs uppercase tracking-wide">Rank</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide">Employee</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide">XP</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide">Badges</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide">Achievements</TableHead>
                        <TableHead className="text-xs uppercase tracking-wide">Insights</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEntries.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                            No participants match the selected filters yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEntries.map((entry) => (
                          <TableRow key={`${entry.period}-${entry.employeeId}`}>
                            <TableCell className="font-semibold">#{entry.rank}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarImage src={entry.avatarUrl ?? undefined} alt={entry.fullName} />
                                  <AvatarFallback>
                                    {entry.fullName
                                      .split(' ')
                                      .map((part) => part[0])
                                      .join('')
                                      .slice(0, 2)
                                      .toUpperCase() || entry.email[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{entry.fullName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {entry.role} · {entry.department?.name ?? 'No department'}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold">{entry.xp.total} XP</span>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      'border px-2 py-0 text-[10px] uppercase tracking-wide',
                                      badgeColors[entry.badgeTier] ?? '',
                                    )}
                                  >
                                    {entry.badgeTier}
                                  </Badge>
                                </div>
                                <div className="grid grid-cols-4 gap-1 text-[10px] text-muted-foreground">
                                  <span>Tasks {entry.xp.tasks}</span>
                                  <span>Goals {entry.xp.goals}</span>
                                  <span>Rec {entry.xp.recognitions}</span>
                                  <span>Training {entry.xp.training}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {entry.badges.slice(0, 4).map((badge) => (
                                  <Badge key={badge} variant="secondary" className="text-[10px]">
                                    {badge}
                                  </Badge>
                                ))}
                                {entry.badges.length === 0 && (
                                  <span className="text-xs text-muted-foreground">No badges yet</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {entry.achievements.length > 0 ? (
                                  entry.achievements.map((achievement) => (
                                    <Badge key={achievement.code} variant="outline" className="text-[10px]">
                                      {achievement.label}
                                      {achievement.value ? ` · ${achievement.value}` : ''}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {entry.insights.length > 0 ? (
                                  entry.insights.map((insight, index) => (
                                    <div key={`${entry.employeeId}-insight-${index}`} className="text-xs text-muted-foreground">
                                      {insight.message}
                                    </div>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Copilot Challenges
                </CardTitle>
                <CardDescription>
                  Automated challenges and rewards triggered from Copilot insights for monthly leaders.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {challenges.length === 0 ? (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                    No Copilot challenges queued right now. Keep momentum across tasks, goals, recognitions, and training
                    to unlock new automations.
                  </div>
                ) : (
                  challenges.map((challenge, index) => (
                    <div key={`${challenge.employeeId}-${challenge.focus}-${index}`} className="rounded-md border p-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="uppercase tracking-wide">{challenge.focus}</span>
                        <span>{Math.round(challenge.confidence * 100)}% confidence</span>
                      </div>
                      <div className="mt-1 text-sm font-semibold">{challenge.title}</div>
                      <p className="mt-1 text-xs text-muted-foreground">{challenge.description}</p>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="font-medium text-primary">{challenge.reward}</span>
                        <span className="text-muted-foreground">
                          {challenge.period === 'monthly' ? 'Monthly' : 'Weekly'} ·{' '}
                          {challenge.periodStart ? dayjs(challenge.periodStart).format('MMM D') : 'ongoing'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Leaderboard Highlights
                </CardTitle>
                <CardDescription>Quick wins to surface across Performance and Recognition dashboards.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredEntries.slice(0, 3).map((entry) => (
                  <div key={`highlight-${entry.employeeId}`} className="rounded-md border p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{entry.role}</span>
                      <span>{entry.xp.total} XP</span>
                    </div>
                    <div className="mt-1 text-sm font-semibold">{entry.fullName}</div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {entry.achievements.slice(0, 3).map((achievement) => (
                        <Badge key={achievement.code} variant="outline" className="text-[10px] uppercase">
                          {achievement.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
                {filteredEntries.length === 0 && (
                  <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
                    Filtered view has no highlights yet—adjust filters to see who's leading your organisation.
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}
