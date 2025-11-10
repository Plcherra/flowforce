import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { RefreshCw, Target, BarChart3, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { usePerformanceOverview } from '@/hooks/usePerformanceOverview';
import { useRecognitions } from '@/hooks/useRecognitions';
import { recognitionSourceMeta } from '@/lib/recognitionMeta';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { useLeaderboardInsightsStore } from '@/stores/useLeaderboardInsights';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';
import { syncCopilotReviewAutomation } from '@/services/performance/performanceAutomation';
import { useLeaderboardData } from '@/features/leaderboard/useLeaderboardData';
import type { LeaderboardPeriod } from '@/features/leaderboard/types';

interface MetricTileProps {
  label: string;
  value: ReactNode;
}

type PerformanceTab = 'overview' | 'goals' | 'reviews';

function isPerformanceTab(value: string): value is PerformanceTab {
  return value === 'overview' || value === 'goals' || value === 'reviews';
}

function MetricTile({ label, value }: MetricTileProps) {
  return (
    <div className="text-center p-4 border rounded-lg">
      <div className="text-2xl font-bold text-blue-600">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

interface SectionSkeletonProps {
  count?: number;
  withAvatar?: boolean;
}

function SectionSkeleton({ count = 3, withAvatar = false }: SectionSkeletonProps) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-3">
            {withAvatar && <Skeleton className="h-10 w-10 rounded-full" />}
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      ))}
    </div>
  );
}

function EmployeeCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-lg border p-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-6 w-16" />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, metricIndex) => (
              <div key={metricIndex} className="space-y-2 rounded-md border p-3">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-5 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(value: string | null, fallback = 'No date available') {
  if (!value) return fallback;
  const parsed = dayjs(value);
  if (!parsed.isValid()) return fallback;
  return parsed.format('MMM D, YYYY');
}

