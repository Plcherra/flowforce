import type { CalendarErrorCode } from "@/features/calendar/types";

const DEFAULT_MESSAGES: Record<string, string> = {
  "42P01":
    "Calendar data is not provisioned. Please run the latest Supabase migrations.",
  "42501":
    "You do not have permission to modify this calendar. Contact an admin.",
  PGRST301: "Calendar service unavailable. Please retry in a moment.",
};

export function normalizeCalendarError(error: unknown): {
  message: string;
  code?: CalendarErrorCode;
} {
  if (!error) {
    return { message: "An unexpected error occurred." };
  }

  if (error instanceof Error) {
    const supabaseError = error as Error & { code?: CalendarErrorCode };
    const code = supabaseError.code;
    const message =
      DEFAULT_MESSAGES[code ?? ""] ??
      supabaseError.message ??
      "An unexpected error occurred.";
    return { message, code };
  }

  if (
    typeof error === "object" &&
    "message" in (error as Record<string, unknown>)
  ) {
    const message = String(
      (error as Record<string, unknown>).message ??
        "An unexpected error occurred.",
    );
    const code = (error as Record<string, unknown>).code as
      | CalendarErrorCode
      | undefined;
    return { message, code };
  }

  return {
    message:
      typeof error === "string" ? error : "An unexpected error occurred.",
  };
}
