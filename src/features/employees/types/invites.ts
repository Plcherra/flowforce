/**
 * Types for employee invites
 */

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

export type SingleInviteForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  role: "employee" | "manager" | "admin";
};

export type BulkInviteRow = {
  email: string;
  firstName: string;
  lastName: string;
  role: "employee" | "manager" | "admin";
};

export type BulkInviteResult = {
  email: string;
  status: "success" | "error";
  message?: string;
  inviteLink?: string;
  onboardingTriggered?: boolean;
};

export const DEFAULT_SINGLE_INVITE: SingleInviteForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  birthDate: "",
  role: "employee",
};
