/**
 * Utility functions for employee invites
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import type { SingleInviteForm, BulkInviteRow } from "../types/invites";

/**
 * Build invite link from token
 */
export function buildInviteLink(token: string): string {
  if (!token) return "";
  if (typeof window === "undefined") return `/auth?invite=${token}`;
  return `${window.location.origin}/auth?invite=${token}`;
}

/**
 * Trigger onboarding checklist for an invite
 */
export async function triggerOnboardingChecklist(
  inviteId: string,
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc(
      "trigger_onboarding_checklist" as unknown as string,
      { invite_id: inviteId },
    );
    if (error) {
      logger.warn("Failed to trigger onboarding checklist", {
        error: error.message,
        tags: ["warning"],
      });
      return false;
    }
    return true;
  } catch (error) {
    logger.warn("Failed to trigger onboarding checklist", {
      error,
      tags: ["warning"],
    });
    return false;
  }
}

/**
 * Parse CSV file for bulk invites
 */
export function parseCsvForBulkInvites(text: string): {
  rows: BulkInviteRow[];
  error?: string;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { rows: [], error: "CSV file was empty." };
  }

  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) {
    return {
      rows: [],
      error: "CSV must include a header row and at least one data row.",
    };
  }

  const header = lines[0]
    .split(",")
    .map((column) => column.trim().toLowerCase());
  const emailIndex = header.findIndex((column) => column === "email");
  const firstNameIndex = header.findIndex((column) =>
    ["first_name", "firstname", "first"].includes(column),
  );
  const lastNameIndex = header.findIndex((column) =>
    ["last_name", "lastname", "last"].includes(column),
  );
  const roleIndex = header.findIndex((column) => column === "role");

  if (emailIndex === -1 || firstNameIndex === -1 || lastNameIndex === -1) {
    return {
      rows: [],
      error: "Header must include email, first_name, and last_name columns.",
    };
  }

  const rows: BulkInviteRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw.trim()) continue;

    const columns = raw.split(",").map((value) => value.trim());
    const email = columns[emailIndex];
    const firstName = columns[firstNameIndex];
    const lastName = columns[lastNameIndex];
    const roleValue =
      roleIndex !== -1 ? columns[roleIndex].toLowerCase() : "employee";

    if (!email || !firstName || !lastName) {
      return {
        rows: [],
        error: `Row ${i + 1} is missing required values.`,
      };
    }

    const role =
      roleValue === "manager" || roleValue === "admin" ? roleValue : "employee";

    rows.push({
      email,
      firstName,
      lastName,
      role,
    });
  }

  if (rows.length > 200) {
    return {
      rows: [],
      error: "Please limit each upload to 200 rows or fewer.",
    };
  }

  return { rows };
}
