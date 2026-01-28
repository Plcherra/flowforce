import { useCallback, useMemo } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "@/hooks/use-toast";
import {
  buildPersonalSnapshot,
  calculateCourseWorkload,
  completeEnrollment,
  createLearningCourse,
  deriveCourseRecommendations,
  enrollInCourse,
  fetchCourseMetrics,
  fetchEnrollments,
  fetchLearningCatalog,
  fetchProgressHistoryPage,
  recordCourseCompletionMetadata,
  recordProgressEvent,
  updateEnrollmentProgress,
} from "@/features/learning/services/learningService";
import { analyzeTrainingProgress } from "@/services/ai/trainingInsights";
import {
  learningInvalidators,
  learningKeyHelpers,
  learningKeys,
} from "@/features/learning/hooks/queryKeys";
import type {
  CourseCreationPayload,
  CourseRecommendation,
  LearningCatalogRecord,
  LearningCourseMetrics,
  LearningEnrollment,
  LearningProgressEvent,
  LearningProgressSnapshot,
  PersonalLearningSnapshot,
} from "@/types/learning";
import { logger } from "@/utils/logger";

type SkillSnapshot = {
  role: string;
  xp: number;
};

type TrainingInsights = Awaited<ReturnType<typeof analyzeTrainingProgress>>;
type ProgressQueryData = {
  eventsMap: Record<string, LearningProgressEvent[]>;
  snapshotsMap: Record<string, LearningProgressSnapshot[]>;
  eventCursors: Record<string, string | null>;
  snapshotCursors: Record<string, string | null>;
};

const TRAINING_ADMIN_ROLES = new Set([
  "manager",
  "admin",
  "company_admin",
  "owner",
]);
const PROGRESS_EVENT_LIMIT = 25;
const PROGRESS_SNAPSHOT_LIMIT = 10;
const ADMIN_ENROLLMENT_LIMIT = 200;

const learningEnrollmentSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  employeeId: z.string(),
  status: z.string(),
  progressPercent: z.number(),
  hoursCompleted: z.number(),
  currentModule: z.number(),
  level: z.number(),
  startedAt: z.string(),
  completedAt: z.string().nullable(),
  lastActivityAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const adminEnrollmentsResponseSchema = z.object({
  enrollments: z.array(learningEnrollmentSchema),
});

