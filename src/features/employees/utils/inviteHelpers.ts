/**
 * Utility functions for employee invites
 */

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/utils/logger";
import type { BulkInviteRow } from "../types/invites";

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

function headerIndex(header: string[], aliases: string[]) {
  return header.findIndex((column) => aliases.includes(column));
}

/**
 * Parse CSV or pasted rows for bulk invites
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
      error: "Include a header row and at least one person.",
    };
  }

  const header = lines[0]
    .split(",")
    .map((column) => column.trim().toLowerCase());
  const emailIndex = headerIndex(header, ["email"]);
  const firstNameIndex = headerIndex(header, ["first_name", "first", "firstname"]);
  const lastNameIndex = headerIndex(header, ["last_name", "last", "lastname"]);
  const phoneIndex = headerIndex(header, ["phone", "mobile"]);
  const classIndex = headerIndex(header, ["class", "role"]);
  const locationIndex = headerIndex(header, ["location"]);
  const departmentIndex = headerIndex(header, ["department"]);

  if (firstNameIndex === -1 || lastNameIndex === -1) {
    return {
      rows: [],
      error: "Header must include first_name and last_name.",
    };
  }

  if (emailIndex === -1 && phoneIndex === -1) {
    return {
      rows: [],
      error: "Header must include email or phone.",
    };
  }

  const rows: BulkInviteRow[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const raw = lines[i];
    if (!raw.trim()) continue;

    const columns = raw.split(",").map((value) => value.trim());
    const email = emailIndex === -1 ? "" : columns[emailIndex] ?? "";
    const phone = phoneIndex === -1 ? "" : columns[phoneIndex] ?? "";
    const firstName = columns[firstNameIndex];
    const lastName = columns[lastNameIndex];

    if (!firstName || !lastName || (!email && !phone)) {
      return {
        rows: [],
        error: `Row ${i + 1} needs a name and an email or phone.`,
      };
    }

    rows.push({
      email,
      firstName,
      lastName,
      phone,
      className: classIndex === -1 ? "" : columns[classIndex] ?? "",
      locationName: locationIndex === -1 ? "" : columns[locationIndex] ?? "",
      departmentName:
        departmentIndex === -1 ? "" : columns[departmentIndex] ?? "",
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
