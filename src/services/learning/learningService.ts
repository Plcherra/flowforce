import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

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
  ModuleAsset,
  PersonalLearningSnapshot,
} from '@/types/learning';
import { slugify } from '@/utils/slugify';

const TABLE_COURSES = 'learning_courses';
const TABLE_MODULES = 'learning_modules';
const TABLE_ENROLLMENTS = 'learning_enrollments';
const TABLE_PROGRESS = 'learning_progress_events';
const TABLE_PROGRESS_SNAPSHOTS = 'learning_progress';
const VIEW_METRICS = 'learning_course_metrics';
const DEFAULT_EVENT_LIMIT = 50;
const DEFAULT_SNAPSHOT_LIMIT = 25;

const nullableNumericLike = z.union([z.number(), z.string()]).nullable();

const courseRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  category: z.string(),
  company_id: z.string().nullable(),
  level_requirement: z.number(),
  xp_reward: z.number(),
  estimated_hours: nullableNumericLike.optional(),
  delivery_mode: z.string(),
  target_roles: z.array(z.string()).nullable(),
  featured: z.boolean().nullable(),
  certification_code: z.string().nullable(),
  certification_id: z.string().nullable(),
  role_unlock: z.array(z.string()).nullable(),
  auto_schedule_eligible: z.boolean().nullable(),
  created_by: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

type CourseRow = z.infer<typeof courseRowSchema>;

const moduleRowSchema = z.object({
  id: z.string(),
  course_id: z.string(),
  company_id: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  content: z.string().nullable(),
  order_index: z.number(),
  estimated_minutes: nullableNumericLike.optional(),
  xp_award: nullableNumericLike.optional(),
  created_at: z.string(),
});

type ModuleRow = z.infer<typeof moduleRowSchema>;

