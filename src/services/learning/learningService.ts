import { supabase } from '@/integrations/supabase/client';

let learningClient = supabase;

export function __setLearningServiceClient(client: typeof supabase) {
  learningClient = client;
}

export function __resetLearningServiceClient() {
  learningClient = supabase;
}
import { toast } from '@/hooks/use-toast';
import type {
  CourseCreationPayload,
  CourseModuleInput,
  CourseRecommendation,
  LearningCatalogRecord,
  LearningCourse,
  LearningCourseMetrics,
  LearningEnrollment,
  LearningModule,
  LearningProgressEvent,
  PersonalLearningSnapshot,
} from '@/types/learning';
import { slugify } from '@/utils/slugify';

const TABLE_COURSES = 'learning_courses';
const TABLE_MODULES = 'learning_modules';
const TABLE_ENROLLMENTS = 'learning_enrollments';
const TABLE_PROGRESS = 'learning_progress_events';
const TABLE_PROGRESS_SNAPSHOTS = 'learning_progress';
const VIEW_METRICS = 'learning_course_metrics';

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  company_id: string | null;
  level_requirement: number;
  xp_reward: number;
  estimated_hours: string | number | null;
  delivery_mode: string;
  target_roles: string[] | null;
  featured: boolean | null;
  certification_code: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type ModuleRow = {
  id: string;
  course_id: string;
  company_id: string | null;
  title: string;
  description: string | null;
  content: string | null;
  order_index: number;
  estimated_minutes: number | null;
  xp_award: number | null;
  created_at: string;
};

type EnrollmentRow = {
  id: string;
  course_id: string;
  employee_id: string;
  company_id: string | null;
  status: string;
  progress_percent: string | number | null;
  hours_completed: string | number | null;
  current_module: number | null;
  level: number | null;
  started_at: string;
  completed_at: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
};

