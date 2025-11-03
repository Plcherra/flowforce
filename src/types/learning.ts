export type LearningDeliveryMode = 'self_paced' | 'live' | 'blended';

export interface LearningCourse {
  id: string;
  companyId: string | null;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  levelRequirement: number;
  xpReward: number;
  estimatedHours: number;
  deliveryMode: LearningDeliveryMode;
  targetRoles: string[];
  featured: boolean;
  certificationCode: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LearningModule {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  content: string | null;
  orderIndex: number;
  estimatedMinutes: number;
  xpAward: number;
  createdAt: string;
}

export interface LearningEnrollment {
  id: string;
  courseId: string;
  employeeId: string;
  status: 'in_progress' | 'completed' | 'withdrawn';
  progressPercent: number;
  hoursCompleted: number;
  currentModule: number;
  level: number;
  startedAt: string;
  completedAt: string | null;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningProgressEvent {
  id: string;
  enrollmentId: string;
  moduleId: string | null;
  eventType: 'started' | 'module_completed' | 'checkpoint' | 'completed' | 'note';
  deltaProgress: number;
  deltaHours: number;
  note: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface LearningProgressSnapshot {
  id: string;
  enrollmentId: string;
  moduleId: string | null;
  progressPercent: number;
  timeSpentMinutes: number;
  quizScore: number | null;
  aiRecommendation: string | null;
  recordedAt: string;
  recordedBy: string | null;
  metadata: Record<string, unknown> | null;
}

export interface LearningCourseMetrics {
  courseId: string;
  title: string;
  category: string;
  xpReward: number;
  estimatedHours: number;
  activeLearners: number;
  completions: number;
  avgProgress: number | null;
  totalHoursCompleted: number | null;
  totalXpAwarded: number | null;
}

export interface CourseModuleInput {
  title: string;
  description?: string;
  estimatedMinutes: number;
  xpAward: number;
  content?: string;
}

export interface CourseCreationPayload {
  title: string;
  description?: string;
  category: string;
  levelRequirement: number;
  xpReward: number;
  estimatedHours: number;
  deliveryMode: LearningDeliveryMode;
  targetRoles: string[];
  featured?: boolean;
  certificationCode?: string | null;
  modules: CourseModuleInput[];
}

export interface CourseRecommendation {
  courseId: string;
  reason: string;
  confidence: number;
  source: 'copilot' | 'xp_gap' | 'certification_path';
}

export interface LearningCatalogRecord extends LearningCourse {
  modules: LearningModule[];
  metrics?: LearningCourseMetrics;
}

export interface PersonalLearningSnapshot {
  activeEnrollments: LearningEnrollment[];
  completedEnrollments: LearningEnrollment[];
  totalHours: number;
  totalXpEarned: number;
  averageProgress: number;
}
