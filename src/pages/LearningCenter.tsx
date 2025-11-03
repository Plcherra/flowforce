import { useMemo, useState } from 'react';
import { Plus, RefreshCcw, Trophy } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CourseCreationWizard } from '@/components/learning/CourseCreationWizard';
import { CatalogGrid } from '@/components/learning/CatalogGrid';
import { EnrollmentProgress } from '@/components/learning/EnrollmentProgress';
import { RecommendationsPanel } from '@/components/learning/RecommendationsPanel';
import { AnalyticsOverview } from '@/components/learning/AnalyticsOverview';
import { useLearningCenter } from '@/hooks/learning/useLearningCenter';

export default function LearningCenter() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'catalog' | 'analytics' | 'admin'>('overview');

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
    refresh,
    handleCreateCourse,
    handleEnroll,
    handleModuleCompletion,
  } = useLearningCenter();

  const recommendedCourseIds = useMemo(() => new Set(recommendations.map((recommendation) => recommendation.courseId)), [recommendations]);

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
            <Button onClick={() => setWizardOpen(true)}>
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

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="space-y-6">
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

          <EnrollmentProgress
            enrollments={enrollments}
            courses={courseById}
            progressEvents={progressByEnrollment}
            progressSnapshots={progressSnapshotsByEnrollment}
            onCompleteNextModule={handleModuleCompletion}
          />
        </TabsContent>

        <TabsContent value="catalog" className="space-y-6">
          <CatalogGrid
            courses={catalog}
            enrollments={enrollments}
            onEnroll={handleEnroll}
            onShowProgress={() => setActiveTab('overview')}
            highlightCourseIds={recommendedCourseIds}
          />

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
        </TabsContent>

        {trainingAdmin && (
          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsOverview metrics={metrics} totals={totalMetrics} adminEnrollments={adminEnrollments} courseById={courseById} />
          </TabsContent>
        )}

        {trainingAdmin && (
          <TabsContent value="admin" className="space-y-6">
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
          </TabsContent>
        )}
      </Tabs>

      <CourseCreationWizard open={wizardOpen} onOpenChange={setWizardOpen} onCreate={handleCreateCourse} loading={saving} />
    </div>
  );
}
