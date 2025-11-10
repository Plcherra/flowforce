import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, RefreshCcw, Trophy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/modules/system/components/EmptyState';
import { RecommendationsPanel } from '@/components/learning/RecommendationsPanel';
import { useLearningCenter } from '@/hooks/learning/useLearningCenter';

const CatalogGrid = lazy(() =>
  import('@/components/learning/CatalogGrid').then((module) => ({ default: module.CatalogGrid })),
);
const EnrollmentProgress = lazy(() =>
  import('@/components/learning/EnrollmentProgress').then((module) => ({ default: module.EnrollmentProgress })),
);
const AnalyticsOverview = lazy(() =>
  import('@/components/learning/AnalyticsOverview').then((module) => ({ default: module.AnalyticsOverview })),
);
const CourseCreationWizard = lazy(() =>
  import('@/components/learning/CourseCreationWizard').then((module) => ({ default: module.CourseCreationWizard })),
);

type LearningTab = 'overview' | 'catalog' | 'analytics' | 'admin';

const VALID_TABS: LearningTab[] = ['overview', 'catalog', 'analytics', 'admin'];

const isLearningTab = (value: string): value is LearningTab => VALID_TABS.includes(value as LearningTab);

const deriveTabFromSearch = (search: string): LearningTab | null => {
  const params = new URLSearchParams(search);
  const requested = params.get('tab');
  if (requested && isLearningTab(requested)) {
    return requested;
  }
  if (params.get('certification')) {
    return 'catalog';
  }
  return null;
};

const CatalogGridSkeleton = () => (
  <div className="space-y-4">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-3">
      <Skeleton className="h-10 w-full md:w-64" />
      <Skeleton className="h-10 w-full md:w-48" />
      <Skeleton className="h-10 w-full md:w-40" />
    </div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="shadow-sm">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-2 h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

const EnrollmentProgressSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 2 }).map((_, index) => (
      <Card key={index} className="shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-2 h-4 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    ))}
  </div>
);

const AnalyticsOverviewSkeleton = () => (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index}>
          <CardHeader>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
    <Card className="h-64">
      <CardContent className="h-full">
        <Skeleton className="h-full w-full" />
      </CardContent>
    </Card>
  </div>
);

