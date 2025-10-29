import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/public-types';
import type { EmployeeReport, SkillMatrixEntry } from '@/types/people';

dayjs.extend(relativeTime);
dayjs.extend(isSameOrAfter);

export interface BadgeSuggestion {
  badgeCode: string;
  reason: string;
  confidence: number;
}

export interface SkillUpdate {
  role: string;
  deltaXP: number;
  levelUp?: boolean;
  newLevel?: number;
  note?: string;
}

export interface PromotionSuggestion {
  role: string;
  level: number;
  rationale: string;
  confidence: number;
}

export interface CopilotDecision {
  badges: BadgeSuggestion[];
  skillUpdates: SkillUpdate[];
  promotion?: PromotionSuggestion | null;
  coachingNotes?: string[];
}

export interface EmployeeContext {
  profile: {
    id: string;
    role: string | null;
    firstName?: string | null;
    lastName?: string | null;
  };
  reports: EmployeeReport[];
  skills: SkillMatrixEntry[];
  performance: StaffPerformanceEntry[];
  certifications: CertificationSummary[];
  awardedBadges: string[];
}

export interface StaffPerformanceEntry {
  date: string;
  attendanceStatus: string | null;
  role: string | null;
  hoursWorked?: number | null;
}

type CertificationStatus = Tables<'certification_progress'>['status'];

export interface CertificationSummary {
  code: string;
  status: CertificationStatus;
  achievedAt: string | null;
  badgeCode: string | null;
  title: string | null;
}

const POSITIVE_SEVERITY = 4;

const isWithinDays = (dateISO: string, days: number, now = dayjs()) =>
  dayjs(dateISO).isSameOrAfter(now.subtract(days, 'day'), 'day');

export function evaluateEmployeeContext(context: EmployeeContext, now = dayjs()): CopilotDecision {
  const badges: BadgeSuggestion[] = [];
  const skillUpdates: SkillUpdate[] = [];
  const coachingNotes: string[] = [];
  let promotion: PromotionSuggestion | null = null;

  const { reports, performance, skills, profile, certifications, awardedBadges } = context;

  const positivePerformanceReports = reports.filter(
    (report) =>
      report.category === 'performance' &&
      report.severity >= POSITIVE_SEVERITY &&
      isWithinDays(report.date, 30, now),
  );

  const noShowCount = performance.filter(
    (entry) => entry.attendanceStatus === 'absent' && isWithinDays(entry.date, 30, now),
  ).length;

  if (positivePerformanceReports.length >= 3 && noShowCount === 0) {
    badges.push({
      badgeCode: 'CONSISTENCY_STAR',
      reason: `${positivePerformanceReports.length} positive performance reports in the last month with zero no-shows`,
      confidence: Math.min(1, positivePerformanceReports.length / 5),
    });
  }

  const mentorShiftCount = performance.filter(
    (entry) =>
      entry.role?.toLowerCase().includes('mentor') &&
      entry.attendanceStatus === 'present' &&
      isWithinDays(entry.date, 90, now),
  ).length;
  if (mentorShiftCount >= 10) {
    badges.push({
      badgeCode: 'MENTOR',
      reason: `Completed ${mentorShiftCount} mentor shifts`,
      confidence: Math.min(1, mentorShiftCount / 12),
    });
  }

  const lateCount14 = performance.filter(
    (entry) => entry.attendanceStatus === 'late' && isWithinDays(entry.date, 14, now),
  ).length;
  if (lateCount14 >= 2) {
    skillUpdates.push({
      role: profile.role ?? 'general',
      deltaXP: -20,
      note: 'Attendance issues: 2+ late arrivals in the last 14 days.',
    });
    coachingNotes.push('Coach employee on punctuality (2+ lates in two weeks).');
  }

  skills.forEach((skill) => {
    const expectedLevel = Math.floor(skill.xp / 100) + 1;
    if (expectedLevel > skill.level) {
      skillUpdates.push({
        role: skill.role,
        deltaXP: 0,
        levelUp: true,
        newLevel: expectedLevel,
        note: `XP ${skill.xp} exceeds threshold for level ${expectedLevel}.`,
      });
    }
  });

  const customerPositive = reports.filter(
    (report) =>
      report.category === 'customer' &&
      report.severity >= POSITIVE_SEVERITY &&
      isWithinDays(report.date, 30, now),
  ).length;
  const lateCount30 = performance.filter(
    (entry) => entry.attendanceStatus === 'late' && isWithinDays(entry.date, 30, now),
  ).length;

  const reliabilityHigh = noShowCount === 0 && lateCount30 <= 1;

  const promotableSkill = skills.find((skill) => skill.level >= 3);

  if (promotableSkill && reliabilityHigh && customerPositive >= 2) {
    const currentRole = promotableSkill.role;
    const proposedRole = currentRole.toLowerCase() === 'barista' ? 'Shift Lead' : `Senior ${currentRole}`;
    promotion = {
      role: proposedRole,
      level: promotableSkill.level + 1,
      rationale: `Strong reliability and customer feedback (≥2 positives). Current level ${promotableSkill.level}.`,
      confidence: 0.75,
    };
  }

  certifications
    .filter(
      (cert) =>
        cert.status === 'earned' &&
        cert.badgeCode &&
        !awardedBadges.includes(cert.badgeCode) &&
        !badges.some((suggestion) => suggestion.badgeCode === cert.badgeCode),
    )
    .forEach((cert) => {
      badges.push({
        badgeCode: cert.badgeCode as string,
        reason: `Certification ${cert.title ?? cert.code} completed`,
        confidence: 1,
      });
    });

  return {
    badges,
    skillUpdates,
    promotion,
    coachingNotes: coachingNotes.length > 0 ? coachingNotes : undefined,
  };
}