type ProgressRow = {
  id: string;
  enrollment_id: string;
  module_id: string | null;
  event_type: string;
  delta_progress: string | number | null;
  delta_hours: string | number | null;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

type ProgressSnapshotRow = Tables<'learning_progress'>;

type MetricsRow = {
  course_id: string;
  title: string;
  category: string;
  company_id: string | null;
  xp_reward: number | null;
  estimated_hours: string | number | null;
  active_learners: number | null;
  completions: number | null;
  avg_progress: string | number | null;
  total_hours_completed: string | number | null;
  total_xp_awarded: string | number | null;
};

const fromTable = <Row>(table: string) => learningClient.from<Row>(table as any);

const toNumber = (value: string | number | null | undefined, fallback = 0): number => {
  if (value == null) return fallback;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const mapCourse = (row: CourseRow): LearningCourse => ({
  id: row.id,
  companyId: row.company_id ?? null,
  slug: row.slug,
  title: row.title,
  description: row.description,
  category: row.category,
  levelRequirement: row.level_requirement,
  xpReward: row.xp_reward,
  estimatedHours: toNumber(row.estimated_hours),
  deliveryMode: (row.delivery_mode as LearningCourse['deliveryMode']) ?? 'self_paced',
  targetRoles: row.target_roles ?? [],
  featured: Boolean(row.featured),
  certificationCode: row.certification_code,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapModule = (row: ModuleRow): LearningModule => ({
  id: row.id,
  courseId: row.course_id,
  title: row.title,
  description: row.description,
  content: row.content,
  orderIndex: row.order_index,
  estimatedMinutes: row.estimated_minutes ?? 0,
  xpAward: row.xp_award ?? 0,
  createdAt: row.created_at,
});

const mapEnrollment = (row: EnrollmentRow): LearningEnrollment => ({
  id: row.id,
  courseId: row.course_id,
  employeeId: row.employee_id,
  status: (row.status as LearningEnrollment['status']) ?? 'in_progress',
  progressPercent: toNumber(row.progress_percent),
  hoursCompleted: toNumber(row.hours_completed),
  currentModule: row.current_module ?? 0,
  level: row.level ?? 1,
  startedAt: row.started_at,
  completedAt: row.completed_at,
  lastActivityAt: row.last_activity_at,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapProgressEvent = (row: ProgressRow): LearningProgressEvent => ({
  id: row.id,
  enrollmentId: row.enrollment_id,
  moduleId: row.module_id,
  eventType: (row.event_type as LearningProgressEvent['eventType']) ?? 'note',
  deltaProgress: toNumber(row.delta_progress),
  deltaHours: toNumber(row.delta_hours),
  note: row.note,
  createdBy: row.created_by,
  createdAt: row.created_at,
});

const mapProgressSnapshot = (row: ProgressSnapshotRow) => ({
  id: row.id,
  enrollmentId: row.enrollment_id,
  moduleId: row.module_id,
  progressPercent: toNumber(row.progress_percent),
  timeSpentMinutes: toNumber(row.time_spent_minutes),
  quizScore: row.quiz_score != null ? toNumber(row.quiz_score) : null,
  aiRecommendation: row.ai_recommendation ?? null,
  recordedAt: row.recorded_at,
  recordedBy: row.recorded_by ?? null,
  metadata: row.metadata ?? null,
});

const mapMetrics = (row: MetricsRow): LearningCourseMetrics => ({
  courseId: row.course_id,
  title: row.title,
  category: row.category,
  xpReward: row.xp_reward ?? 0,
  estimatedHours: toNumber(row.estimated_hours),
  activeLearners: row.active_learners ?? 0,
  completions: row.completions ?? 0,
  avgProgress: row.avg_progress != null ? toNumber(row.avg_progress) : null,
  totalHoursCompleted: row.total_hours_completed != null ? toNumber(row.total_hours_completed) : null,
  totalXpAwarded: row.total_xp_awarded != null ? toNumber(row.total_xp_awarded) : null,
});

function buildSlug(title: string) {
  const baseSlug = slugify(title);
  return baseSlug || `course-${Date.now()}`;
}

export async function fetchLearningCatalog(companyId: string): Promise<LearningCatalogRecord[]> {
  if (!companyId) {
    throw new Error('Company context is required to fetch the learning catalog.');
  }

  const [{ data: courseData, error: courseError }, { data: moduleData, error: moduleError }, { data: metricsData }] =
    await Promise.all([
      fromTable<CourseRow>(TABLE_COURSES)
        .select('*')
        .eq('company_id', companyId)
        .order('title', { ascending: true }),
      fromTable<ModuleRow>(TABLE_MODULES)
        .select('*')
        .eq('company_id', companyId)
        .order('order_index', { ascending: true }),
      fromTable<MetricsRow>(VIEW_METRICS).select('*').eq('company_id', companyId),
    ]);

  if (courseError) throw courseError;
  if (moduleError) throw moduleError;

  const modulesByCourse = new Map<string, LearningModule[]>();
  (moduleData ?? []).forEach((row) => {
    const mapped = mapModule(row);
    const collection = modulesByCourse.get(mapped.courseId) ?? [];
    collection.push(mapped);
    modulesByCourse.set(mapped.courseId, collection);
  });

  const metricsByCourse = new Map<string, LearningCourseMetrics>();
  (metricsData ?? []).forEach((row) => {
    const mapped = mapMetrics(row);
    metricsByCourse.set(mapped.courseId, mapped);
  });

  return (courseData ?? []).map((row) => {
    const course = mapCourse(row);
    return {
      ...course,
      modules: modulesByCourse.get(course.id) ?? [],
      metrics: metricsByCourse.get(course.id),
    };
  });
}

export async function createLearningCourse(payload: CourseCreationPayload, createdBy: string, companyId: string) {
  if (!companyId) {
    throw new Error('Company context is required to create learning courses.');
  }

  const slug = buildSlug(payload.title);

  const { data: courseRow, error: insertCourseError } = await fromTable<CourseRow>(TABLE_COURSES)
    .insert({
      slug,
      title: payload.title,
      description: payload.description ?? null,
      category: payload.category,
      level_requirement: payload.levelRequirement,
      xp_reward: payload.xpReward,
      estimated_hours: payload.estimatedHours,
      delivery_mode: payload.deliveryMode,
      target_roles: payload.targetRoles,
      featured: payload.featured ?? false,
      certification_code: payload.certificationCode ?? null,
      company_id: companyId,
      created_by: createdBy,
    })
    .select()
    .single();

  if (insertCourseError) {
    throw insertCourseError;
  }

  const modulesPayload = payload.modules.map((module, index) => ({
    course_id: courseRow.id,
    company_id: companyId,
    title: module.title,
    description: module.description ?? null,
    content: module.content ?? null,
    order_index: index + 1,
    estimated_minutes: module.estimatedMinutes,
    xp_award: module.xpAward,
  }));

  if (modulesPayload.length > 0) {
    const { error: moduleError } = await fromTable(TABLE_MODULES).insert(modulesPayload);
    if (moduleError) {
      // Attempt cleanup so admins don't see orphan course without modules
      await fromTable(TABLE_COURSES).delete().eq('id', courseRow.id);
      throw moduleError;
    }
  }

  return mapCourse(courseRow);
}

export async function enrollInCourse(courseId: string, employeeId: string, companyId: string) {
  if (!companyId) {
    throw new Error('Company context is required to enroll in a course.');
  }

  const { data, error } = await fromTable<EnrollmentRow>(TABLE_ENROLLMENTS)
    .upsert(
      {
        course_id: courseId,
        employee_id: employeeId,
        company_id: companyId,
        status: 'in_progress',
        progress_percent: 0,
        hours_completed: 0,
        current_module: 0,
        level: 1,
      },
      { onConflict: 'course_id,employee_id' },
    )
    .select()
    .single();

  if (error) throw error;
  return mapEnrollment(data);
}

export async function fetchEnrollments(employeeId: string, companyId: string): Promise<LearningEnrollment[]> {
  if (!companyId) {
    throw new Error('Company context is required to fetch enrollments.');
  }

  const { data, error } = await fromTable<EnrollmentRow>(TABLE_ENROLLMENTS)
    .select('*')
    .eq('employee_id', employeeId)
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapEnrollment);
}

export async function fetchCourseEnrollments(courseId: string, companyId: string): Promise<LearningEnrollment[]> {
  if (!companyId) {
    throw new Error('Company context is required to fetch course enrollments.');
  }

  const { data, error } = await fromTable<EnrollmentRow>(TABLE_ENROLLMENTS)
    .select('*')
    .eq('course_id', courseId)
    .eq('company_id', companyId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapEnrollment);
}

export async function recordProgressEvent(
  enrollmentId: string,
  payload: {
    moduleId?: string | null;
    eventType: LearningProgressEvent['eventType'];
    deltaProgress?: number;
    deltaHours?: number;
    note?: string;
    createdBy?: string;
  },
) {
  const { data, error } = await fromTable<ProgressRow>(TABLE_PROGRESS)
    .insert({
      enrollment_id: enrollmentId,
      module_id: payload.moduleId ?? null,
      event_type: payload.eventType,
      delta_progress: payload.deltaProgress ?? 0,
      delta_hours: payload.deltaHours ?? 0,
      note: payload.note ?? null,
      created_by: payload.createdBy ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return mapProgressEvent(data);
}

export async function updateEnrollmentProgress(
  enrollmentId: string,
  updates: Partial<Pick<LearningEnrollment, 'progressPercent' | 'hoursCompleted' | 'status' | 'currentModule' | 'level' | 'completedAt'>>,
  options: {
    recordedBy?: string | null;
    moduleId?: string | null;
    aiRecommendation?: string | null;
    quizScore?: number | null;
    timeSpentMinutes?: number | null;
    metadata?: Record<string, unknown> | null;
  } = {},
) {
  const timestamp = new Date().toISOString();
  const { data, error } = await fromTable<EnrollmentRow>(TABLE_ENROLLMENTS)
    .update({
      progress_percent: updates.progressPercent,
      hours_completed: updates.hoursCompleted,
      status: updates.status,
      current_module: updates.currentModule,
      level: updates.level,
      completed_at: updates.completedAt ?? null,
      last_activity_at: timestamp,
    })
    .eq('id', enrollmentId)
    .select()
    .single();

  if (error) throw error;

  const snapshotPayload: TablesInsert<'learning_progress'> = {
    enrollment_id: enrollmentId,
    module_id: options.moduleId ?? null,
    progress_percent: updates.progressPercent ?? toNumber(data.progress_percent),
    time_spent_minutes:
      options.timeSpentMinutes ?? Math.max(0, Math.round(toNumber(updates.hoursCompleted ?? data.hours_completed) * 60)),
    quiz_score: options.quizScore ?? null,
    ai_recommendation: options.aiRecommendation ?? null,
    recorded_at: timestamp,
    recorded_by: options.recordedBy ?? null,
    metadata: (options.metadata as any) ?? null,
  };

  try {
    await supabase.from(TABLE_PROGRESS_SNAPSHOTS as any).insert(snapshotPayload);
  } catch (snapshotError) {
    console.warn('[learning] unable to persist progress snapshot', snapshotError);
  }

  return mapEnrollment(data);
}

export async function fetchProgressEvents(enrollmentId: string): Promise<LearningProgressEvent[]> {
  const { data, error } = await fromTable<ProgressRow>(TABLE_PROGRESS)
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapProgressEvent);
}

export async function fetchProgressSnapshots(enrollmentId: string) {
  const { data, error } = await supabase
    .from(TABLE_PROGRESS_SNAPSHOTS as any)
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .order('recorded_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapProgressSnapshot);
}

export async function fetchCourseMetrics(companyId: string): Promise<LearningCourseMetrics[]> {
  if (!companyId) {
    throw new Error('Company context is required to fetch learning course metrics.');
  }

  const { data, error } = await fromTable<MetricsRow>(VIEW_METRICS)
    .select('*')
    .eq('company_id', companyId);
  if (error) throw error;
  return (data ?? []).map(mapMetrics);
}

export function buildPersonalSnapshot(enrollments: LearningEnrollment[], courses: LearningCourse[]): PersonalLearningSnapshot {
  const completed = enrollments.filter((enrollment) => enrollment.status === 'completed');
  const active = enrollments.filter((enrollment) => enrollment.status !== 'completed');

  const courseById = new Map(courses.map((course) => [course.id, course]));

  let totalXp = 0;
  completed.forEach((enrollment) => {
    const course = courseById.get(enrollment.courseId);
    if (course) {
      totalXp += course.xpReward;
    }
  });

  const totalHours = enrollments.reduce((sum, item) => sum + item.hoursCompleted, 0);
  const avgProgress =
    enrollments.length > 0
      ? enrollments.reduce((sum, item) => sum + item.progressPercent, 0) / enrollments.length
      : 0;

  return {
    activeEnrollments: active,
    completedEnrollments: completed,
    totalHours,
    totalXpEarned: totalXp,
    averageProgress: avgProgress,
  };
}

export async function ensureCourseCompletionRewards(
  enrollment: LearningEnrollment,
  course: LearningCourse,
  options: { employeeId: string; awardingProfileId?: string; roleHint?: string },
) {
  if (course.xpReward <= 0 && !course.certificationCode) {
    return;
  }

  const role = options.roleHint ?? course.targetRoles[0] ?? 'staff';

  if (course.xpReward > 0) {
    const { data: existingSkill } = await learningClient
      .from('skill_matrix')
      .select('id, xp, level')
      .eq('employee_id', options.employeeId)
      .eq('role', role)
      .maybeSingle();

    const nextXp = (existingSkill?.xp ?? 0) + course.xpReward;
    const nextLevel = Math.max(existingSkill?.level ?? 1, 1);

    if (existingSkill?.id) {
      await learningClient
        .from('skill_matrix')
        .update({ xp: nextXp, level: nextLevel })
        .eq('id', existingSkill.id);
    } else {
      await learningClient.from('skill_matrix').insert({
        employee_id: options.employeeId,
        role,
        xp: nextXp,
        level: nextLevel,
      });
    }
  }

  if (course.certificationCode) {
    const { data: existingBadge } = await learningClient
      .from('employee_badge')
      .select('id')
      .eq('employee_id', options.employeeId)
      .eq('badge_code', course.certificationCode)
      .maybeSingle();

    if (!existingBadge) {
      await learningClient.from('employee_badge').insert({
        employee_id: options.employeeId,
        badge_code: course.certificationCode,
        awarded_by: options.awardingProfileId ?? null,
        reason: `Completed ${course.title}`,
      });
    }
  }
}

export async function completeEnrollment(
  enrollment: LearningEnrollment,
  course: LearningCourse,
  options: { employeeId: string; awardingProfileId?: string; roleHint?: string },
) {
  const updated = await updateEnrollmentProgress(enrollment.id, {
    status: 'completed',
    progressPercent: 100,
    completedAt: new Date().toISOString(),
  });

  await recordProgressEvent(enrollment.id, {
    eventType: 'completed',
    deltaProgress: Math.max(0, 100 - enrollment.progressPercent),
    deltaHours: Math.max(0, course.estimatedHours - enrollment.hoursCompleted),
    note: `Course completed via Learning Center`,
    createdBy: options.awardingProfileId,
  });

  await ensureCourseCompletionRewards(updated, course, options);

  toast({
    title: 'Course completed',
    description: `${course.title} marked as complete.`,
  });

  return updated;
}

const recommendationLimit = 4;

function buildCourseRecommendations(
  courses: LearningCatalogRecord[],
  enrollments: LearningEnrollment[],
  metrics: LearningCourseMetrics[],
  options: { role?: string | null; xp?: number },
): CourseRecommendation[] {
  const alreadyEnrolled = new Set(enrollments.map((enrollment) => enrollment.courseId));
  const metricsById = new Map(metrics.map((metric) => [metric.courseId, metric]));

  const base = courses
    .filter((course) => !alreadyEnrolled.has(course.id))
    .map((course) => {
      const metric = metricsById.get(course.id);
      let confidence = 0.5;
      let reason = 'Course aligns with your development pathway';
      let source: CourseRecommendation['source'] = 'copilot';

      if (options.role && course.targetRoles.includes(options.role)) {
        confidence += 0.25;
        reason = `Popular for the ${options.role} pathway`;
      }

      if (options.xp != null && options.xp < course.xpReward) {
        confidence += 0.1;
        source = 'xp_gap';
        reason = 'High XP reward to accelerate progression';
      }

      if (course.certificationCode) {
        confidence += 0.15;
        source = 'certification_path';
        reason = 'Unlocks certification on completion';
      }

      if (metric?.completions) {
        confidence += Math.min(0.1, metric.completions / 100);
      }

      return {
        courseId: course.id,
        reason,
        confidence: Math.min(0.95, confidence),
        source,
      };
    })
    .sort((a, b) => b.confidence - a.confidence);

  return base.slice(0, recommendationLimit);
}

export async function getCourseRecommendations(options: {
  employeeId: string;
  companyId: string;
  role?: string | null;
  currentXp?: number;
}) {
  const [catalog, enrollments, metrics] = await Promise.all([
    fetchLearningCatalog(options.companyId),
    fetchEnrollments(options.employeeId, options.companyId),
    fetchCourseMetrics(options.companyId),
  ]);

  const recommendations = buildCourseRecommendations(catalog, enrollments, metrics, {
    role: options.role,
    xp: options.currentXp,
  });

  return {
    courses: catalog,
    enrollments,
    metrics,
    recommendations,
  };
}

export function calculateCourseWorkload(modules: CourseModuleInput[]): {
  totalMinutes: number;
  totalXp: number;
} {
  return modules.reduce(
    (acc, module) => {
      acc.totalMinutes += module.estimatedMinutes;
      acc.totalXp += module.xpAward;
      return acc;
    },
    { totalMinutes: 0, totalXp: 0 },
  );
}

export function deriveCourseRecommendations(
  courses: LearningCatalogRecord[],
  enrollments: LearningEnrollment[],
  metrics: LearningCourseMetrics[],
  options: { role?: string | null; xp?: number },
): CourseRecommendation[] {
  return buildCourseRecommendations(courses, enrollments, metrics, options);
}
