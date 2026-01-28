export type AvailabilityLockMode = "auto" | "open" | "lock";

export type AvailabilityRequestStatus = "pending" | "approved" | "denied";

export interface OrgPrefs {
  id: string;
  availabilityLockMode: AvailabilityLockMode;
  autoLockDayOfWeek: number;
  autoLockHour: number;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityRequest {
  id: string;
  employeeId: string;
  weekStart: string;
  payload: Record<string, unknown>;
  status: AvailabilityRequestStatus;
  managerId: string | null;
  decisionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityException {
  id: string;
  employeeId: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilityAuditLog {
  id: string;
  actorId: string;
  action: string;
  entity: string;
  entityId: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface AvailabilityRequestInput {
  employeeId: string;
  weekStart: string;
  payload: Record<string, unknown>;
}

export interface AvailabilityExceptionInput {
  employeeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface AvailabilityLockConfig {
  lockMode: AvailabilityLockMode;
  autoLockDayOfWeek: number;
  autoLockHour: number;
}
