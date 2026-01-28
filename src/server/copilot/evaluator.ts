import type { Tables } from "../../integrations/supabase/public-types";

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

type CertificationStatus = Tables<"certification_progress">["status"];

export interface CertificationSummary {
  code: string;
  status: CertificationStatus;
  achievedAt: string | null;
  badgeCode: string | null;
  title: string | null;
}

export interface EmployeeReport {
  id: string;
  employeeId: string;
  date: string;
  category: string;
  severity: number;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SkillMatrixEntry {
  id: string;
  employeeId: string;
  role: string;
  level: number;
  xp: number;
  lastReview: string | null;
  createdAt: string;
  updatedAt: string;
}

const POSITIVE_SEVERITY = 4;
const MS_PER_DAY = 86_400_000;

const isWithinDays = (dateISO: string, days: number, now = new Date()) => {
  const date = new Date(dateISO);
  if (Number.isNaN(date.getTime())) return false;
  const diff = now.getTime() - date.getTime();
  return diff >= 0 && diff <= days * MS_PER_DAY;
};

export function evaluateEmployeeContext(
  context: EmployeeContext,
  now: Date = new Date(),
): CopilotDecision {
  const badges: BadgeSuggestion[] = [];
  const skillUpdates: SkillUpdate[] = [];
  const coachingNotes: string[] = [];
  let promotion: PromotionSuggestion | null = null;

  const {
    reports = [],
    performance = [],
    skills = [],
    profile,
    certifications = [],
    awardedBadges = [],
  } = context;

  const positivePerformanceReports = reports.filter(
    (report) =>
      report.category === "performance" &&
      report.severity >= POSITIVE_SEVERITY &&
      isWithinDays(report.date, 30, now),
  );

  const noShowCount = performance.filter(
    (entry) =>
      entry.attendanceStatus === "absent" && isWithinDays(entry.date, 30, now),
  ).length;

  if (positivePerformanceReports.length >= 3 && noShowCount === 0) {
    badges.push({
      badgeCode: "CONSISTENCY_STAR",
      reason: `${positivePerformanceReports.length} positive performance reports in the last month with zero no-shows`,
      confidence: Math.min(1, positivePerformanceReports.length / 5),
    });
  }

  const mentorShiftCount = performance.filter(
    (entry) =>
      entry.role?.toLowerCase().includes("mentor") &&
      entry.attendanceStatus === "present" &&
      isWithinDays(entry.date, 90, now),
  ).length;
  if (mentorShiftCount >= 10) {
    badges.push({
      badgeCode: "MENTOR",
      reason: `Completed ${mentorShiftCount} mentor shifts`,
      confidence: Math.min(1, mentorShiftCount / 12),
    });
  }

  const lateCount14 = performance.filter(
    (entry) =>
      entry.attendanceStatus === "late" && isWithinDays(entry.date, 14, now),
  ).length;
  if (lateCount14 >= 2) {
    skillUpdates.push({
      role: profile.role ?? "general",
      deltaXP: -20,
      note: "Attendance issues: 2+ late arrivals in the last 14 days.",
    });
    coachingNotes.push(
      "Coach employee on punctuality (2+ lates in two weeks).",
    );
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
      report.category === "customer" &&
      report.severity >= POSITIVE_SEVERITY &&
      isWithinDays(report.date, 30, now),
  ).length;
  const lateCount30 = performance.filter(
    (entry) =>
      entry.attendanceStatus === "late" && isWithinDays(entry.date, 30, now),
  ).length;

  const reliabilityHigh = noShowCount === 0 && lateCount30 <= 1;

  const promotableSkill = skills.find((skill) => skill.level >= 3);

  if (promotableSkill && reliabilityHigh && customerPositive >= 2) {
    const currentRole = promotableSkill.role;
    const proposedRole =
      currentRole.toLowerCase() === "barista"
        ? "Shift Lead"
        : `Senior ${currentRole}`;
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
        cert.status === "earned" &&
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

export default {
  evaluateEmployeeContext,
};