export async function evaluateEmployee(employeeId: string): Promise<CopilotDecision> {
  const now = dayjs();

  const [
    profileResult,
    reportsResult,
    skillsResult,
    performanceResult,
    certificationResult,
    badgeResult,
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, role, first_name, last_name')
      .eq('id', employeeId)
      .maybeSingle(),
    supabase
      .from('employee_report')
      .select('id, employee_id, date, category, severity, notes, created_by, created_at, updated_at')
      .eq('employee_id', employeeId)
      .gte('date', now.subtract(120, 'day').format('YYYY-MM-DD')),
    supabase
      .from('skill_matrix')
      .select('id, employee_id, role, level, xp, last_review, created_at, updated_at')
      .eq('employee_id', employeeId),
    supabase
      .from('staff_performance')
      .select('date, attendance_status, role, hours_worked')
      .eq('user_id', employeeId)
      .gte('date', now.subtract(120, 'day').format('YYYY-MM-DD')),
    supabase
      .from('certification_progress')
      .select('certification_code, status, achieved_at, certification:certification_catalog(badge_code, title)')
      .eq('employee_id', employeeId),
    supabase
      .from('employee_badge')
      .select('badge_code')
      .eq('employee_id', employeeId),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (!profileResult.data) throw new Error('Employee profile not found');
  if (reportsResult.error) throw reportsResult.error;
  if (skillsResult.error) throw skillsResult.error;
  if (performanceResult.error) throw performanceResult.error;
  if (certificationResult.error) throw certificationResult.error;
  if (badgeResult.error) throw badgeResult.error;

  const context: EmployeeContext = {
    profile: {
      id: profileResult.data.id,
      role: profileResult.data.role,
      firstName: profileResult.data.first_name,
      lastName: profileResult.data.last_name,
    },
    reports: (reportsResult.data ?? []).map((row) => ({
      id: row.id,
      employeeId: row.employee_id,
      date: row.date,
      category: row.category as EmployeeReport['category'],
      severity: row.severity,
      notes: row.notes ?? null,
      createdBy: row.created_by,
      createdAt: row.created_at ?? '',
      updatedAt: row.updated_at ?? '',
    })),
    skills: (skillsResult.data ?? []).map((row) => ({
      id: row.id,
      employeeId: row.employee_id,
      role: row.role,
      level: row.level,
      xp: row.xp,
      lastReview: row.last_review ?? null,
      createdAt: row.created_at ?? '',
      updatedAt: row.updated_at ?? '',
    })),
    performance: (performanceResult.data ?? []).map((row) => ({
      date: row.date,
      attendanceStatus: row.attendance_status,
      role: row.role,
      hoursWorked: row.hours_worked ?? null,
    })),
    certifications: (certificationResult.data ?? []).map((row) => {
      const typedRow = row as Tables<'certification_progress'> & {
        certification: Pick<Tables<'certification_catalog'>, 'badge_code' | 'title'> | null;
      };
      return {
        code: typedRow.certification_code,
        status: typedRow.status as CertificationStatus,
        achievedAt: typedRow.achieved_at ?? null,
        badgeCode: typedRow.certification?.badge_code ?? null,
        title: typedRow.certification?.title ?? null,
      };
    }),
    awardedBadges: (badgeResult.data ?? []).map((row) => row.badge_code),
  };

  return evaluateEmployeeContext(context, now);
}

export default {
  evaluateEmployee,
  evaluateEmployeeContext,
};
