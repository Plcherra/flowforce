import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { LearningCatalogRecord } from '@/types/learning';

interface LearningCatalogProps {
  courses: LearningCatalogRecord[];
  recommendedCourseIds: Set<string>;
  loading: boolean;
  onEnroll?: (courseId: string) => void;
  onCreateCourse?: () => void;
  canCreateCourse: boolean;
}

export function LearningCatalog({
  courses,
  recommendedCourseIds,
  loading,
  onEnroll,
  onCreateCourse,
  canCreateCourse,
}: LearningCatalogProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Catalog</h2>
          <p className="text-sm text-muted-foreground">Courses available to enroll right now</p>
        </div>
        {canCreateCourse && (
          <Button type="button" onClick={onCreateCourse}>
            Create course
          </Button>
        )}
      </div>

      {loading && courses.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="mt-2 h-3 w-48" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-10 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No courses found</CardTitle>
            <CardDescription>Add a course to start building your learning catalog.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const recommended = recommendedCourseIds.has(course.id);
            return (
              <Card key={course.id} className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">{course.title}</CardTitle>
                  <CardDescription>{course.description ?? 'No description provided.'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{course.category}</Badge>
                    <Badge variant="secondary">{course.deliveryMode.replace('_', ' ')}</Badge>
                    {recommended && <Badge>Recommended</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    XP Reward: {course.xpReward.toLocaleString()} · Estimated hours: {course.estimatedHours}
                  </p>
                  <Button type="button" onClick={() => onEnroll?.(course.id)}>
                    Enroll
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default LearningCatalog;