export default function LearningCenter() {
  const location = useLocation();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LearningTab>(() => deriveTabFromSearch(location.search) ?? 'overview');

  const {
    loading,
    saving,
    error,
    trainingAdmin,
    catalog,
    catalogByCategory,
    enrollments,
    adminEnrollments,
    courseById,
    metrics,
    totalMetrics,
    snapshot,
    recommendations,
    progressByEnrollment,
    progressSnapshotsByEnrollment,
    progressEventCursors,
    progressSnapshotCursors,
    trainingInsights,
    refresh,
    handleCreateCourse,
    handleEnroll,
    handleModuleCompletion,
    loadMoreProgress,
  } = useLearningCenter();

  useEffect(() => {
    const parsedTab = deriveTabFromSearch(location.search);
    const nextTab =
      parsedTab && !trainingAdmin && (parsedTab === 'analytics' || parsedTab === 'admin') ? 'overview' : parsedTab;

    if (nextTab && nextTab !== activeTab) {
      setActiveTab(nextTab);
      return;
    }

    if (!trainingAdmin && (activeTab === 'analytics' || activeTab === 'admin')) {
      setActiveTab('overview');
    }
  }, [location.search, activeTab, trainingAdmin]);

  const recommendedCourseIds = useMemo(() => new Set(recommendations.map((recommendation) => recommendation.courseId)), [recommendations]);
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const focusCertification = searchParams.get('certification');

  const highlightedCourseIds = useMemo(() => {
    const highlightSet = new Set<string>(recommendedCourseIds);
    if (focusCertification) {
      catalog.forEach((course) => {
        if (course.certificationCode === focusCertification) {
          highlightSet.add(course.id);
        }
      });
    }
    return highlightSet;
  }, [recommendedCourseIds, catalog, focusCertification]);
  const showCatalogSkeleton = loading && catalog.length === 0;
  const showCatalogEmpty = !loading && catalog.length === 0;
  const showAdminSkeleton = loading && metrics.length === 0;
  const showAdminEmpty = !loading && metrics.length === 0;

  const handleTabChange = useCallback((value: string) => {
    setActiveTab((previous) => (isLearningTab(value) ? value : previous));
  }, []);

  const handleShowProgress = useCallback(() => setActiveTab('overview'), []);
  const handleOpenWizard = useCallback(() => setWizardOpen(true), []);
  const handleWizardOpenChange = useCallback((open: boolean) => setWizardOpen(open), []);

  const personalStats = snapshot
    ? [
        {
          label: 'Active courses',
          value: snapshot.activeEnrollments.length,
          description: 'Currently in progress',
        },
        {
          label: 'Hours logged',
          value: snapshot.totalHours.toFixed(1),
          description: 'Tracked via Supabase events',
        },
        {
          label: 'XP earned',
          value: snapshot.totalXpEarned,
          description: 'Applied to skill matrix',
        },
      ]
    : [];

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Learning Center</h1>
          <p className="text-sm text-muted-foreground">
            Launch structured training with live analytics, XP rewards, and Co-Pilot recommendations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          {trainingAdmin && (
            <Button onClick={handleOpenWizard}>
              <Plus className="mr-2 h-4 w-4" />
              New course
            </Button>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="flex w-full flex-wrap justify-start gap-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          {trainingAdmin && <TabsTrigger value="analytics">Analytics</TabsTrigger>}
          {trainingAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {loading && !snapshot ? (
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {personalStats.map((stat) => (
                <Card key={stat.label} className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                    <CardDescription>{stat.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <RecommendationsPanel recommendations={recommendations} courseById={courseById} onEnroll={handleEnroll} />

          <Suspense fallback={<EnrollmentProgressSkeleton />}>
            <EnrollmentProgress
              enrollments={enrollments}
              courses={courseById}
              progressEvents={progressByEnrollment}
              progressSnapshots={progressSnapshotsByEnrollment}
              progressEventCursors={progressEventCursors}
              progressSnapshotCursors={progressSnapshotCursors}
              onCompleteNextModule={handleModuleCompletion}
              onLoadMoreProgress={loadMoreProgress}
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="catalog" className="space-y-6">
          {showCatalogSkeleton && <CatalogGridSkeleton />}

          {showCatalogEmpty && (
            <EmptyState
              title="No courses in the catalog"
              description="Create your first course or ask an admin to publish training content."
              action={
                trainingAdmin ? (
                  <Button onClick={() => setWizardOpen(true)}>Create course</Button>
                ) : (
                  <Button variant="outline" onClick={refresh}>
                    Refresh
                  </Button>
                )
              }
            />
          )}

          {!showCatalogSkeleton && !showCatalogEmpty && (
            <>
              <Suspense fallback={<CatalogGridSkeleton />}>
                <CatalogGrid
                  courses={catalog}
                  enrollments={enrollments}
                  onEnroll={handleEnroll}
                  onShowProgress={handleShowProgress}
                  highlightCourseIds={highlightedCourseIds}
                />
              </Suspense>

              <div className="grid gap-4 md:grid-cols-2">
                {Array.from(catalogByCategory.entries()).map(([category, courses]) => {
                  const averageXp = courses.length > 0 ? Math.round(courses.reduce((sum, item) => sum + item.xpReward, 0) / courses.length) : 0;
                  const totalModules = courses.reduce((sum, item) => sum + item.modules.length, 0);

                  return (
                    <Card key={category} className="border-dashed">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Badge variant="outline">{category}</Badge>
                          <span className="text-xs text-muted-foreground">{courses.length} courses</span>
                        </CardTitle>
                        <CardDescription>
                          Avg XP {averageXp} · {totalModules} modules total
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </TabsContent>

        {trainingAdmin && (
          <TabsContent value="analytics" className="space-y-6">
            <Suspense fallback={<AnalyticsOverviewSkeleton />}>
              <AnalyticsOverview
                metrics={metrics}
                totals={totalMetrics}
                adminEnrollments={adminEnrollments}
                courseById={courseById}
                trainingInsights={trainingInsights ?? undefined}
              />
            </Suspense>
          </TabsContent>
        )}

        {trainingAdmin && (
          <TabsContent value="admin" className="space-y-6">
            {showAdminSkeleton && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Skeleton className="h-6 w-56" />
                  </CardTitle>
                  <CardDescription>
                    <Skeleton className="h-4 w-64" />
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="flex flex-col gap-3 rounded-md border p-4 md:flex-row md:items-center md:gap-6">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {showAdminEmpty && (
              <EmptyState
                title="No training metrics yet"
                description="Metrics will appear once learners enroll and start completing courses."
                action={
                  <Button variant="outline" onClick={refresh}>
                    Refresh
                  </Button>
                }
              />
            )}

            {!showAdminSkeleton && !showAdminEmpty && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Trophy className="h-5 w-5 text-primary" /> Course performance snapshot
                  </CardTitle>
                  <CardDescription>Roll-up metrics with completion rate, active learners, and XP impact.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-64">Course</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Completions</TableHead>
                        <TableHead>Avg progress</TableHead>
                        <TableHead>XP awarded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.map((metric) => (
                        <TableRow key={metric.courseId}>
                          <TableCell className="font-medium">{courseById.get(metric.courseId)?.title ?? metric.title}</TableCell>
                          <TableCell>{metric.category}</TableCell>
                          <TableCell>
                            <Badge variant={metric.completions > 0 ? 'default' : 'outline'}>
                              {metric.completions > 0 ? 'Activated' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell>{metric.activeLearners}</TableCell>
                          <TableCell>{metric.completions}</TableCell>
                          <TableCell>{metric.avgProgress ? `${metric.avgProgress.toFixed(0)}%` : '—'}</TableCell>
                          <TableCell>{metric.totalXpAwarded ?? 0}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>

      <Suspense fallback={null}>
        <CourseCreationWizard open={wizardOpen} onOpenChange={handleWizardOpenChange} onCreate={handleCreateCourse} loading={saving} />
      </Suspense>
    </div>
  );
}
