import { Fragment } from 'react';
import { Activity, CheckSquare, Clock, GraduationCap, LineChart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type {
  LearningCatalogRecord,
  LearningEnrollment,
  LearningProgressEvent,
  LearningProgressSnapshot,
} from '@/types/learning';

interface EnrollmentProgressProps {
  enrollments: LearningEnrollment[];
  courses: Map<string, LearningCatalogRecord>;
  progressEvents: Record<string, LearningProgressEvent[]>;
  progressSnapshots: Record<string, LearningProgressSnapshot[]>;
  onCompleteNextModule: (enrollmentId: string, moduleIndex: number) => void;
}

export function EnrollmentProgress({ enrollments, courses, progressEvents, progressSnapshots, onCompleteNextModule }: EnrollmentProgressProps) {
  if (enrollments.length === 0) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <GraduationCap className="h-5 w-5 text-primary" />
            No enrollments yet
          </CardTitle>
          <CardDescription>Enroll in a course from the catalog to start tracking your progress.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {enrollments.map((enrollment) => {
        const course = courses.get(enrollment.courseId);
        if (!course) {
          return null;
        }
        const nextModuleIndex = Math.min(enrollment.currentModule, Math.max(course.modules.length - 1, 0));
        const nextModule = course.modules[nextModuleIndex];
        const events = progressEvents[enrollment.id] ?? [];
        const snapshots = progressSnapshots[enrollment.id] ?? [];

        return (
          <Card key={enrollment.id} className="shadow-sm">
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{course.title}</CardTitle>
                  <CardDescription>Level {course.levelRequirement}+ · {course.estimatedHours} hrs · {course.xpReward} XP</CardDescription>
                </div>
                <Badge variant={enrollment.status === 'completed' ? 'default' : 'outline'}>
                  {enrollment.status === 'completed' ? 'Completed' : 'In progress'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Progress</span>
                  <span className="font-medium">{enrollment.progressPercent.toFixed(0)}%</span>
                </div>
                <Progress value={enrollment.progressPercent} />
              </div>

              <div className="flex flex-wrap gap-6 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {enrollment.hoursCompleted.toFixed(1)} hrs logged
                </span>
                <span className="flex items-center gap-1">
                  <LineChart className="h-3 w-3" /> {enrollment.level}
                </span>
                <span className="flex items-center gap-1">
                  <CheckSquare className="h-3 w-3" /> {enrollment.currentModule}/{course.modules.length} modules
                </span>
              </div>

              {enrollment.status !== 'completed' && nextModule && (
                <div className="flex flex-col gap-2 rounded-md border border-dashed p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Next up: {nextModule.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {nextModule.estimatedMinutes} min · {nextModule.xpAward} XP
                      </p>
                    </div>
                    <Button size="sm" onClick={() => onCompleteNextModule(enrollment.id, nextModuleIndex)}>
                      Mark complete
                    </Button>
                  </div>
                </div>
              )}

              {events.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Recent activity</p>
                  <div className="space-y-2">
                    {events.slice(0, 4).map((event) => (
                      <Fragment key={event.id}>
                        <div className="flex flex-col rounded-md border p-3 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Activity className="h-3 w-3" />
                            <span>{new Date(event.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="mt-1 font-medium text-foreground">{event.eventType.replace('_', ' ')}</div>
                          {event.note && <div className="text-muted-foreground">{event.note}</div>}
                        </div>
                      </Fragment>
                    ))}
                  </div>
                </div>
              )}

              {snapshots.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Progress checkpoints</p>
                  <div className="space-y-2">
                    {snapshots.slice(0, 3).map((snapshot) => (
                      <div key={snapshot.id} className="rounded-md border p-3 text-xs">
                        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                          <div className="space-y-1">
                            <div className="text-sm font-medium text-foreground">
                              {snapshot.progressPercent.toFixed(0)}% complete · {snapshot.timeSpentMinutes} min logged
                            </div>
                            {snapshot.aiRecommendation && (
                              <p className="text-muted-foreground">{snapshot.aiRecommendation}</p>
                            )}
                          </div>
                          <span className="text-muted-foreground">
                            {new Date(snapshot.recordedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
