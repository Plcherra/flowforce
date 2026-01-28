export type EmployeeReportCategory =
  | "performance"
  | "attendance"
  | "behavior"
  | "customer";

export interface EmployeeReport {
  id: string;
  employeeId: string;
  date: string;
  category: EmployeeReportCategory;
  severity: number;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeReportSummary {
  employeeId: string;
  weekStart: string;
  summaryText: string;
  generatedAt: string;
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

export interface BadgeCatalogEntry {
  id: string;
  code: string;
  title: string;
  description: string | null;
  role: string | null;
  minLevel: number | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeBadge {
  id: string;
  employeeId: string;
  badgeCode: string;
  awardedAt: string;
  awardedBy: string | null;
  reason: string | null;
  createdAt: string;
}

export type PromotionStatus = "pending" | "approved" | "rejected";

export interface PromotionProposal {
  id: string;
  employeeId: string;
  proposedRole: string;
  proposedLevel: number;
  rationale: string | null;
  status: PromotionStatus;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