const enrollmentRowSchema = z.object({
  id: z.string(),
  course_id: z.string(),
  employee_id: z.string(),
  company_id: z.string().nullable(),
  status: z.string(),
  progress_percent: nullableNumericLike.optional(),
  hours_completed: nullableNumericLike.optional(),
  current_module: z.number().nullable(),
  level: z.number().nullable(),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  last_activity_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

type EnrollmentRow = z.infer<typeof enrollmentRowSchema>;

const progressRowSchema = z.object({
  id: z.string(),
  enrollment_id: z.string(),
  module_id: z.string().nullable(),
  event_type: z.string(),
  delta_progress: nullableNumericLike.optional(),
  delta_hours: nullableNumericLike.optional(),
  note: z.string().nullable(),
  created_by: z.string().nullable(),
  created_at: z.string(),
});

type ProgressRow = z.infer<typeof progressRowSchema>;

const progressSnapshotRowSchema = z.object({
  id: z.string(),
  enrollment_id: z.string(),
  module_id: z.string().nullable(),
  progress_percent: z.number(),
  time_spent_minutes: z.number(),
  quiz_score: z.number().nullable(),
  ai_recommendation: z.string().nullable(),
  recorded_at: z.string(),
  recorded_by: z.string().nullable(),
  metadata: z.unknown().nullable(),
});

type ProgressSnapshotRow = z.infer<typeof progressSnapshotRowSchema>;

const metricsRowSchema = z.object({
  course_id: z.string(),
  title: z.string(),
  category: z.string(),
  company_id: z.string().nullable(),
  xp_reward: z.number().nullable(),
  estimated_hours: nullableNumericLike.optional(),
  active_learners: z.number().nullable(),
  completions: z.number().nullable(),
  avg_progress: nullableNumericLike.optional(),
  total_hours_completed: nullableNumericLike.optional(),
  total_xp_awarded: nullableNumericLike.optional(),
});

type MetricsRow = z.infer<typeof metricsRowSchema>;

const fromTable = <Row>(table: string) => learningClient.from<Row>(table as any);

const parseWithSchema = <Schema extends z.ZodTypeAny>(schema: Schema, payload: unknown, context: string) => {
  const result = schema.safeParse(payload);
  if (!result.success) {
    console.error(`[learning] Invalid payload for ${context}`, result.error.flatten());
    throw new Error(`Learning data for ${context} is malformed.`);
  }
  return result.data;
};

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
  certificationId: row.certification_id ?? null,
  roleUnlock: row.role_unlock ?? [],
  autoScheduleEligible: Boolean(row.auto_schedule_eligible),
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapModule = (row: ModuleRow): LearningModule => {
  let moduleType: string | null = null;
  let assets: ModuleAsset[] | null = null;
  let metadata: Record<string, unknown> | null = null;

  if (row.content) {
    try {
      const parsed = JSON.parse(row.content);
      if (typeof parsed === 'object' && parsed !== null) {
        metadata = parsed as Record<string, unknown>;
        if (typeof (parsed as any).type === 'string') {
          moduleType = (parsed as any).type;
        }
        if (Array.isArray((parsed as any).assets)) {
          assets = (parsed as any).assets
            .map((asset: any) => {
              if (!asset || typeof asset !== 'object') return null;
              return {
                name: typeof asset.name === 'string' ? asset.name : 'Attachment',
                size: typeof asset.size === 'number' ? asset.size : undefined,
                type: typeof asset.type === 'string' ? asset.type : undefined,
                url: typeof asset.url === 'string' ? asset.url : undefined,
              };
            })
            .filter(Boolean) as ModuleAsset[];
        }
      }
    } catch (error) {
      console.warn('Unable to parse module content metadata', error);
    }
  }

  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    content: row.content,
    moduleType,
    assets,
    metadata,
    orderIndex: row.order_index,
    estimatedMinutes: row.estimated_minutes ?? 0,
    xpAward: row.xp_award ?? 0,
    createdAt: row.created_at,
  };
};

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

const progressHistoryResponseSchema = z.object({
  events: z.array(progressRowSchema),
  eventCursor: z.string().nullable(),
  snapshots: z.array(progressSnapshotRowSchema),
  snapshotCursor: z.string().nullable(),
});

export type ProgressHistoryPage = {
  events: LearningProgressEvent[];
  eventCursor: string | null;
  snapshots: LearningProgressSnapshot[];
  snapshotCursor: string | null;
};

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

  const courseRows = parseWithSchema(courseRowSchema.array(), courseData ?? [], TABLE_COURSES);
  const moduleRows = parseWithSchema(moduleRowSchema.array(), moduleData ?? [], TABLE_MODULES);
  const metricsRows = parseWithSchema(metricsRowSchema.array(), metricsData ?? [], VIEW_METRICS);

  const modulesByCourse = new Map<string, LearningModule[]>();
  moduleRows.forEach((row) => {
    const mapped = mapModule(row);
    const collection = modulesByCourse.get(mapped.courseId) ?? [];
    collection.push(mapped);
    modulesByCourse.set(mapped.courseId, collection);
  });

  const metricsByCourse = new Map<string, LearningCourseMetrics>();
  metricsRows.forEach((row) => {
    const mapped = mapMetrics(row);
    metricsByCourse.set(mapped.courseId, mapped);
  });

  return courseRows.map((row) => {
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
      role_unlock: payload.roleUnlock ?? [],
      featured: payload.featured ?? false,
      certification_code: payload.certificationCode ?? null,
      certification_id: payload.certificationId ?? null,
      auto_schedule_eligible: payload.autoScheduleEligible ?? false,
      company_id: companyId,
      created_by: createdBy,
    })
    .select()
    .single();

  if (insertCourseError) {
    throw insertCourseError;
  }
  const courseRecord = parseWithSchema(courseRowSchema, courseRow, TABLE_COURSES);

  const serializeModuleContent = (module: CourseModuleInput) => {
    if (typeof module.content === 'string') {
      return module.content;
    }
    if (module.content && typeof module.content === 'object') {
      return JSON.stringify(module.content);
    }
    if (module.moduleType || (module.assets && module.assets.length > 0)) {
      return JSON.stringify({ type: module.moduleType, assets: module.assets });
    }
    return null;
  };

  const modulesPayload = payload.modules.map((module, index) => ({
    course_id: courseRecord.id,
    company_id: companyId,
    title: module.title,
    description: module.description ?? null,
    content: serializeModuleContent(module),
    order_index: index + 1,
    estimated_minutes: module.estimatedMinutes,
    xp_award: module.xpAward,
  }));

  if (modulesPayload.length > 0) {
    const { error: moduleError } = await fromTable(TABLE_MODULES).insert(modulesPayload);
    if (moduleError) {
      // Attempt cleanup so admins don't see orphan course without modules
      await fromTable(TABLE_COURSES).delete().eq('id', courseRecord.id);
      throw moduleError;
    }
  }

  return mapCourse(courseRecord);
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
  const row = parseWithSchema(enrollmentRowSchema, data, TABLE_ENROLLMENTS);
  return mapEnrollment(row);
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
  const rows = parseWithSchema(enrollmentRowSchema.array(), data ?? [], TABLE_ENROLLMENTS);
  return rows.map(mapEnrollment);
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
  const rows = parseWithSchema(enrollmentRowSchema.array(), data ?? [], TABLE_ENROLLMENTS);
  return rows.map(mapEnrollment);
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
  const row = parseWithSchema(progressRowSchema, data, TABLE_PROGRESS);
  return mapProgressEvent(row);
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
  const row = parseWithSchema(enrollmentRowSchema, data, TABLE_ENROLLMENTS);

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

  return mapEnrollment(row);
}

