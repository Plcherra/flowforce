/**
 * Types for employee invites
 */

import type { PermissionDiffMap } from "@/features/roles/constants/personAccessDiffs";

export type InviteRecord = {
  id: string;
  email: string;
  role: string | null;
  inviteToken: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
};

export type InvitePersonCard = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleId: string;
  locationId: string;
  departmentId: string;
  permissionOverrides: PermissionDiffMap;
};

export type SingleInviteForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleId: string;
  locationId: string;
  departmentId: string;
  permissionOverrides: PermissionDiffMap;
};

export type BulkInviteRow = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  className: string;
  locationName: string;
  departmentName: string;
};

export type BulkInviteResult = {
  email: string;
  status: "success" | "error";
  message?: string;
  inviteLink?: string;
  onboardingTriggered?: boolean;
};

export const createInvitePersonCard = (
  roleId = "",
): InvitePersonCard => ({
  id: `invite-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  roleId,
  locationId: "",
  departmentId: "",
  permissionOverrides: {},
});

export const DEFAULT_SINGLE_INVITE: SingleInviteForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  roleId: "",
  locationId: "",
  departmentId: "",
  permissionOverrides: {},
};
