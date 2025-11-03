import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { toast } from '@/hooks/use-toast';
import {
  buildPersonalSnapshot,
  calculateCourseWorkload,
  completeEnrollment,
  createLearningCourse,
  deriveCourseRecommendations,
  enrollInCourse,
  fetchEnrollments,
  fetchLearningCatalog,
  fetchProgressEvents,
  recordProgressEvent,
  updateEnrollmentProgress,
} from '@/services/learning/learningService';
import type {
  CourseCreationPayload,
  CourseRecommendation,
  LearningCatalogRecord,
  LearningCourseMetrics,
  LearningEnrollment,
  LearningProgressEvent,
  PersonalLearningSnapshot,
} from '@/types/learning';

type SkillSnapshot = {
  role: string;
  xp: number;
};

const TRAINING_ADMIN_ROLES = new Set(['manager', 'admin', 'company_admin', 'owner']);

export function useLearningCenter() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<LearningCatalogRecord[]>([]);
  const [enrollments, setEnrollments] = useState<LearningEnrollment[]>([]);
  const [adminEnrollments, setAdminEnrollments] = useState<LearningEnrollment[]>([]);
  const [metrics, setMetrics] = useState<LearningCourseMetrics[]>([]);
  const [snapshot, setSnapshot] = useState<PersonalLearningSnapshot | null>(null);
  const [recommendations, setRecommendations] = useState<CourseRecommendation[]>([]);
  const [progressByEnrollment, setProgressByEnrollment] = useState<Record<string, LearningProgressEvent[]>>({});

  const trainingAdmin = useMemo(() => {
    if (!profile?.role) return false;
    return TRAINING_ADMIN_ROLES.has(profile.role);
  }, [profile?.role]);

  const collectMetrics = useCallback((courses: LearningCatalogRecord[]): LearningCourseMetrics[] => {
    return courses
      .map((course) => course.metrics)
      .filter((metric): metric is LearningCourseMetrics => Boolean(metric));
  }, []);

  const fetchSkillSnapshot = useCallback(async (): Promise<SkillSnapshot | null> => {
    if (!profile?.userId) return null;

    const { data, error: skillError } = await supabase
      .from('skill_matrix')
      .select('role, xp')
      .eq('employee_id', profile.userId)
      .order('xp', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (skillError) {
      console.warn('Unable to fetch skill snapshot', skillError);
      return null;
    }

    if (!data) {
      return null;
    }

    return {
      role: data.role,
      xp: data.xp ?? 0,
    };
  }, [profile?.userId]);

  const loadProgressEvents = useCallback(
    async (enrollmentList: LearningEnrollment[]) => {
      const entries = await Promise.all(
        enrollmentList.map(async (enrollment) => {
          const events = await fetchProgressEvents(enrollment.id);
          return [enrollment.id, events] as const;
        }),
      );

      setProgressByEnrollment(Object.fromEntries(entries));
    },
    [setProgressByEnrollment],
  );

  const loadData = useCallback(async () => {
    if (!user?.id || !profile?.userId) {
      setCatalog([]);
      setEnrollments([]);
      setMetrics([]);
      setRecommendations([]);
      setSnapshot(null);
      setProgressByEnrollment({});
      setError(null);
      setLoading(false);
      return;
    }

    if (!companyId) {
      setCatalog([]);
      setEnrollments([]);
      setMetrics([]);
      setRecommendations([]);
      setSnapshot(null);
      setProgressByEnrollment({});
      setError('Company context missing for learning data.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const personalEnrollmentsPromise = fetchEnrollments(profile.userId, companyId);
      const adminEnrollmentsPromise = trainingAdmin
        ? fetchAllEnrollments({ companyId, requireAdmin: true })
        : Promise.resolve<LearningEnrollment[]>([]);

      const [catalogData, personalEnrollments, skillSnapshot, adminEnrollmentsData] = await Promise.all([
        fetchLearningCatalog(companyId),
        personalEnrollmentsPromise,
        fetchSkillSnapshot(),
        adminEnrollmentsPromise,
      ]);

      const courseMetrics = collectMetrics(catalogData);

      const recommendationList = deriveCourseRecommendations(
        catalogData,
        personalEnrollments,
        courseMetrics,
        {
          role: skillSnapshot?.role ?? profile.role ?? undefined,
          xp: skillSnapshot?.xp,
        },
      );

      const personalSnapshot = buildPersonalSnapshot(personalEnrollments, catalogData);

      setCatalog(catalogData);
      setEnrollments(personalEnrollments);
      setAdminEnrollments(trainingAdmin ? adminEnrollmentsData : []);
      setMetrics(courseMetrics);
      setRecommendations(recommendationList);
      setSnapshot(personalSnapshot);
      await loadProgressEvents(personalEnrollments);
    } catch (err) {
      console.error('Failed to load learning center data', err);
      setError('Unable to load learning center data right now.');
    } finally {
      setLoading(false);
    }
  }, [
    user?.id,
    profile?.userId,
    profile?.role,
    companyId,
    trainingAdmin,
    collectMetrics,
    fetchSkillSnapshot,
    loadProgressEvents,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const refresh = useCallback(() => loadData(), [loadData]);

  const handleCreateCourse = useCallback(
    async (payload: CourseCreationPayload) => {
      if (!user?.id || !companyId) {
        toast({
          title: 'Not signed in',
          description: !user?.id ? 'Please sign in to create training courses.' : 'Company context missing for learning data.',
          variant: 'destructive',
        });
        return null;
      }

      setSaving(true);
      try {
        const course = await createLearningCourse(payload, user.id, companyId);
        toast({
          title: 'Course created',
          description: `'${course.title}' has been added to the catalog.`,
        });
        await loadData();
        return course;
      } catch (err) {
        console.error('Failed to create course', err);
        toast({
          title: 'Failed to create course',
          description: 'Please try again or contact an administrator.',
          variant: 'destructive',
        });
        return null;
      } finally {
        setSaving(false);
      }
    },
    [user?.id, loadData],
  );

  const handleEnroll = useCallback(
    async (courseId: string) => {
      if (!profile?.userId) {
        toast({
          title: 'Profile missing',
          description: 'We could not find your profile. Please refresh and try again.',
          variant: 'destructive',
        });
        return null;
      }

      try {
        const enrollment = await enrollInCourse(courseId, profile.userId, companyId);
        setEnrollments((previous) => {
          const exists = previous.find((entry) => entry.id === enrollment.id);
          if (exists) {
            return previous.map((entry) => (entry.id === enrollment.id ? enrollment : entry));
          }
          return [enrollment, ...previous];
        });
        await loadProgressEvents([enrollment]);
        toast({
          title: 'Enrolled',
          description: 'You are enrolled in this course. Progress will sync automatically.',
        });
        return enrollment;
      } catch (err) {
        console.error('Failed to enroll in course', err);
        toast({
          title: 'Enrollment failed',
          description: 'Unable to enroll in the selected course.',
          variant: 'destructive',
        });
        return null;
      }
    },
    [profile?.userId, loadProgressEvents],
  );

  const handleModuleCompletion = useCallback(
    async (enrollmentId: string, moduleIndex: number) => {
      const enrollment = enrollments.find((item) => item.id === enrollmentId);
      if (!enrollment) return;

      const course = catalog.find((item) => item.id === enrollment.courseId);
      if (!course) return;

      const module = course.modules[moduleIndex];
      if (!module) return;

      const modulesCount = Math.max(course.modules.length, 1);
      const estimatedHours = module.estimatedMinutes / 60;
      const newProgress = Math.min(100, ((moduleIndex + 1) / modulesCount) * 100);
      const rollupHours = enrollment.hoursCompleted + estimatedHours;

      try {
        const updated = await updateEnrollmentProgress(enrollment.id, {
          progressPercent: newProgress,
          hoursCompleted: rollupHours,
          currentModule: moduleIndex + 1,
        });

        await recordProgressEvent(enrollment.id, {
          moduleId: module.id,
          eventType: 'module_completed',
          deltaProgress: newProgress - enrollment.progressPercent,
          deltaHours: estimatedHours,
          note: `Completed module ${moduleIndex + 1}: ${module.title}`,
          createdBy: profile?.userId,
        });

        setEnrollments((previous) =>
          previous.map((entry) => (entry.id === updated.id ? updated : entry)),
        );

        await loadProgressEvents([updated]);

        if (newProgress >= 100) {
          await completeEnrollment(updated, course, {
            employeeId: enrollment.employeeId,
            awardingProfileId: profile?.userId ?? undefined,
            roleHint: profile?.role ?? undefined,
          });
          await loadData();
        }
      } catch (err) {
        console.error('Failed to update module progress', err);
        toast({
          title: 'Progress update failed',
          description: 'Could not mark the module as completed.',
          variant: 'destructive',
        });
      }
    },
    [enrollments, catalog, profile?.userId, profile?.role, loadProgressEvents, loadData],
  );

  const handleManualProgressUpdate = useCallback(
    async (enrollmentId: string, progressPercent: number, hoursAdjustment = 0) => {
      const enrollment = enrollments.find((item) => item.id === enrollmentId);
      if (!enrollment) return;

      try {
        const updated = await updateEnrollmentProgress(enrollment.id, {
          progressPercent,
          hoursCompleted: Math.max(0, enrollment.hoursCompleted + hoursAdjustment),
        });

        await recordProgressEvent(enrollment.id, {
          eventType: 'checkpoint',
          deltaProgress: progressPercent - enrollment.progressPercent,
          deltaHours: hoursAdjustment,
          note: 'Progress updated via admin override',
          createdBy: profile?.userId,
        });

        setEnrollments((previous) =>
          previous.map((entry) => (entry.id === updated.id ? updated : entry)),
        );
        await loadProgressEvents([updated]);
      } catch (err) {
        console.error('Failed to adjust progress', err);
        toast({
          title: 'Adjustment failed',
          description: 'Could not apply the requested progress change.',
          variant: 'destructive',
        });
      }
    },
    [enrollments, profile?.userId, loadProgressEvents],
  );

  const courseById = useMemo(() => new Map(catalog.map((course) => [course.id, course])), [catalog]);

  const catalogByCategory = useMemo(() => {
    const map = new Map<string, LearningCatalogRecord[]>();
    catalog.forEach((course) => {
      const list = map.get(course.category) ?? [];
      list.push(course);
      map.set(course.category, list);
    });
    return map;
  }, [catalog]);

  const totalMetrics = useMemo(() => {
    if (metrics.length === 0) {
      return {
        totalCourses: catalog.length,
        totalCompletions: 0,
        totalActiveLearners: 0,
        totalHours: 0,
        totalXp: 0,
        averageProgress: 0,
      };
    }

    const totals = metrics.reduce(
      (acc, metric) => {
        acc.totalCompletions += metric.completions;
        acc.totalActiveLearners += metric.activeLearners;
        acc.totalHours += metric.totalHoursCompleted ?? 0;
        acc.totalXp += metric.totalXpAwarded ?? 0;
        acc.averageProgress += metric.avgProgress ?? 0;
        return acc;
      },
      {
        totalCompletions: 0,
        totalActiveLearners: 0,
        totalHours: 0,
        totalXp: 0,
        averageProgress: 0,
      },
    );

    return {
      totalCourses: catalog.length,
      totalCompletions: totals.totalCompletions,
      totalActiveLearners: totals.totalActiveLearners,
      totalHours: totals.totalHours,
      totalXp: totals.totalXp,
      averageProgress: totals.averageProgress / metrics.length,
    };
  }, [metrics, catalog.length]);

  const getCourseWorkload = useCallback((courseId: string) => {
    const course = courseById.get(courseId);
    if (!course) {
      return { totalMinutes: 0, totalXp: 0 };
    }
    return calculateCourseWorkload(
      course.modules.map((module) => ({
        title: module.title,
        description: module.description ?? undefined,
        estimatedMinutes: module.estimatedMinutes,
        xpAward: module.xpAward,
        content: module.content ?? undefined,
      })),
    );
  }, [courseById]);

  return {
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
    refresh,
    handleCreateCourse,
    handleEnroll,
    handleModuleCompletion,
    handleManualProgressUpdate,
    getCourseWorkload,
  };
}

async function fetchAllEnrollments(options: { companyId: string; requireAdmin: boolean }): Promise<LearningEnrollment[]> {
  if (!options.requireAdmin) {
    throw new Error('Admin privileges are required to view enrollments across the company.');
  }

  if (!options.companyId) {
    throw new Error('Company context is required to fetch enrollments.');
  }

  const { data, error } = await supabase
    .from('learning_enrollments' as any)
    .select('*')
    .eq('company_id', options.companyId)
    .order('updated_at', { ascending: false })
    .limit(200);

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    courseId: row.course_id,
    employeeId: row.employee_id,
    status: row.status,
    progressPercent: typeof row.progress_percent === 'number' ? row.progress_percent : parseFloat(row.progress_percent ?? '0'),
    hoursCompleted: typeof row.hours_completed === 'number' ? row.hours_completed : parseFloat(row.hours_completed ?? '0'),
    currentModule: row.current_module ?? 0,
    level: row.level ?? 1,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}
