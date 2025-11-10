import { useMemo, useState } from 'react';
import { BookMarked, Clock, Layers, Sparkles, Target, Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import type { LearningCatalogRecord, LearningEnrollment } from '@/types/learning';

interface CatalogGridProps {
  courses: LearningCatalogRecord[];
  enrollments: LearningEnrollment[];
  onEnroll: (courseId: string) => void;
  onShowProgress?: () => void;
  highlightCourseIds?: Set<string>;
}

export function CatalogGrid({ courses, enrollments, onEnroll, onShowProgress, highlightCourseIds }: CatalogGridProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const enrollmentsByCourse = useMemo(() => {
    const map = new Map<string, LearningEnrollment>();
    enrollments.forEach((enrollment) => {
      map.set(enrollment.courseId, enrollment);
    });
    return map;
  }, [enrollments]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    courses.forEach((course) => {
      set.add(course.category);
    });
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      if (categoryFilter !== 'all' && course.category !== categoryFilter) {
        return false;
      }
      if (search.trim()) {
        const query = search.toLowerCase();
        const haystack = `${course.title} ${course.description ?? ''} ${course.category} ${course.targetRoles.join(' ')}`.toLowerCase();
        if (!haystack.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [courses, categoryFilter, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <Input
            placeholder="Search courses"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="md:w-64"
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-10 md:w-48">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category === 'all' ? 'All categories' : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {onShowProgress && (
          <Button variant="outline" onClick={onShowProgress}>
            View my progress
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCourses.map((course) => {
          const enrollment = enrollmentsByCourse.get(course.id);
          const metrics = course.metrics;
          const highlight = highlightCourseIds?.has(course.id);
          const completionRate = enrollment?.progressPercent ?? metrics?.avgProgress ?? 0;

          return (
            <Card key={course.id} className={highlight ? 'border-primary shadow-sm shadow-primary/10' : undefined}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {course.title}
                      {highlight && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="mr-1 h-3 w-3" /> Recommended
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                  </div>
                  <Badge variant="outline">{course.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {course.estimatedHours} hrs
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" /> {course.xpReward} XP
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3" /> {course.modules.length} modules
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {course.targetRoles.join(', ')}
                  </span>
                  {course.certificationCode && (
                    <span className="flex items-center gap-1">
                      <BookMarked className="h-3 w-3" /> {course.certificationCode}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span>{enrollment ? 'Your progress' : 'Average completion'}</span>
                    <span className="font-medium">{completionRate.toFixed(0)}%</span>
                  </div>
                  <Progress value={completionRate} />
                </div>

                {metrics && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{metrics.activeLearners} active</span>
                    <span>{metrics.completions} completed</span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Level {course.levelRequirement}+
                  </div>
                  {enrollment ? (
                    <Button size="sm" variant="secondary" disabled={!onShowProgress} onClick={() => onShowProgress?.()}>
                      Continue
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => void onEnroll(course.id)}>
                      Enroll
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