export function useLearningCenter() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const companyId = profile?.companyId ?? profile?.company_id ?? null;
  const profileId = profile?.userId ?? null;
  const companyKey = learningKeyHelpers.companyKey(companyId);
  const profileKey = learningKeyHelpers.profileKey(profileId);

  const trainingAdmin = useMemo(() => {
    if (!profile?.role) return false;
    return TRAINING_ADMIN_ROLES.has(profile.role);
  }, [profile?.role]);

  const catalogQuery = useQuery({
    queryKey: learningKeys.catalog(companyKey),
    enabled: Boolean(companyId && user?.id),
    queryFn: () => fetchLearningCatalog(companyId!),
    staleTime: 60_000,
  });

  const enrollmentsQuery = useQuery({
    queryKey: learningKeys.enrollments(companyKey, profileKey),
    enabled: Boolean(companyId && profileId),
    queryFn: () => fetchEnrollments(profileId!, companyId!),
    staleTime: 30_000,
  });

  const enrollmentList = enrollmentsQuery.data ?? [];
  const enrollmentIdsKey = useMemo(
    () =>
      enrollmentList
        .map((enrollment) => enrollment.id)
        .sort()
        .join("|"),
    [enrollmentList],
  );

  const adminEnrollmentsQuery = useQuery({
    queryKey: learningKeys.adminEnrollments(companyKey),
    enabled: Boolean(companyId && trainingAdmin),
    queryFn: () => fetchAdminEnrollments(),
    staleTime: 30_000,
  });

  const metricsQuery = useQuery({
    queryKey: learningKeys.metrics(companyKey),
    enabled: Boolean(companyId && trainingAdmin),
    queryFn: () => fetchCourseMetrics(companyId!),
    staleTime: 60_000,
  });

  const skillSnapshotQuery = useQuery({
    queryKey: learningKeys.skillSnapshot(companyKey, profileKey),
    enabled: Boolean(companyId && profileId),
    queryFn: () => fetchScopedSkillSnapshot(profileId!, companyId!),
    staleTime: 300_000,
  });

  const trainingInsightsQuery = useQuery({
    queryKey: learningKeys.insights(companyKey),
    enabled: Boolean(companyId && trainingAdmin),
    queryFn: () => analyzeTrainingProgress(companyId!),
    staleTime: 300_000,
  });

  const progressQueryKey = useMemo(
    () => learningKeys.progress(companyKey, profileKey, enrollmentIdsKey),
    [companyKey, profileKey, enrollmentIdsKey],
  );

  const progressQuery = useQuery<ProgressQueryData>({
    queryKey: learningKeys.progress(companyKey, profileKey, enrollmentIdsKey),
    enabled: Boolean(companyId && profileId && enrollmentList.length > 0),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: async () => {
      const entries = await Promise.all(
        enrollmentList.map(async (enrollment) => {
          try {
            const page = await fetchProgressHistoryPage({
              enrollmentId: enrollment.id,
              eventLimit: PROGRESS_EVENT_LIMIT,
              snapshotLimit: PROGRESS_SNAPSHOT_LIMIT,
            });
            return { enrollmentId: enrollment.id, ...page };
          } catch (err) {
            logger.error("Failed to load progress history", {
              error: err,
              tags: ["error"],
            });
            toast({
              title: "Progress unavailable",
              description:
                "Some progress history could not be loaded. Please try refreshing.",
              variant: "destructive",
            });
            return {
              enrollmentId: enrollment.id,
              events: [],
              snapshots: [],
              eventCursor: null,
              snapshotCursor: null,
            };
          }
        }),
      );

      const eventsMap: Record<string, LearningProgressEvent[]> = {};
      const snapshotsMap: Record<string, LearningProgressSnapshot[]> = {};
      const eventCursors: Record<string, string | null> = {};
      const snapshotCursors: Record<string, string | null> = {};
      entries.forEach(
        ({ enrollmentId, events, snapshots, eventCursor, snapshotCursor }) => {
          eventsMap[enrollmentId] = events;
          snapshotsMap[enrollmentId] = snapshots;
          eventCursors[enrollmentId] = eventCursor ?? null;
          snapshotCursors[enrollmentId] = snapshotCursor ?? null;
        },
      );

      return { eventsMap, snapshotsMap, eventCursors, snapshotCursors };
    },
  });

  const catalog = catalogQuery.data ?? [];
  const adminEnrollments = trainingAdmin
    ? (adminEnrollmentsQuery.data ?? [])
    : [];
  const skillSnapshot = skillSnapshotQuery.data ?? null;
  const trainingInsights = trainingAdmin
    ? (trainingInsightsQuery.data ?? null)
    : null;

  const catalogByCategory = useMemo(() => {
    const map = new Map<string, LearningCatalogRecord[]>();
    catalog.forEach((course) => {
      const list = map.get(course.category) ?? [];
      list.push(course);
      map.set(course.category, list);
    });
    return map;
  }, [catalog]);

  const courseById = useMemo(
    () => new Map(catalog.map((course) => [course.id, course])),
    [catalog],
  );

  const fallbackMetrics = useMemo(
    () =>
      catalog.reduce<LearningCourseMetrics[]>((acc, course) => {
        if (course.metrics) {
          acc.push(course.metrics);
        }
        return acc;
      }, []),
    [catalog],
  );

  const metrics = useMemo(() => {
    if (trainingAdmin && metricsQuery.data) {
      return metricsQuery.data;
    }
    return fallbackMetrics;
  }, [trainingAdmin, metricsQuery.data, fallbackMetrics]);

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
        acc.totalCompletions += metric.completions ?? 0;
        acc.totalActiveLearners += metric.activeLearners ?? 0;
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

  const snapshot = useMemo<PersonalLearningSnapshot | null>(() => {
    if (enrollmentList.length === 0) return null;
    return buildPersonalSnapshot(enrollmentList, catalog);
  }, [enrollmentList, catalog]);

  const recommendations = useMemo<CourseRecommendation[]>(() => {
    return deriveCourseRecommendations(catalog, enrollmentList, metrics, {
      role: skillSnapshot?.role ?? profile?.role ?? undefined,
      xp: skillSnapshot?.xp,
    });
  }, [
    catalog,
    enrollmentList,
    metrics,
    skillSnapshot?.role,
    skillSnapshot?.xp,
    profile?.role,
  ]);

  const progressByEnrollment = progressQuery.data?.eventsMap ?? {};
  const progressSnapshotsByEnrollment = progressQuery.data?.snapshotsMap ?? {};
  const progressEventCursors = progressQuery.data?.eventCursors ?? {};
  const progressSnapshotCursors = progressQuery.data?.snapshotCursors ?? {};

  const loading =
    catalogQuery.isLoading ||
    enrollmentsQuery.isLoading ||
    progressQuery.isLoading ||
    (trainingAdmin &&
      (adminEnrollmentsQuery.isLoading ||
        metricsQuery.isLoading ||
        trainingInsightsQuery.isLoading));

  const error =
    catalogQuery.error?.message ??
    enrollmentsQuery.error?.message ??
    progressQuery.error?.message ??
    (trainingAdmin
      ? (adminEnrollmentsQuery.error?.message ??
        metricsQuery.error?.message ??
        trainingInsightsQuery.error?.message)
      : null) ??
    null;

  const createCourseMutation = useMutation({
    mutationFn: async (payload: CourseCreationPayload) => {
      if (!user?.id || !companyId) {
        throw new Error(
          !user?.id
            ? "Please sign in to create training courses."
            : "Company context missing for learning data.",
        );
      }
      return createLearningCourse(payload, user.id, companyId);
    },
    onSuccess: (course) => {
      toast({
        title: "Course created",
        description: `'${course.title}' has been added to the catalog.`,
      });
      queryClient.invalidateQueries({
        queryKey: learningKeys.catalog(companyKey),
      });
      queryClient.invalidateQueries({
        queryKey: learningKeys.metrics(companyKey),
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to create course",
        description:
          err.message ?? "Please try again or contact an administrator.",
        variant: "destructive",
      });
    },
  });

  const handleCreateCourse = useCallback(
    (payload: CourseCreationPayload) =>
      createCourseMutation.mutateAsync(payload),
    [createCourseMutation],
  );

  const handleEnroll = useCallback(
    async (courseId: string) => {
      if (!profileId || !companyId) {
        toast({
          title: "Profile missing",
          description:
            "We could not find your profile. Please refresh and try again.",
          variant: "destructive",
        });
        return null;
      }

      try {
        const enrollment = await enrollInCourse(courseId, profileId, companyId);
        toast({
          title: "Enrolled",
          description:
            "You are enrolled in this course. Progress will sync automatically.",
        });
        learningInvalidators.enrollments(queryClient, companyKey, profileKey);
        learningInvalidators.progress(queryClient, companyKey, profileKey);
        return enrollment;
      } catch (err) {
        logger.error("Failed to enroll in course", {
          error: err,
          tags: ["error"],
        });
        toast({
          title: "Enrollment failed",
          description: "Unable to enroll in the selected course.",
          variant: "destructive",
        });
        return null;
      }
    },
    [
      profileId,
      companyId,
      queryClient,
      companyKey,
      profileKey,
      enrollmentIdsKey,
    ],
  );

  const handleModuleCompletion = useCallback(
    async (enrollmentId: string, moduleIndex: number) => {
      const enrollment = enrollmentList.find(
        (item) => item.id === enrollmentId,
      );
      if (!enrollment) return;
      const course = catalog.find((item) => item.id === enrollment.courseId);
      if (!course) return;

      const module = course.modules[moduleIndex];
      if (!module) return;

      const modulesCount = Math.max(course.modules.length, 1);
      const estimatedHours = module.estimatedMinutes / 60;
      const newProgress = Math.min(
        100,
        ((moduleIndex + 1) / modulesCount) * 100,
      );
      const rollupHours = enrollment.hoursCompleted + estimatedHours;

      try {
        const updated = await updateEnrollmentProgress(
          enrollment.id,
          {
            progressPercent: newProgress,
            hoursCompleted: rollupHours,
            currentModule: moduleIndex + 1,
          },
          {
            recordedBy: profile?.userId ?? null,
            moduleId: module.id,
            timeSpentMinutes: Math.round(module.estimatedMinutes),
            metadata: { source: "module_completion" },
          },
        );

        await recordProgressEvent(enrollment.id, {
          moduleId: module.id,
          eventType: "module_completed",
          deltaProgress: newProgress - enrollment.progressPercent,
          deltaHours: estimatedHours,
          note: `Completed module ${moduleIndex + 1}: ${module.title}`,
          createdBy: profile?.userId ?? undefined,
        });

        if (newProgress >= 100) {
          await completeEnrollment(updated, course, {
            employeeId: enrollment.employeeId,
            awardingProfileId: profile?.userId ?? undefined,
            roleHint: profile?.role ?? undefined,
          });
          if (companyId) {
            await recordCourseCompletionMetadata(course, {
              companyId,
              employeeId: enrollment.employeeId,
              awardingProfileId: profile?.userId ?? null,
            });
          }
        }

        learningInvalidators.enrollments(queryClient, companyKey, profileKey);
        learningInvalidators.progress(queryClient, companyKey, profileKey);
        learningInvalidators.metrics(queryClient, companyKey);
        learningInvalidators.catalog(queryClient, companyKey);
        learningInvalidators.insights(queryClient, companyKey);
      } catch (err) {
        logger.error("Failed to update module progress", {
          error: err,
          tags: ["error"],
        });
        toast({
          title: "Progress update failed",
          description: "Could not mark the module as completed.",
          variant: "destructive",
        });
      }
    },
    [
      enrollmentList,
      catalog,
      profile?.userId,
      profile?.role,
      companyId,
      queryClient,
      companyKey,
      profileKey,
      enrollmentIdsKey,
    ],
  );

  const refresh = useCallback(() => {
    learningInvalidators.base(queryClient);
  }, [queryClient]);

  const loadMoreProgress = useCallback(
    async (
      enrollmentId: string,
      options: {
        eventCursor?: string | null;
        snapshotCursor?: string | null;
      } = {},
    ) => {
      try {
        const page = await fetchProgressHistoryPage({
          enrollmentId,
          eventCursor:
            options.eventCursor ??
            progressEventCursors[enrollmentId] ??
            undefined,
          snapshotCursor:
            options.snapshotCursor ??
            progressSnapshotCursors[enrollmentId] ??
            undefined,
          eventLimit: PROGRESS_EVENT_LIMIT,
          snapshotLimit: PROGRESS_SNAPSHOT_LIMIT,
        });

        queryClient.setQueryData<ProgressQueryData | undefined>(
          progressQueryKey,
          (previous) => {
            const base: ProgressQueryData = previous ?? {
              eventsMap: {},
              snapshotsMap: {},
              eventCursors: {},
              snapshotCursors: {},
            };

            const currentEvents = base.eventsMap[enrollmentId] ?? [];
            const currentSnapshots = base.snapshotsMap[enrollmentId] ?? [];

            return {
              eventsMap: {
                ...base.eventsMap,
                [enrollmentId]: [...currentEvents, ...page.events],
              },
              snapshotsMap: {
                ...base.snapshotsMap,
                [enrollmentId]: [...currentSnapshots, ...page.snapshots],
              },
              eventCursors: {
                ...base.eventCursors,
                [enrollmentId]: page.eventCursor ?? null,
              },
              snapshotCursors: {
                ...base.snapshotCursors,
                [enrollmentId]: page.snapshotCursor ?? null,
              },
            };
          },
        );
      } catch (error) {
        logger.error("Failed to paginate progress history", {
          error,
          tags: ["error"],
        });
        toast({
          title: "Unable to load more progress",
          description: "Please check your connection and try again.",
          variant: "destructive",
        });
      }
    },
    [
      progressEventCursors,
      progressSnapshotCursors,
      queryClient,
      progressQueryKey,
    ],
  );

  const getCourseWorkload = useCallback(
    (courseId: string) => {
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
    },
    [courseById],
  );

  return {
    loading,
    saving: createCourseMutation.isPending,
    error,
    trainingAdmin,
    catalog,
    catalogByCategory,
    enrollments: enrollmentList,
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
    loadMoreProgress,
    handleCreateCourse,
    handleEnroll,
    handleModuleCompletion,
    getCourseWorkload,
  };
}

async function fetchScopedSkillSnapshot(
  userId: string,
  companyId: string,
): Promise<SkillSnapshot | null> {
  const { data, error } = await supabase
    .from("skill_matrix")
    .select("role, xp, profiles!inner(company_id)")
    .eq("employee_id", userId)
    .eq("profiles.company_id", companyId)
    .order("xp", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    role: data.role,
    xp: data.xp ?? 0,
  };
}

async function fetchAdminEnrollments(
  limit = ADMIN_ENROLLMENT_LIMIT,
): Promise<LearningEnrollment[]> {
  const { data, error } = await supabase.functions.invoke(
    "learning-admin-enrollments",
    {
      body: { limit },
    },
  );

  if (error) {
    throw new Error(error.message ?? "Unable to load admin enrollments.");
  }

  const parsed = adminEnrollmentsResponseSchema.safeParse(data);
  if (!parsed.success) {
    logger.error("[learning] Invalid admin enrollment payload", {
      error: parsed.error.flatten(),
      tags: ["error"],
    });
    throw new Error("Malformed admin enrollment response.");
  }
  return parsed.data.enrollments;
}