function clampPercentage(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toTitleCase(value: string) {
  return value
    .replace(/[_-]/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const normalized = status.toLowerCase();
  if (normalized === 'completed') return 'default';
  if (['active', 'in progress', 'in_progress', 'ongoing'].includes(normalized)) return 'secondary';
  if (['blocked', 'cancelled', 'at risk', 'at_risk'].includes(normalized)) return 'destructive';
  return 'outline';
}

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return 'NA';
  const pieces = trimmed.split(' ').filter(Boolean);
  if (pieces.length === 1) {
    return pieces[0].slice(0, 2).toUpperCase();
  }
  return `${pieces[0][0]}${pieces[pieces.length - 1][0]}`.toUpperCase();
}

function reviewScoreVariant(score: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (score >= 4) return 'default';
  if (score === 3) return 'secondary';
  if (score <= 2) return 'destructive';
  return 'outline';
}

const leaderboardTierBadge: Record<string, string> = {
  Bronze: 'bg-amber-900/15 text-amber-900 border-amber-900/40',
  Silver: 'bg-slate-200 text-slate-700 border-slate-300',
  Gold: 'bg-amber-400/20 text-amber-700 border-amber-500/30',
  Platinum: 'bg-indigo-100 text-indigo-700 border-indigo-300',
};

export default function Performance() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const { employees, goals, reviews, goalReviews = [], loading, error, refetch } = usePerformanceOverview();
  const { recognitions, loading: recognitionLoading, error: recognitionError, refresh: refreshRecognitions } = useRecognitions();
  const leaderboardPeriod: LeaderboardPeriod = 'monthly';
  const {
    loading: leaderboardLoading,
    error: leaderboardError,
    refresh: refreshLeaderboard,
  } = useLeaderboardData(leaderboardPeriod);
  const [activeTab, setActiveTab] = useState<PerformanceTab>('overview');
  const goalsTabRef = useRef<HTMLButtonElement | null>(null);
  const handleTabChange = useCallback((value: string) => {
    if (isPerformanceTab(value)) {
      setActiveTab(value);
    }
  }, []);
  const handleSelectGoalsTab = useCallback(() => {
    setActiveTab('goals');
    goalsTabRef.current?.focus();
  }, []);
  const handleRetryLeaderboard = useCallback(() => {
    refreshLeaderboard?.();
  }, [refreshLeaderboard]);
  const handleRetryRecognitions = useCallback(() => {
    refreshRecognitions?.();
  }, [refreshRecognitions]);
  const handleRefetchPerformance = useCallback(() => {
    refetch?.();
  }, [refetch]);
  const recentReviews = reviews.slice(0, 20);
  const unifiedReviews = goalReviews.slice(0, 10);
  const topRecognitions = useMemo(() => recognitions.slice(0, 5), [recognitions]);
  const { insights: leaderboardInsights, lastUpdated: leaderboardSyncedAt } = useLeaderboardInsightsStore((state) => ({
    insights: state.insights,
    lastUpdated: state.lastUpdated,
  }));
  const leaderboardUpdatedLabel = leaderboardSyncedAt
    ? formatDistanceToNow(new Date(leaderboardSyncedAt), { addSuffix: true })
    : null;
  const leaderboardEntries = useMemo(
    () =>
      leaderboardInsights.map((insight) => (
        <div key={insight.employeeId} className="rounded-md border p-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{insight.name}</span>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  {toTitleCase(insight.role)}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn('text-[10px] uppercase tracking-wide', leaderboardTierBadge[insight.badgeTier] ?? '')}
                >
                  {insight.badgeTier}
                </Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {insight.achievements.length > 0 ? (
                  insight.achievements.map((achievement) => (
                    <Badge key={`${insight.employeeId}-${achievement}`} variant="secondary" className="text-[10px]">
                      {achievement}
                    </Badge>
                  ))
                ) : (
                  <span>No recent achievements tracked</span>
                )}
              </div>
            </div>
            <div className="text-left md:text-right">
              <div className="text-sm font-semibold">{insight.xp} XP</div>
              <div className="text-xs text-muted-foreground">{insight.recognitionCount} recognitions</div>
            </div>
          </div>
        </div>
      )),
    [leaderboardInsights],
  );
  const recognitionEntries = useMemo(
    () =>
      topRecognitions.map((recognition) => {
        const details = recognition.reward_details;
        const source = details?.source ?? 'manual';
        const meta = recognitionSourceMeta[source] ?? recognitionSourceMeta.manual;
        const Icon = meta.icon;
        const recipientName = recognition.recipient
          ? `${recognition.recipient.first_name ?? ''} ${recognition.recipient.last_name ?? ''}`.trim()
          : 'Team Member';
        const awardedDistance = recognition.awarded_at
          ? formatDistanceToNow(new Date(recognition.awarded_at), { addSuffix: true })
          : 'just now';

        return (
          <div key={recognition.id} className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <div className={cn('rounded-full p-2 bg-muted', meta.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{recipientName}</span>
                  <Badge variant="outline" className={meta.badgeColor}>
                    {meta.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{awardedDistance}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{details?.message ?? 'Great work acknowledged by the team.'}</p>
              </div>
            </div>
            {details?.xp_awarded ? (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 border-amber-200">
                +{details.xp_awarded} XP
              </Badge>
            ) : null}
          </div>
        );
      }),
    [topRecognitions],
  );

  const automationMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error('Sign in to run Co-Pilot automations.');
      }
      if (!profile?.companyId) {
        throw new Error('Assign a company before running automations.');
      }
      return syncCopilotReviewAutomation({
        actorId: user.id,
        companyId: profile.companyId,
      });
    },
    onSuccess: (result) => {
      const taskCount = result.createdTasks.length;
      const reminderCount = result.createdReminders.length;
      const total = taskCount + reminderCount;
      toast({
        title: 'Co-Pilot automation complete',
        description:
          total > 0
            ? `Queued ${taskCount} task${taskCount === 1 ? '' : 's'} and ${reminderCount} reminder${reminderCount === 1 ? '' : 's'}.`
            : 'No new automations were needed.',
      });
      refetch();
    },
    onError: (automationError) => {
      toast({
        title: 'Unable to run automation',
        description:
          automationError instanceof Error ? automationError.message : 'Please try again later.',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Performance Management</h1>
          <p className="text-muted-foreground mt-1">
            Track employee achievements, stay current on goals, and review feedback in one place.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => automationMutation.mutate()}
            disabled={automationMutation.isPending}
          >
            {automationMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Run Co-Pilot Sync
          </Button>
          <Button
            type="button"
            onClick={handleSelectGoalsTab}
            aria-controls="performance-tab-goals"
            aria-pressed={activeTab === 'goals'}
          >
            <Target className="mr-2 h-4 w-4" />
            Set Goals
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" role="status" aria-live="polite">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <AlertTitle>Unable to load performance data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </div>
            <Button size="sm" variant="outline" onClick={handleRefetchPerformance}>
              Retry data load
            </Button>
          </div>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="goals" ref={goalsTabRef}>
            Goals & Objectives
          </TabsTrigger>
          <TabsTrigger value="reviews">Performance Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Leaderboard Insights
                </CardTitle>
                <CardDescription>Highlights synced from the gamification leaderboard for rapid coaching.</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {leaderboardInsights.length > 0
                  ? `Updated ${leaderboardUpdatedLabel ?? 'just now'}`
                  : 'Awaiting sync'}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {leaderboardLoading ? (
                <SectionSkeleton count={3} />
              ) : leaderboardError ? (
                <Alert variant="destructive" role="status" aria-live="polite">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <AlertTitle>Unable to load leaderboard insights</AlertTitle>
                      <AlertDescription>{leaderboardError}</AlertDescription>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleRetryLeaderboard}>
                      Retry leaderboard sync
                    </Button>
                  </div>
                </Alert>
              ) : leaderboardInsights.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  Open the leaderboard to activate XP tracking and feed performance highlights directly into this view.
                </div>
              ) : (
                leaderboardEntries
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-2">
              <CardTitle>Performance Review Snapshot</CardTitle>
              <CardDescription>
                Unified feedback tying goals, review scores, and Co-Pilot highlights together.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <SectionSkeleton count={2} />
              ) : error ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground space-y-3" role="status" aria-live="polite">
                  <p>Unable to load review snapshots right now. Please try again after refreshing the page.</p>
                  <Button size="sm" variant="outline" onClick={handleRefetchPerformance}>
                    Retry data load
                  </Button>
                </div>
              ) : unifiedReviews.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                  No performance reviews have been synced yet. Create entries in the performance reviews table to see goal summaries and AI insights here.
                </div>
              ) : (
                unifiedReviews.map((review) => {
                  const progressValue = typeof review.goalProgress === 'number' ? review.goalProgress : 0;
                  const scoreValue = typeof review.score === 'number' ? review.score : 0;
                  const actionItems = Array.isArray(review.actionItems) ? review.actionItems : [];

                  return (
                    <div key={review.reviewId} className="space-y-3 rounded-lg border p-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm md:text-base">
                              {review.goalTitle ?? 'Untitled goal'}
                            </span>
                            {review.goalStatus && (
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                {toTitleCase(review.goalStatus)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Reviewed {review.reviewDate ? new Date(review.reviewDate).toLocaleDateString() : 'recently'} · {review.reviewCycle}
                          </p>
                        </div>
                        <Badge variant={reviewScoreVariant(scoreValue)} className="text-xs">
                          Score {scoreValue.toFixed(1)}/5
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>Goal progress</span>
                          <span className="font-medium">{Math.round(progressValue)}%</span>
                        </div>
                        <Progress value={progressValue} />
                      </div>

                      {review.summary && (
                        <p className="text-sm text-muted-foreground">{review.summary}</p>
                      )}

                      {review.aiSummary && (
                        <div className="flex items-start gap-3 rounded-md bg-muted/50 p-3 text-xs">
                          <Sparkles className="mt-0.5 h-4 w-4 text-primary" />
                          <span>{review.aiSummary}</span>
                        </div>
                      )}

                      {actionItems.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold uppercase text-muted-foreground">Action items</p>
                          <div className="grid gap-1">
                            {actionItems.slice(0, 3).map((item, index) => {
                              const itemRecord = (item && typeof item === 'object') ? (item as Record<string, unknown>) : null;
                              const label = typeof itemRecord?.label === 'string'
                                ? (itemRecord.label as string)
                                : typeof item === 'string'
                                  ? item
                                  : 'Follow-up';
                              const status = typeof itemRecord?.status === 'string' ? (itemRecord.status as string) : undefined;
                              return (
                                <div key={`${review.reviewId}-action-${index}`} className="flex items-center justify-between rounded-md border border-dashed px-3 py-2 text-xs">
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <CheckCircle2 className="h-3 w-3 text-primary" />
                                    <span className="text-foreground">{label}</span>
                                  </div>
                                  {status && (
                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                      {toTitleCase(status)}
                                    </Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team Recognition Highlights</CardTitle>
              <CardDescription>Celebrations from goals, tasks, and learning progress.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recognitionLoading ? (
                <SectionSkeleton count={3} withAvatar />
              ) : (
                <>
                  {recognitionError ? (
                    <Alert variant="destructive" role="status" aria-live="polite">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <AlertTitle>Unable to load recognition activity</AlertTitle>
                          <AlertDescription>{recognitionError}</AlertDescription>
                        </div>
                        <Button size="sm" variant="outline" onClick={handleRetryRecognitions}>
                          Retry recognitions
                        </Button>
                      </div>
                    </Alert>
                  ) : null}
                  {topRecognitions.length === 0 && !recognitionError ? (
                    <div className="text-sm text-muted-foreground">
                      No recognitions yet. Encourage teams to complete goals, tasks, or training to see activity here.
                    </div>
                  ) : (
                    recognitionEntries
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {loading ? (
            <EmployeeCardSkeleton count={3} />
          ) : error ? (
            <div className="text-center py-12 text-muted-foreground space-y-3" role="status" aria-live="polite">
              <p>Unable to load performance summaries. Please try again after refreshing.</p>
              <Button size="sm" variant="outline" onClick={handleRefetchPerformance}>
                Retry data load
              </Button>
            </div>
          ) : employees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No performance records yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Once employees start logging goals and reviews, their performance summaries will appear here.
              </p>
            </div>
          ) : (
            employees.map((employee) => {
              const avgGoalProgress = employee.averageGoalProgress ?? null;
              const avgReviewScore = employee.averageReviewScore ?? null;
              return (
                <Card key={employee.id}>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar>
                          <AvatarImage src={employee.avatarUrl ?? undefined} alt={employee.fullName} loading="lazy" />
                          <AvatarFallback>{getInitials(employee.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle>{employee.fullName}</CardTitle>
                          <CardDescription>{employee.role ?? 'Role not assigned'}</CardDescription>
                        </div>
                      </div>
                      <Badge variant={employee.reviewCount > 0 ? 'secondary' : 'outline'}>
                        {employee.reviewCount} review{employee.reviewCount === 1 ? '' : 's'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <MetricTile label="Active Goals" value={employee.activeGoals} />
                      <MetricTile label="Completed Goals" value={employee.completedGoals} />
                      <MetricTile
                        label="Avg Goal Progress"
                        value={avgGoalProgress !== null ? `${clampPercentage(avgGoalProgress)}%` : '—'}
                      />
                      <MetricTile
                        label="Avg Review Score"
                        value={avgReviewScore !== null ? avgReviewScore.toFixed(1) : '—'}
                      />
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      Last review: {employee.reviewCount > 0 ? formatDate(employee.lastReviewDate, 'No reviews yet') : 'No reviews yet'}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="goals" className="space-y-6" id="performance-tab-goals">
          <Card>
            <CardHeader>
              <CardTitle>Current Goals</CardTitle>
              <CardDescription>Track progress on active objectives</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <SectionSkeleton count={3} />
              ) : error ? (
                <div className="text-center py-12 text-muted-foreground space-y-3" role="status" aria-live="polite">
                  <p>Unable to load goals data at the moment. Please try again.</p>
                  <Button size="sm" variant="outline" onClick={handleRefetchPerformance}>
                    Retry data load
                  </Button>
                </div>
              ) : goals.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p>No goals data available. Create or assign a goal to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {goals.map((goal) => {
                    const progress = clampPercentage(goal.progress);
                    const participantCount = goal.participantIds.length;
                    return (
                      <div key={goal.id} className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex-1 space-y-3">
                          <div>
                            <div className="font-medium text-foreground">{goal.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Created {formatDate(goal.createdAt, 'Unknown start')} · {participantCount} participant{participantCount === 1 ? '' : 's'}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                                <div
                                  className="h-2 rounded-full bg-blue-600"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground">{progress}%</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-2">
                              Target completion: {goal.targetCompletionDate ? formatDate(goal.targetCompletionDate, 'No target date') : 'No target date'}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-start gap-2 md:items-end md:ml-4">
                          <Badge variant={statusVariant(goal.status)} className="capitalize">
                            {toTitleCase(goal.status)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {participantCount} assigned
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Reviews</CardTitle>
              <CardDescription>Most recent feedback shared with your team</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <SectionSkeleton count={4} />
              ) : error ? (
                <div className="text-center py-12 text-muted-foreground space-y-3" role="status" aria-live="polite">
                  <p>Unable to load performance reviews at the moment. Please try again.</p>
                  <Button size="sm" variant="outline" onClick={handleRefetchPerformance}>
                    Retry data load
                  </Button>
                </div>
              ) : recentReviews.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No performance reviews logged</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Performance feedback will appear here as soon as managers submit reviews.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentReviews.map((review) => (
                    <div key={review.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="font-semibold text-foreground">{review.employeeName}</div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {review.summary ?? 'No summary was provided with this review.'}
                          </p>
                          {review.aiSummary && (
                            <p className="mt-1 text-xs text-primary/80">
                              Copilot: {review.aiSummary}
                            </p>
                          )}
                        </div>
                        <Badge variant={reviewScoreVariant(review.score)}>
                          Score {Math.round((review.score ?? 0) * 10) / 10}/5
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-3">
                        Reviewed on {formatDate(review.date, 'Unknown date')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