export async function fetchProgressEvents(
  enrollmentId: string,
  options: { limit?: number } = {},
): Promise<LearningProgressEvent[]> {
  let query = fromTable<ProgressRow>(TABLE_PROGRESS)
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .order('created_at', { ascending: false });

  query = query.limit(options.limit ?? DEFAULT_EVENT_LIMIT);

  const { data, error } = await query;

  if (error) throw error;
  const rows = parseWithSchema(progressRowSchema.array(), data ?? [], TABLE_PROGRESS);
  return rows.map(mapProgressEvent);
}

export async function fetchProgressSnapshots(enrollmentId: string, options: { limit?: number } = {}) {
  let query = supabase
    .from(TABLE_PROGRESS_SNAPSHOTS as any)
    .select('*')
    .eq('enrollment_id', enrollmentId)
    .order('recorded_at', { ascending: false });

  query = query.limit(options.limit ?? DEFAULT_SNAPSHOT_LIMIT);

  const { data, error } = await query;

  if (error) throw error;
  const rows = parseWithSchema(progressSnapshotRowSchema.array(), data ?? [], TABLE_PROGRESS_SNAPSHOTS);
  return rows.map(mapProgressSnapshot);
}

export async function fetchProgressHistoryPage(params: {
  enrollmentId: string;
  eventCursor?: string | null;
  snapshotCursor?: string | null;
  eventLimit?: number;
  snapshotLimit?: number;
}): Promise<ProgressHistoryPage> {
  const { data, error } = await supabase.functions.invoke('learning-progress-history', {
    body: {
      enrollmentId: params.enrollmentId,
      eventCursor: params.eventCursor ?? undefined,
      snapshotCursor: params.snapshotCursor ?? undefined,
      eventLimit: params.eventLimit,
      snapshotLimit: params.snapshotLimit,
    },
  });

  if (error) {
    throw new Error(error.message ?? 'Unable to load progress history.');
  }

  const parsed = progressHistoryResponseSchema.safeParse(data);
  if (!parsed.success) {
    console.error('[learning] Invalid progress history payload', parsed.error.flatten());
    throw new Error('Malformed progress history response.');
  }

  return {
    events: parsed.data.events.map(mapProgressEvent),
    snapshots: parsed.data.snapshots.map(mapProgressSnapshot),
    eventCursor: parsed.data.eventCursor,
    snapshotCursor: parsed.data.snapshotCursor,
  };
}

export async function fetchCourseMetrics(companyId: string): Promise<LearningCourseMetrics[]> {
  if (!companyId) {
    throw new Error('Company context is required to fetch learning course metrics.');
  }

  const { data, error } = await fromTable<MetricsRow>(VIEW_METRICS)
    .select('*')
    .eq('company_id', companyId);
  if (error) throw error;
  const rows = parseWithSchema(metricsRowSchema.array(), data ?? [], VIEW_METRICS);
  return rows.map(mapMetrics);
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

export async function recordCourseCompletionMetadata(
  course: LearningCatalogRecord,
  options: { companyId: string; employeeId: string; awardingProfileId?: string | null },
) {
  if (!options.companyId) {
    throw new Error('Company context is required to record course completion metadata.');
  }

  const { data: completionRow, error: completionLookupError } = await learningClient
    .from('learning_completions')
    .select('id')
    .eq('employee_id', options.employeeId)
    .eq('course_id', course.id)
    .eq('company_id', options.companyId)
    .maybeSingle();

  if (completionLookupError) throw completionLookupError;

  if (!completionRow) {
    const { error: completionInsertError } = await learningClient.from('learning_completions').insert({
      employee_id: options.employeeId,
      company_id: options.companyId,
      course_id: course.id,
      xp_earned: course.xpReward ?? 0,
      passed: true,
      certification_awarded: course.certificationId ?? null,
    });

    if (completionInsertError) throw completionInsertError;
  }

  if (course.certificationId) {
    const { error: certificationError } = await learningClient
      .from('employee_certifications')
      .upsert(
        {
          employee_id: options.employeeId,
          certification_id: course.certificationId,
          awarded_by: options.awardingProfileId ?? null,
        },
        { onConflict: 'employee_id,certification_id' },
      );

    if (certificationError) throw certificationError;
  }

  const profileUpdates: Record<string, unknown> = {};
  if (course.roleUnlock && course.roleUnlock.length > 0) {
    profileUpdates.role = course.roleUnlock[0];
  }
  if (course.autoScheduleEligible) {
    profileUpdates.eligible_for_schedule = true;
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileError } = await learningClient
      .from('profiles')
      .update(profileUpdates)
      .eq('id', options.employeeId);

    if (profileError) throw profileError;
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
